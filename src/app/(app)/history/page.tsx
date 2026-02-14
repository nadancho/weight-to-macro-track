"use client";

import {
  getCookie,
  setLogsCacheCookie,
  clearLogsCacheCookie,
  LOGS_CACHE_COOKIE,
} from "@/app/lib/utils/cookies";
import { macrosToCalories } from "@/app/lib/utils/calories";
import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, LogIn, Pencil } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LogEntry = {
  id: string;
  date: string;
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

type EditableField = "weight" | "carbs_g" | "protein_g" | "fat_g";

type ActiveCell = { date: string; field: EditableField } | null;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Returns Monday (YYYY-MM-DD) of the week containing the given date. */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - mondayOffset);
  return d.toISOString().slice(0, 10);
}

/** Returns [Mon, Tue, ..., Sun] as YYYY-MM-DD for the week containing the given date. */
function getWeekDates(dateStr: string): string[] {
  const monday = getWeekMonday(dateStr);
  const dates: string[] = [];
  const d = new Date(monday + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function weekRange(dateStr: string): { from: string; to: string } {
  const dates = getWeekDates(dateStr);
  return { from: dates[0], to: dates[6] };
}

/** Default to current week (Monday–Sunday). */
function thisWeek(): { from: string; to: string } {
  return weekRange(new Date().toISOString().slice(0, 10));
}

function parseLogsCache(
  raw: string | null
): { from: string; to: string; logs: LogEntry[] } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      from?: string;
      to?: string;
      logs?: unknown[];
    };
    if (
      typeof parsed?.from !== "string" ||
      typeof parsed?.to !== "string" ||
      !Array.isArray(parsed.logs)
    )
      return null;
    return {
      from: parsed.from,
      to: parsed.to,
      logs: parsed.logs as LogEntry[],
    };
  } catch {
    return null;
  }
}

