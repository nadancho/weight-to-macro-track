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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, subDays } from "date-fns";
import { ArrowBigLeftDash, Beef, CalendarIcon, Croissant, Droplet, Flame, LogIn, Save, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
import { cn } from "@/lib/utils";

const LAST_LOG_DATE_KEY = "last_log_date";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [carbs_g, setCarbsG] = useState("");
  const [protein_g, setProteinG] = useState("");
  const [fat_g, setFatG] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [prevDayWeight, setPrevDayWeight] = useState<number | null | "loading">("loading");
  const [chipExpanded, setChipExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPrevDayWeight("loading");
    setChipExpanded(false);
    const prev = prevDayISO(date);
    fetch(`/api/logs?from=${prev}&to=${prev}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs: { weight?: number | null }[]) => {
        if (cancelled) return;
        const log = logs[0];
        setPrevDayWeight(log?.weight != null ? log.weight : null);
      })
      .catch(() => {
        if (!cancelled) setPrevDayWeight(null);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

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
          setWeight(log.weight != null ? String(log.weight) : "");
          setCarbsG(log.carbs_g != null ? String(log.carbs_g) : "");
          setProteinG(log.protein_g != null ? String(log.protein_g) : "");
          setFatG(log.fat_g != null ? String(log.fat_g) : "");
        } else {
          setWeight("");
          setCarbsG("");
          setProteinG("");
          setFatG("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeight("");
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
        weight: weight ? Number(weight) : null,
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

  const hasPrevDay = prevDayWeight !== null && prevDayWeight !== "loading";

  return (
    <div className="flex flex-col items-center w-full">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Log day</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter weight and macros for a day. One log per day; submitting again updates that day.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-base">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full min-h-[44px] justify-start text-left font-normal text-base",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4 shrink-0" aria-hidden />
                    {date ? format(new Date(date + "T12:00:00"), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 border-border"
                  align="center"
                  side="bottom"
                  sideOffset={8}
                >
                  <div className="p-2">
                    <Calendar
                      mode="single"
                      selected={date ? new Date(date + "T12:00:00") : undefined}
                      onSelect={(selected) => {
                        if (!selected) return;
                        const next = selected.toISOString().slice(0, 10);
                        setDate(next);
                        setCookie(LAST_LOG_DATE_KEY, next);
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight" className="inline-flex items-center gap-1.5">
                <Scale className="size-4 shrink-0 text-foreground" aria-hidden />
                Weight (lbs)
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => hasPrevDay && setChipExpanded((p) => !p)}
                  title={
                    hasPrevDay
                      ? `Previous day: ${prevDayWeight} lbs`
                      : "No previous day"
                  }
                  aria-label={hasPrevDay ? `Previous day: ${prevDayWeight} lbs` : "No previous day"}
                  aria-expanded={hasPrevDay ? chipExpanded : undefined}
                  className={cn(
                    "group flex h-10 min-w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border transition-all duration-200 ease-out",
                    hasPrevDay && "hover:min-w-[7rem] hover:justify-start hover:pl-2.5 hover:pr-3",
                    hasPrevDay && chipExpanded && "min-w-[7rem] justify-start pl-2.5 pr-3",
                    hasPrevDay
                      ? "cursor-default bg-secondary text-foreground hover:bg-accent"
                      : "cursor-default bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowBigLeftDash
                    className={cn("size-5 shrink-0", "group-hover:mr-2", chipExpanded && "mr-2")}
                    aria-hidden
                  />
                  {hasPrevDay && (
                    <span
                      className={cn(
                        "overflow-hidden whitespace-nowrap text-sm tabular-nums transition-all duration-200",
                        "max-w-0 opacity-0 group-hover:max-w-[5rem] group-hover:opacity-100",
                        chipExpanded && "max-w-[5rem] opacity-100"
                      )}
                    >
                      {prevDayWeight} lbs
                    </span>
                  )}
                </button>
                <div className="relative flex-1">
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 154"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={cn("min-h-[44px] text-base", weight && "pr-10")}
                  />
                  {weight ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      lbs
                    </span>
                  ) : null}
                </div>
              </div>
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
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Flame className="size-4 shrink-0 text-foreground" aria-hidden />
            Calories:{" "}
            {macrosToCalories(
              carbs_g ? Number(carbs_g) : null,
              protein_g ? Number(protein_g) : null,
              fat_g ? Number(fat_g) : null
            )}
          </p>
          {message && (
            <p className={message.type === "ok" ? "text-sm text-green-600 dark:text-green-400" : "text-sm text-destructive"}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving} className="min-h-[44px]">
            <Save className="size-4 shrink-0" aria-hidden />
            {saving ? "Saving…" : "Save log"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
