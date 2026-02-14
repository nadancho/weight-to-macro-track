"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { getCookie, setCookie } from "@/app/lib/utils/cookies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LAST_LOG_DATE_KEY = "last_log_date";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateCookie(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export default function LogPage() {
  const router = useRouter();
  const { authResolved, isAuthenticated } = useAuth();
  const [date, setDate] = useState(() => parseDateCookie(getCookie(LAST_LOG_DATE_KEY)) ?? todayISO());
  const [weight, setWeight] = useState("");
  const [carbs_g, setCarbsG] = useState("");
  const [protein_g, setProteinG] = useState("");
  const [fat_g, setFatG] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

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
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">You need to sign in to log.</p>
        <Button asChild>
          <Link href="/">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
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
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                const next = e.target.value;
                setDate(next);
                setCookie(LAST_LOG_DATE_KEY, next);
              }}
              required
              className="min-h-[44px] text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="e.g. 70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="min-h-[44px] text-base"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="1"
                value={carbs_g}
                onChange={(e) => setCarbsG(e.target.value)}
                className="min-h-[44px] text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="1"
                value={protein_g}
                onChange={(e) => setProteinG(e.target.value)}
                className="min-h-[44px] text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                step="1"
                value={fat_g}
                onChange={(e) => setFatG(e.target.value)}
                className="min-h-[44px] text-base"
              />
            </div>
          </div>
          {message && (
            <p className={message.type === "ok" ? "text-sm text-green-600 dark:text-green-400" : "text-sm text-destructive"}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving} className="min-h-[44px]">
            {saving ? "Saving…" : "Save log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
