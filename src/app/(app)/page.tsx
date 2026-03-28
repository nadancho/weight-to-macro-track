"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { macrosToCalories } from "@/app/lib/utils/calories";
import {
  getCookie,
  setCookie,
  clearLogsCacheCookie,
} from "@/app/lib/utils/cookies";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { Beef, Camera, Croissant, Droplet, Flame, LogIn, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
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
  const [date, setDate] = useState(() => parseDateCookie(getCookie(LAST_LOG_DATE_KEY)) ?? todayISO());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(parseDateCookie(getCookie(LAST_LOG_DATE_KEY)) ?? todayISO() + "T12:00:00"));
  const [weight, setWeight] = useState<number | null>(null);
  const [carbs_g, setCarbsG] = useState("");
  const [protein_g, setProteinG] = useState("");
  const [fat_g, setFatG] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [prevWeight, setPrevWeight] = useState<{ weight: number; date: string } | null | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [showRaccoon, setShowRaccoon] = useState(0);

  // Find the most recent weight entry before the selected date (up to 14 days back)
  useEffect(() => {
    let cancelled = false;
    setPrevWeight("loading");
    const to = prevDayISO(date);
    const from = subDays(new Date(date + "T12:00:00"), 14).toISOString().slice(0, 10);
    fetch(`/api/logs?from=${from}&to=${to}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs: { date: string; weight?: number | null }[]) => {
        if (cancelled) return;
        // Find the most recent log that has a weight, sorted newest first
        const withWeight = logs
          .filter((l) => l.weight != null)
          .sort((a, b) => b.date.localeCompare(a.date));
        const match = withWeight[0];
        setPrevWeight(match ? { weight: match.weight!, date: match.date } : null);
      })
      .catch(() => {
        if (!cancelled) setPrevWeight(null);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Fetch which dates in the visible month have logs (for calendar dot indicators)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    fetch(`/api/logs?from=${from}&to=${to}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs: { date: string }[]) => {
        if (!cancelled) {
          setLoggedDates(new Set(logs.map((l) => l.date)));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, calendarMonth]);

  // Load existing log for selected date from Supabase via GET; prefill form for upsert
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch(`/api/logs?from=${date}&to=${date}`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs: { weight?: number | null; carbs_g?: number | null; protein_g?: number | null; fat_g?: number | null }[]) => {
        if (cancelled) return;
        const log = logs[0];
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
      })
      .catch(() => {
        if (!cancelled) {
          setWeight(null);
          setCarbsG("");
          setProteinG("");
          setFatG("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, date]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        date,
        weight,
        carbs_g: carbs_g ? Number(carbs_g) : null,
        protein_g: protein_g ? Number(protein_g) : null,
        fat_g: fat_g ? Number(fat_g) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setCookie(LAST_LOG_DATE_KEY, date);
      clearLogsCacheCookie();
      setMessage({ type: "ok", text: "Saved." });
      setLoggedDates((prev) => new Set(prev).add(date));
      setShowRaccoon((k) => k + 1);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.error ?? "Failed to save" });
    }
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
            <div className="space-y-2">
              <Calendar
                mode="single"
                required
                selected={date ? new Date(date + "T12:00:00") : undefined}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                onSelect={(selected) => {
                  if (!selected) return;
                  changeDate(selected.toISOString().slice(0, 10));
                  // Navigate calendar month if user tapped an outside-month day
                  if (
                    selected.getMonth() !== calendarMonth.getMonth() ||
                    selected.getFullYear() !== calendarMonth.getFullYear()
                  ) {
                    setCalendarMonth(selected);
                  }
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
                className="w-full"
              />
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium tracking-tight">
                  {date ? format(new Date(date + "T12:00:00"), "EEEE, MMM d") : "Pick a date"}
                </p>
                {date !== todayISO() && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      changeDate(todayISO());
                      setCalendarMonth(new Date());
                    }}
                  >
                    Jump to today
                  </button>
                )}
              </div>
            </div>
            <WeightStepper
              value={weight}
              onChange={setWeight}
              previousDayWeight={prevWeight === "loading" || prevWeight === null ? null : prevWeight.weight}
              previousLabel={
                prevWeight !== "loading" && prevWeight !== null
                  ? prevWeight.date === prevDayISO(date)
                    ? "Yesterday"
                    : format(new Date(prevWeight.date + "T12:00:00"), "MMM d")
                  : undefined
              }
              loading={prevWeight === "loading"}
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
                  "min-h-[44px] py-3 text-sm transition-colors",
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
          <Button type="submit" disabled={saving} className="w-full min-h-[44px]">
            <Save className="size-4 shrink-0" aria-hidden />
            {saving ? "Saving…" : "Save log"}
          </Button>
        </form>
      </CardContent>
    </Card>
    {showRaccoon > 0 && <Raccoon key={showRaccoon} />}
    </div>
  );
}