export default function HistoryPage() {
  const { authResolved, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(() => thisWeek());
  const [isEditMode, setEditMode] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);

  const saveCell = useCallback(
    async (
      log: LogEntry,
      field: EditableField,
      value: number | null
    ): Promise<void> => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: log.date,
          weight: field === "weight" ? value : log.weight,
          carbs_g: field === "carbs_g" ? value : log.carbs_g,
          protein_g: field === "protein_g" ? value : log.protein_g,
          fat_g: field === "fat_g" ? value : log.fat_g,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLogs((prev) => {
          const idx = prev.findIndex((row) => row.date === log.date);
          if (idx >= 0)
            return prev.map((row) =>
              row.date === log.date ? { ...row, ...updated } : row
            );
          return [...prev, updated];
        });
        clearLogsCacheCookie();
      }
      setActiveCell(null);
    },
    []
  );

  const weekDates = useMemo(
    () => getWeekDates(range.from),
    [range.from]
  );
  const fetchRange = useMemo(
    () => weekRange(range.from),
    [range.from]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const cached = parseLogsCache(getCookie(LOGS_CACHE_COOKIE));
    const cacheHit =
      cached &&
      cached.from === fetchRange.from &&
      cached.to === fetchRange.to;
    if (cacheHit) {
      setLogs(cached.logs);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(
      `/api/logs?from=${fetchRange.from}&to=${fetchRange.to}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LogEntry[]) => {
        setLogs(data);
        setLogsCacheCookie({
          from: fetchRange.from,
          to: fetchRange.to,
          logs: data,
        });
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, fetchRange.from, fetchRange.to]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, LogEntry>();
    for (const log of logs) map.set(log.date, log);
    return map;
  }, [logs]);

  function getLogForDate(date: string): LogEntry {
    return (
      logsByDate.get(date) ?? {
        id: "",
        date,
        weight: null,
        carbs_g: null,
        protein_g: null,
        fat_g: null,
      }
    );
  }

  if (!authResolved) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">You need to sign in to view history.</p>
        <Button asChild>
          <Link href="/">
            <LogIn className="size-4 shrink-0" aria-hidden />
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>History</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">Week of</label>
          <input
            type="date"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={range.from}
            onChange={(e) => setRange(weekRange(e.target.value))}
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setEditMode((e) => !e);
                setActiveCell(null);
              }}
              aria-label={isEditMode ? "Done editing" : "Edit"}
              title={isEditMode ? "Done editing" : "Edit"}
            >
              {isEditMode ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Pencil className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-normal" aria-hidden />
                  {weekDates.map((date, i) => (
                    <th
                      key={date}
                      className="min-w-[2.5rem] pb-2 pr-2 text-center font-normal last:pr-0"
                    >
                      <span className="block">{WEEKDAY_LABELS[i]}</span>
                      <span className="block text-xs opacity-80">
                        {date.slice(8)}/{date.slice(5, 7)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    {
                      label: "Weight",
                      field: "weight" as const,
                      step: "0.1",
                    },
                    { label: "Protein", field: "protein_g" as const, step: "1" },
                    { label: "Carbs", field: "carbs_g" as const, step: "1" },
                    { label: "Fat", field: "fat_g" as const, step: "1" },
                    { label: "Calories", field: null, step: "" },
                  ] as const
                ).map(({ label, field, step }) => (
                  <tr key={label} className="border-b border-border">
                    <td className="py-2 pr-3 text-muted-foreground">{label}</td>
                    {weekDates.map((date) => {
                      const log = getLogForDate(date);
                      const isCalories = field === null;
                      const value = isCalories
                        ? macrosToCalories(log.carbs_g, log.protein_g, log.fat_g)
                        : log[field as EditableField];
                      const isActive =
                        !isCalories &&
                        activeCell?.date === date &&
                        activeCell?.field === field;

                      if (isCalories) {
                        return (
                          <td
                            key={date}
                            className="py-2 pr-2 text-center last:pr-0"
                          >
                            {value === 0 &&
                            log.carbs_g == null &&
                            log.protein_g == null &&
                            log.fat_g == null
                              ? "—"
                              : value}
                          </td>
                        );
                      }

                      if (isEditMode && isActive) {
                        return (
                          <td
                            key={date}
                            className="py-1 pr-2 align-middle text-center last:pr-0"
                          >
                            <Input
                              type="number"
                              step={step}
                              className="mx-auto h-8 w-full min-w-0 max-w-[5rem] text-sm"
                              defaultValue={
                                (log[field as EditableField] ?? "") as
                                  | number
                                  | ""
                              }
                              aria-label={`${label} for ${date}`}
                              autoFocus
                              onBlur={(e) => {
                                const raw = e.target.value;
                                const num =
                                  raw === ""
                                    ? null
                                    : field === "weight"
                                      ? parseFloat(raw)
                                      : parseInt(raw, 10);
                                if (num !== null && Number.isNaN(num)) return;
                                saveCell(log, field, num);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                          </td>
                        );
                      }

                      const display =
                        field === "weight"
                          ? (value as number | null) ?? "—"
                          : (value as number | null) ?? "—";
                      const cellClass =
                        "py-2 pr-2 text-center align-middle last:pr-0 " +
                        (isEditMode
                          ? "cursor-pointer rounded-md bg-muted/80 min-h-[44px] sm:min-h-0 sm:bg-transparent sm:hover:bg-muted"
                          : "");

                      return (
                        <td
                          key={date}
                          className={cellClass}
                          onClick={() => {
                            if (isEditMode)
                              setActiveCell({ date, field: field as EditableField });
                          }}
                          onKeyDown={(e) => {
                            if (
                              isEditMode &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              setActiveCell({
                                date,
                                field: field as EditableField,
                              });
                            }
                          }}
                          role={isEditMode ? "button" : undefined}
                          tabIndex={isEditMode ? 0 : undefined}
                          aria-label={
                            isEditMode
                              ? `${label} for ${date}, click to edit`
                              : undefined
                          }
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
