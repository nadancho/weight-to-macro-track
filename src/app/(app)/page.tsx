"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { macrosToCalories } from "@/app/lib/utils/calories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, format, subDays } from "date-fns";
import { Beef, Camera, Croissant, Droplet, Flame, LogIn, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
import { useLogCache } from "@/components/log-cache-provider";
import { WeightStepper } from "@/components/weight-stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import { useUserPrefs } from "@/components/user-prefs-provider";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prevDayISO(dateISO: string): string {
  return subDays(new Date(dateISO + "T12:00:00"), 1).toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const { authResolved, isAuthenticated, setAuth } = useAuth();
  const { getLog, getLogsByRange, saveLog } = useLogCache();
  const { weekStartsOn } = useUserPrefs();
  const [date, setDate] = useState(todayISO);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
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

  // Logged dates — "same-day" if created_at matches the log date, "backfilled" otherwise
  const loggedDates = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const from = subDays(new Date(year, month, 1), 7).toISOString().slice(0, 10);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = addDays(new Date(year, month, lastDay), 7).toISOString().slice(0, 10);
    const map = new Map<string, "same-day" | "backfilled">();
    for (const l of getLogsByRange(from, to)) {
      if (l.created_at) {
        // Compare the date portion of created_at (in user's local timezone) to the log date
        const createdLocal = new Date(l.created_at).toLocaleDateString("en-CA"); // YYYY-MM-DD
        map.set(l.date, createdLocal === l.date ? "same-day" : "backfilled");
      } else {
        map.set(l.date, "same-day");
      }
    }
    return map;
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
    setMessage({ type: "ok", text: "Saved." });
    window.dispatchEvent(new CustomEvent("woodland:save"));

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
                <p className="text-sm text-destructive" role="alert">{signInError}</p>
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
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily Log</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-base">
            <DatePicker
              selectedDate={date}
              onSelect={(d) => {
                changeDate(d);
                setCalendarMonth(new Date(d + "T12:00:00"));
              }}
              weekStartsOn={weekStartsOn}
              loggedDates={loggedDates}
              expanded={calendarOpen}
              onExpandedChange={setCalendarOpen}
              displayMonth={calendarMonth}
              onDisplayMonthChange={setCalendarMonth}
            />
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
                  "min-h-[44px] py-3 text-xs transition-[colors,transform] duration-75 active:scale-[0.97]",
                  "hover:bg-accent",
                  extracting && "pointer-events-none opacity-50"
                )}
              >
                <Camera className="size-5 shrink-0" aria-hidden />
                {extracting ? "Extracting…" : "Snap macros from photo"}
              </button>
              {extractError && (
                <p className="text-sm text-destructive" role="alert">{extractError}</p>
              )}
            </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label
                htmlFor="carbs"
                className="inline-flex items-center gap-1.5 text-xs text-macro-carbs"
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
                className="inline-flex items-center gap-1.5 text-xs text-macro-protein"
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
                className="inline-flex items-center gap-1.5 text-xs text-macro-fat"
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
            <span className="text-lg font-semibold tabular-nums">
              {macrosToCalories(
                carbs_g ? Number(carbs_g) : null,
                protein_g ? Number(protein_g) : null,
                fat_g ? Number(fat_g) : null
              )}
            </span>
          </div>
          <Button type="submit" className="w-full min-h-[44px]">
            <Save className="size-4 shrink-0" aria-hidden />
            Save log
          </Button>
        </form>
      </CardContent>
    </Card>
    <Toast
      message={message?.text ?? null}
      type={message?.type}
      onDismiss={() => setMessage(null)}
    />
    </div>
  );
}
