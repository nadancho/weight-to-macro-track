"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { macrosToCalories } from "@/app/lib/utils/calories";
import {
  getCookie,
  setCookie,
} from "@/app/lib/utils/cookies";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Beef, Camera, ChevronDown, Croissant, Droplet, Flame, LogIn, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
import { useLogCache } from "@/components/log-cache-provider";
import { WeightStepper } from "@/components/weight-stepper";
import { cn } from "@/lib/utils";
import { Raccoon } from "@/components/raccoon";

const LAST_LOG_DATE_KEY = "last_log_date";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateCookie(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function prevDayISO(dateISO: string): string {
  return subDays(new Date(dateISO + "T12:00:00"), 1).toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const { authResolved, isAuthenticated, setAuth } = useAuth();
  const { getLog, getLogsByRange, saveLog } = useLogCache();
  const [date, setDate] = useState(() => parseDateCookie(getCookie(LAST_LOG_DATE_KEY)) ?? todayISO());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(parseDateCookie(getCookie(LAST_LOG_DATE_KEY)) ?? todayISO() + "T12:00:00"));
  const [weight, setWeight] = useState<number | null>(null);
  const [carbs_g, setCarbsG] = useState("");
  const [protein_g, setProteinG] = useState("");
  const [fat_g, setFatG] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRaccoon, setShowRaccoon] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Previous weight — read from cache (up to 14 days back)
  const prevWeight = useMemo(() => {
    const to = prevDayISO(date);
    const from = subDays(new Date(date + "T12:00:00"), 14).toISOString().slice(0, 10);
    const recent = getLogsByRange(from, to)
      .filter((l) => l.weight != null)
      .sort((a, b) => b.date.localeCompare(a.date));
    return recent[0] ? { weight: recent[0].weight!, date: recent[0].date } : null;
  }, [date, getLogsByRange]);

  // Calendar logged dates — derived from cache
  const loggedDates = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return new Set(getLogsByRange(from, to).map((l) => l.date));
  }, [calendarMonth, getLogsByRange]);

  // Prefill form from cache when date changes
  useEffect(() => {
    const log = getLog(date);
    if (log) {
      setWeight(log.weight ?? null);
      setCarbsG(log.carbs_g != null ? String(log.carbs_g) : "");
      setProteinG(log.protein_g != null ? String(log.protein_g) : "");
      setFatG(log.fat_g != null ? String(log.fat_g) : "");
    } else {
      setWeight(null);
      setCarbsG("");
      setProteinG("");
      setFatG("");
    }
  }, [date, getLog]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    setSignInLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSignInError(data.error ?? "Sign in failed");
      return;
    }
    setAuth(true);
    router.refresh();
  };

  const changeDate = (next: string) => {
    setDate(next);
    setCookie(LAST_LOG_DATE_KEY, next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";

    setExtractError("");
    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix to get raw base64
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/macros/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: base64, media_type: file.type }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Extraction failed");
      }

      const macros = await res.json();
      setCarbsG(String(macros.carbs_g));
      setProteinG(String(macros.protein_g));
      setFatG(String(macros.fat_g));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setCookie(LAST_LOG_DATE_KEY, date);
    setMessage({ type: "ok", text: "Saved." });
    setShowRaccoon((k) => k + 1);

    // Fire and forget — cache updates optimistically, API persists in background
    saveLog({
      date,
      weight,
      carbs_g: carbs_g ? Number(carbs_g) : null,
      protein_g: protein_g ? Number(protein_g) : null,
      fat_g: fat_g ? Number(fat_g) : null,
    }).then((result) => {
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "Failed to save" });
      }
    });
  };

  if (!authResolved) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    const signInPinLength = 6;
    const pinComplete = password.length === signInPinLength;
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-8">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <LogIn className="size-8 shrink-0" aria-hidden />
              Sign in
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Use your email and PIN to sign in.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>PIN ({signInPinLength} digits)</Label>
                <PinInput
                  value={password}
                  onChange={setPassword}
                  disabled={signInLoading}
                  length={signInPinLength}
                  aria-label={`PIN, ${signInPinLength} digits`}
                />
              </div>
              {signInError && (
                <p className="text-sm text-destructive">{signInError}</p>
              )}
              {pinComplete && (
                <Button type="submit" className="w-full" disabled={signInLoading}>
                  <LogIn className="size-4 shrink-0" aria-hidden />
                  {signInLoading ? "Signing in…" : "Sign in"}
                </Button>
              )}
              <p className="text-center text-sm text-muted-foreground">
                No account?{" "}
                <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Card className="max-w-md w-full shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Log day</CardTitle>
          <p className="text-xs text-muted-foreground">
            One log per day. Submitting again updates that day.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 text-base">
            <div className="space-y-0">
              <AnimatePresence initial={false}>
                {calendarOpen && (
                  <motion.div
                    key="calendar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Calendar
                      mode="single"
                      required
                      selected={date ? new Date(date + "T12:00:00") : undefined}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={(selected) => {
                        if (!selected) return;
                        changeDate(selected.toISOString().slice(0, 10));
                        if (
                          selected.getMonth() !== calendarMonth.getMonth() ||
                          selected.getFullYear() !== calendarMonth.getFullYear()
                        ) {
                          setCalendarMonth(selected);
                        }
                        // Auto-collapse after selection
                        setTimeout(() => setCalendarOpen(false), 200);
                      }}
                      modifiers={{
                        logged: (d: Date) => {
                          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          return loggedDates.has(iso);
                        },
                      }}
                      modifiersClassNames={{
                        logged: "day-logged",
                      }}
                      className="w-full pb-2"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setCalendarOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 active:scale-[0.98] transition-transform"
              >
                <p className="text-sm font-medium tracking-tight">
                  {date ? format(new Date(date + "T12:00:00"), "EEEE, MMM d") : "Pick a date"}
                </p>
                <div className="flex items-center gap-2">
                  {date !== todayISO() && (
                    <span
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeDate(todayISO());
                        setCalendarMonth(new Date());
                      }}
                    >
                      Today
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200",
                      calendarOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>
            </div>
            <WeightStepper
              value={weight}
              onChange={setWeight}
              previousDayWeight={prevWeight?.weight ?? null}
              previousLabel={
                prevWeight
                  ? prevWeight.date === prevDayISO(date)
                    ? "Yesterday"
                    : format(new Date(prevWeight.date + "T12:00:00"), "MMM d")
                  : undefined
              }
            />
          <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                disabled={extracting}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-secondary text-foreground font-medium",
                  "min-h-[44px] py-3 text-sm transition-[colors,transform] duration-75 active:scale-[0.97]",
                  "hover:bg-accent",
                  extracting && "pointer-events-none opacity-50"
                )}
              >
                <Camera className="size-5 shrink-0" aria-hidden />
                {extracting ? "Extracting…" : "Snap macros from photo"}
              </button>
              {extractError && (
                <p className="text-sm text-destructive">{extractError}</p>
              )}
            </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label
                htmlFor="carbs"
                className="inline-flex items-center gap-1.5 text-macro-carbs"
              >
                <Croissant className="size-4 shrink-0 text-macro-carbs" aria-hidden />
                Carbs (g)
              </Label>
              <div className="relative">
                <Input
                  id="carbs"
                  type="number"
                  step="1"
                  value={carbs_g}
                  onChange={(e) => setCarbsG(e.target.value)}
                  className={cn("min-h-[44px] text-base", carbs_g && "pr-8")}
                />
                {carbs_g ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    g
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="protein"
                className="inline-flex items-center gap-1.5 text-macro-protein"
              >
                <Beef className="size-4 shrink-0 text-macro-protein" aria-hidden />
                Protein (g)
              </Label>
              <div className="relative">
                <Input
                  id="protein"
                  type="number"
                  step="1"
                  value={protein_g}
                  onChange={(e) => setProteinG(e.target.value)}
                  className={cn("min-h-[44px] text-base", protein_g && "pr-8")}
                />
                {protein_g ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    g
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="fat"
                className="inline-flex items-center gap-1.5 text-macro-fat"
              >
                <Droplet className="size-4 shrink-0 text-macro-fat" aria-hidden />
                Fat (g)
              </Label>
              <div className="relative">
                <Input
                  id="fat"
                  type="number"
                  step="1"
                  value={fat_g}
                  onChange={(e) => setFatG(e.target.value)}
                  className={cn("min-h-[44px] text-base", fat_g && "pr-8")}
                />
                {fat_g ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    g
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Flame className="size-4 shrink-0" aria-hidden />
              Calories
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {macrosToCalories(
                carbs_g ? Number(carbs_g) : null,
                protein_g ? Number(protein_g) : null,
                fat_g ? Number(fat_g) : null
              )}
            </span>
          </div>
          {message && (
            <p className={cn(
              "text-sm text-center",
              message.type === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"
            )}>
              {message.text}
            </p>
          )}
          <Button type="submit" className="w-full min-h-[44px]">
            <Save className="size-4 shrink-0" aria-hidden />
            Save log
          </Button>
        </form>
      </CardContent>
    </Card>
    {showRaccoon > 0 && <Raccoon key={showRaccoon} />}
    </div>
  );
}
