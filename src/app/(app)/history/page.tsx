"use client";

import {
  getCookie,
  setCookie,
  setLogsCacheCookie,
  clearLogsCacheCookie,
  LOGS_CACHE_COOKIE,
  HISTORY_AGGREGATE_COOKIE,
} from "@/app/lib/utils/cookies";
import { macrosToCalories } from "@/app/lib/utils/calories";
import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Beef, Check, ChevronDown, CircleCheckBig, CircleDashed, Croissant, Droplet, Flame, History, LogIn, Pencil, RefreshCcw, Scale, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type LogEntry = {
  id: string;
  date: string;
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

type EditableField = "weight" | "carbs_g" | "protein_g" | "fat_g";

type EditFormRow = {
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

type EditFormState = Record<string, EditFormRow>;

type ActiveCell = { date: string; field: EditableField } | null;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HISTORY_CHART_CONFIG = {
  weight: { label: "Weight", color: "hsl(var(--chart-1))" },
  calories: { label: "Calories", color: "hsl(var(--chart-2))" },
  weightDelta: { label: "Weight Δ", color: "hsl(var(--chart-3))" },
  protein: { label: "Protein", color: "var(--macro-protein)" },
  carbs: { label: "Carbs", color: "var(--macro-carbs)" },
  fat: { label: "Fat", color: "var(--macro-fat)" },
  weightNorm: { label: "Weight", color: "hsl(var(--chart-1))" },
  caloriesNorm: { label: "Calories", color: "hsl(var(--chart-2))" },
  weightDeltaNorm: { label: "Weight Δ", color: "hsl(var(--chart-3))" },
  proteinNorm: { label: "Protein", color: "var(--macro-protein)" },
  carbsNorm: { label: "Carbs", color: "var(--macro-carbs)" },
  fatNorm: { label: "Fat", color: "var(--macro-fat)" },
} satisfies ChartConfig;

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

/** Returns YYYY-MM-DD for the day before the given date. */
function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Default to current week (Monday–Sunday). */
function thisWeek(): { from: string; to: string } {
  return weekRange(new Date().toISOString().slice(0, 10));
}

/** Format date as 3-letter month and day, e.g. "Feb-09". */
function formatMonDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate().toString().padStart(2, "0");
  return `${mon}-${day}`;
}

/** Format "Mon DD – Sun DD, YYYY" for a week's Monday. */
function formatWeekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + "T12:00:00");
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const monDay = mon.getDate();
  const sunDay = sun.getDate();
  const year = sun.getFullYear();
  const month = sun.toLocaleString("default", { month: "short" });
  return `${monDay} – ${sunDay} ${month} ${year}`;
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

function WeekCalendarPicker({
  range,
  setRange,
}: {
  range: { from: string; to: string };
  setRange: (r: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(
    () => new Date(range.from + "T12:00:00"),
    [range.from]
  );

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        const dateStr = date.toISOString().slice(0, 10);
        setRange(weekRange(dateStr));
        setOpen(false);
      }
    },
    [setRange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[11rem] justify-between gap-2 font-normal"
          aria-label="Select week"
        >
          <span className="truncate">{formatWeekLabel(range.from)}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Read logs and loading from cache for initial client paint (avoids flash of loading). */
function getInitialLogsFromCache(): { logs: LogEntry[]; loading: boolean } {
  if (typeof document === "undefined") return { logs: [], loading: true };
  const r = thisWeek();
  const extendedFrom = dayBefore(r.from);
  const cached = parseLogsCache(getCookie(LOGS_CACHE_COOKIE));
  const hit = cached && cached.from === extendedFrom && cached.to === r.to;
  return {
    logs: hit ? (cached.logs as LogEntry[]) : [],
    loading: !hit,
  };
}

export default function HistoryPage() {
  const { authResolved, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    getInitialLogsFromCache().logs
  );
  const [loading, setLoading] = useState(() =>
    getInitialLogsFromCache().loading
  );
  const [range, setRange] = useState(() => thisWeek());
  const [isEditMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  /** When a cell is focused, this is the in-progress input value (starts empty so user can type fresh). */
  const [activeCellInputValue, setActiveCellInputValue] = useState("");
  const [aggregateMode, setAggregateMode] = useState<"total" | "average">(() => {
    if (typeof document === "undefined") return "average";
    const stored = getCookie(HISTORY_AGGREGATE_COOKIE);
    return stored === "total" || stored === "average" ? stored : "average";
  });
  const [showWeight, setShowWeight] = useState(true);
  const [showCalories, setShowCalories] = useState(false);
  const [showWeightDelta, setShowWeightDelta] = useState(false);
  const [showProtein, setShowProtein] = useState(false);
  const [showCarbs, setShowCarbs] = useState(false);
  const [showFat, setShowFat] = useState(false);
  type YAxisSeries = "weight" | "calories" | "weightDelta" | "protein" | "carbs" | "fat";
  const [yAxisSeries, setYAxisSeries] = useState<YAxisSeries>("weight");

  const activeSeriesOrder: YAxisSeries[] = useMemo(
    () => [
      ...(showWeight ? (["weight"] as const) : []),
      ...(showCalories ? (["calories"] as const) : []),
      ...(showWeightDelta ? (["weightDelta"] as const) : []),
      ...(showProtein ? (["protein"] as const) : []),
      ...(showCarbs ? (["carbs"] as const) : []),
      ...(showFat ? (["fat"] as const) : []),
    ],
    [showWeight, showCalories, showWeightDelta, showProtein, showCarbs, showFat]
  );
  const firstActiveSeries = activeSeriesOrder[0] ?? "weight";

  useEffect(() => {
    if (firstActiveSeries != null && !activeSeriesOrder.includes(yAxisSeries)) {
      setYAxisSeries(firstActiveSeries);
    }
  }, [activeSeriesOrder, yAxisSeries, firstActiveSeries]);

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
    const extendedFrom = dayBefore(fetchRange.from);
    const cached = parseLogsCache(getCookie(LOGS_CACHE_COOKIE));
    const cacheHit =
      cached &&
      cached.from === extendedFrom &&
      cached.to === fetchRange.to;
    if (cacheHit) {
      setLogs(cached.logs);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(
      `/api/logs?from=${extendedFrom}&to=${fetchRange.to}`,
      { credentials: "include", cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LogEntry[]) => {
        setLogs(data);
        setLogsCacheCookie({
          from: extendedFrom,
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

  const chartData = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    type RawRow = {
      weight: number | undefined;
      calories: number | undefined;
      weightDelta: number | undefined;
      protein: number | undefined;
      carbs: number | undefined;
      fat: number | undefined;
    };
    const mid = (a: number | undefined, b: number | undefined): number | undefined =>
      a != null && b != null ? (a + b) / 2 : undefined;

    const dateToRow = new Map<string, RawRow>();
    const weekDatesForDelta = getWeekDates(range.from);
    const isMonday = (d: string) => weekDatesForDelta.indexOf(d) === 0;
    for (let i = 0; i < sorted.length; i++) {
      const log = sorted[i];
      const prevWeight = i > 0 ? sorted[i - 1].weight : null;
      const weight = log.weight ?? undefined;
      const calories =
        log.carbs_g != null || log.protein_g != null || log.fat_g != null
          ? macrosToCalories(log.carbs_g, log.protein_g, log.fat_g)
          : undefined;
      const weightDelta =
        weight != null
          ? prevWeight != null
            ? weight - prevWeight
            : isMonday(log.date)
              ? 0
              : undefined
          : undefined;
      dateToRow.set(log.date, {
        weight,
        calories: calories ?? undefined,
        weightDelta,
        protein: log.protein_g ?? undefined,
        carbs: log.carbs_g ?? undefined,
        fat: log.fat_g ?? undefined,
      });
    }

    const weekDates = getWeekDates(range.from);
    const rows: ({ date: string } & RawRow)[] = weekDates.map((date) => {
      const existing = dateToRow.get(date);
      if (existing) return { date, ...existing };

      const idx = weekDates.indexOf(date);
      const prevLogged = weekDates
        .slice(0, idx)
        .filter((d) => dateToRow.has(d))
        .pop();
      const nextLogged = weekDates
        .slice(idx + 1)
        .filter((d) => dateToRow.has(d))[0];
      if (prevLogged == null || nextLogged == null) {
        return {
          date,
          weight: undefined,
          calories: undefined,
          weightDelta: undefined,
          protein: undefined,
          carbs: undefined,
          fat: undefined,
        };
      }
      const prevRow = dateToRow.get(prevLogged)!;
      const nextRow = dateToRow.get(nextLogged)!;
      const prevIdx = weekDates.indexOf(prevLogged);
      const nextIdx = weekDates.indexOf(nextLogged);
      const daySpan = nextIdx - prevIdx;
      const interpolatedWeightDelta =
        prevRow.weight != null && nextRow.weight != null && daySpan > 0
          ? (nextRow.weight - prevRow.weight) / daySpan
          : undefined;
      return {
        date,
        weight: mid(prevRow.weight, nextRow.weight),
        calories: mid(prevRow.calories, nextRow.calories),
        weightDelta: interpolatedWeightDelta,
        protein: mid(prevRow.protein, nextRow.protein),
        carbs: mid(prevRow.carbs, nextRow.carbs),
        fat: mid(prevRow.fat, nextRow.fat),
      };
    });
    const weightVals = rows.map((r) => r.weight).filter((v): v is number => typeof v === "number");
    const caloriesVals = rows.map((r) => r.calories).filter((v): v is number => typeof v === "number");
    const deltaVals = rows.map((r) => r.weightDelta).filter((v): v is number => typeof v === "number");
    const proteinVals = rows.map((r) => r.protein).filter((v): v is number => typeof v === "number");
    const carbsVals = rows.map((r) => r.carbs).filter((v): v is number => typeof v === "number");
    const fatVals = rows.map((r) => r.fat).filter((v): v is number => typeof v === "number");
    const wMin = weightVals.length ? Math.min(...weightVals) : 0;
    const wMax = weightVals.length ? Math.max(...weightVals) : 100;
    const cMin = caloriesVals.length ? Math.min(...caloriesVals) : 0;
    const cMax = caloriesVals.length ? Math.max(...caloriesVals) : 2000;
    const dMin = deltaVals.length ? Math.min(...deltaVals) : -10;
    const dMax = deltaVals.length ? Math.max(...deltaVals) : 10;
    const pMin = proteinVals.length ? Math.min(...proteinVals) : 0;
    const pMax = proteinVals.length ? Math.max(...proteinVals) : 200;
    const carbMin = carbsVals.length ? Math.min(...carbsVals) : 0;
    const carbMax = carbsVals.length ? Math.max(...carbsVals) : 400;
    const fMin = fatVals.length ? Math.min(...fatVals) : 0;
    const fMax = fatVals.length ? Math.max(...fatVals) : 150;
    const lowerPad = (min: number, max: number) =>
      min >= 0 ? Math.max(0, min - 10) : min;
    const wDispMin = lowerPad(wMin, wMax);
    const cDispMin = lowerPad(cMin, cMax);
    const dDispMin = lowerPad(dMin, dMax);
    const pDispMin = lowerPad(pMin, pMax);
    const carbDispMin = lowerPad(carbMin, carbMax);
    const fDispMin = lowerPad(fMin, fMax);
    const norm = (v: number, min: number, max: number) =>
      max === min ? 50 : ((v - min) / (max - min)) * 100;
    return rows.map((r) => ({
      ...r,
      weightNorm: r.weight != null ? norm(r.weight, wDispMin, wMax) : undefined,
      caloriesNorm: r.calories != null ? norm(r.calories, cDispMin, cMax) : undefined,
      weightDeltaNorm:
        r.weightDelta != null ? norm(r.weightDelta, dDispMin, dMax) : undefined,
      proteinNorm: r.protein != null ? norm(r.protein, pDispMin, pMax) : undefined,
      carbsNorm: r.carbs != null ? norm(r.carbs, carbDispMin, carbMax) : undefined,
      fatNorm: r.fat != null ? norm(r.fat, fDispMin, fMax) : undefined,
    }));
  }, [logs, range.from]);

  const chartScaleRanges = useMemo(() => {
    const weightVals = chartData.map((r) => r.weight).filter((v): v is number => typeof v === "number");
    const caloriesVals = chartData.map((r) => r.calories).filter((v): v is number => typeof v === "number");
    const deltaVals = chartData.map((r) => r.weightDelta).filter((v): v is number => typeof v === "number");
    const proteinVals = chartData.map((r) => r.protein).filter((v): v is number => typeof v === "number");
    const carbsVals = chartData.map((r) => r.carbs).filter((v): v is number => typeof v === "number");
    const fatVals = chartData.map((r) => r.fat).filter((v): v is number => typeof v === "number");
    const min = (vals: number[], fallback: number) => (vals.length ? Math.min(...vals) : fallback);
    const max = (vals: number[], fallback: number) => (vals.length ? Math.max(...vals) : fallback);
    const displayMin = (mn: number, mx: number) => (mn >= 0 ? Math.max(0, mn - 10) : mn);
    const wMin = min(weightVals, 0);
    const wMax = max(weightVals, 100);
    const cMin = min(caloriesVals, 0);
    const cMax = max(caloriesVals, 2000);
    const dMin = min(deltaVals, -10);
    const dMax = max(deltaVals, 10);
    const pMin = min(proteinVals, 0);
    const pMax = max(proteinVals, 200);
    const carbMin = min(carbsVals, 0);
    const carbMax = max(carbsVals, 400);
    const fMin = min(fatVals, 0);
    const fMax = max(fatVals, 150);
    return {
      weight: { min: wMin, max: wMax, displayMin: displayMin(wMin, wMax) },
      calories: { min: cMin, max: cMax, displayMin: displayMin(cMin, cMax) },
      weightDelta: { min: dMin, max: dMax, displayMin: displayMin(dMin, dMax) },
      protein: { min: pMin, max: pMax, displayMin: displayMin(pMin, pMax) },
      carbs: { min: carbMin, max: carbMax, displayMin: displayMin(carbMin, carbMax) },
      fat: { min: fMin, max: fMax, displayMin: displayMin(fMin, fMax) },
    };
  }, [chartData]);

  const getLogForDate = useCallback(
    (date: string): LogEntry =>
      logsByDate.get(date) ?? {
        id: "",
        date,
        weight: null,
        carbs_g: null,
        protein_g: null,
        fat_g: null,
      },
    [logsByDate]
  );

  const buildFormFromLogs = useCallback((): EditFormState => {
    const state: EditFormState = {};
    for (const date of weekDates) {
      const log = getLogForDate(date);
      state[date] = {
        weight: log.weight,
        carbs_g: log.carbs_g,
        protein_g: log.protein_g,
        fat_g: log.fat_g,
      };
    }
    return state;
  }, [weekDates, getLogForDate]);

  const isRowDirty = useCallback(
    (date: string, row: EditFormRow): boolean => {
      const log = getLogForDate(date);
      return (
        row.weight !== log.weight ||
        row.carbs_g !== log.carbs_g ||
        row.protein_g !== log.protein_g ||
        row.fat_g !== log.fat_g
      );
    },
    [getLogForDate]
  );

  function isFieldDirty(date: string, field: EditableField): boolean {
    if (!editForm) return false;
    const row = editForm[date];
    if (!row) return false;
    const log = getLogForDate(date);
    return row[field] !== log[field];
  }

  const hasAnyDirty = useMemo(() => {
    if (!editForm) return false;
    return weekDates.some((date) => {
      const log = getLogForDate(date);
      const row: EditFormRow = editForm[date] ?? {
        weight: log.weight,
        carbs_g: log.carbs_g,
        protein_g: log.protein_g,
        fat_g: log.fat_g,
      };
      return isRowDirty(date, row);
    });
  }, [editForm, weekDates, getLogForDate, isRowDirty]);

  const saveAllDirty = useCallback(async () => {
    if (!editForm) return;
    const dirtyDates = weekDates.filter((date) => {
      const log = getLogForDate(date);
      const row: EditFormRow = editForm[date] ?? {
        weight: log.weight,
        carbs_g: log.carbs_g,
        protein_g: log.protein_g,
        fat_g: log.fat_g,
      };
      return isRowDirty(date, row);
    });

    // Optimistic update: show new values immediately and exit edit mode
    setLogs((prev) => {
      const byDate = new Map(prev.map((row) => [row.date, row]));
      for (const date of dirtyDates) {
        const existing = byDate.get(date) ?? {
          id: "",
          date,
          weight: null,
          carbs_g: null,
          protein_g: null,
          fat_g: null,
        };
        const row = editForm[date];
        if (row) {
          byDate.set(date, { ...existing, ...row });
        }
      }
      return Array.from(byDate.values());
    });
    setEditForm(null);
    setEditMode(false);
    setActiveCell(null);
    setActiveCellInputValue("");

    // Persist to server, then update cache with server response
    const results = await Promise.all(
      dirtyDates.map((date) =>
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            date,
            ...editForm[date],
          }),
        }).then((r) => (r.ok ? r.json() : null))
      )
    );
    const updated = results.filter((r): r is LogEntry => r != null);
    if (updated.length > 0) {
      setLogs((prev) => {
        const byDate = new Map(prev.map((row) => [row.date, row]));
        for (const row of updated) byDate.set(row.date, row);
        const next = Array.from(byDate.values());
        setLogsCacheCookie({
          from: dayBefore(fetchRange.from),
          to: fetchRange.to,
          logs: next,
        });
        return next;
      });
    }
  }, [editForm, weekDates, getLogForDate, isRowDirty, fetchRange.from, fetchRange.to]);

  const handleEditOpen = useCallback(() => {
    setEditForm(buildFormFromLogs());
    setEditMode(true);
    setActiveCell(null);
    setActiveCellInputValue("");
  }, [buildFormFromLogs]);

  const handleSaveClose = useCallback(() => {
    if (hasAnyDirty) void saveAllDirty();
    else {
      setEditForm(null);
      setEditMode(false);
      setActiveCell(null);
      setActiveCellInputValue("");
    }
  }, [hasAnyDirty, saveAllDirty]);

  const handleDiscardClose = useCallback(() => {
    setEditForm(null);
    setEditMode(false);
    setActiveCell(null);
    setActiveCellInputValue("");
  }, []);

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
        <CardTitle className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
          <History className="size-6 shrink-0" aria-hidden />
          History
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <WeekCalendarPicker
            range={range}
            setRange={setRange}
          />
          <div className="flex min-h-[3.25rem] min-w-[5.5rem] flex-col items-end justify-center gap-0.5">
            {isEditMode ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSaveClose}
                  aria-label="Save"
                  title="Save"
                >
                  <Check className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDiscardClose}
                  aria-label="Discard changes"
                  title="Discard"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleEditOpen}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            )}
            {isEditMode && hasAnyDirty && (
              <span className="text-xs italic text-muted-foreground">
                changes not saved.
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={
                    "border-b border-border text-left text-muted-foreground " +
                    (isEditMode ? "opacity-60" : "")
                  }
                >
                  <th className="pb-2 pr-3 font-normal" aria-hidden />
                  {weekDates.map((date, i) => (
                    <th
                      key={date}
                      className="min-w-[2.5rem] pb-2 pr-2 text-center font-normal"
                    >
                      <span className="block">{WEEKDAY_LABELS[i]}</span>
                      <span className="block text-xs opacity-80">
                        {formatMonDay(date)}
                      </span>
                    </th>
                  ))}
                  <th className="min-w-[4rem] border-l border-border pl-2 pb-2 pr-2 text-center font-normal">
                    <button
                      type="button"
                      onClick={() => {
                        setAggregateMode((m) => {
                          const next = m === "total" ? "average" : "total";
                          setCookie(HISTORY_AGGREGATE_COOKIE, next);
                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs uppercase tracking-wide transition-colors duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label={`Show ${aggregateMode === "total" ? "average" : "total"} (currently ${aggregateMode})`}
                      title={`Switch to ${aggregateMode === "total" ? "average" : "total"}`}
                    >
                      {aggregateMode === "total" ? "Total" : "Avg"}
                      <RefreshCcw className="size-3.5 shrink-0" aria-hidden />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    {
                      label: "Weight",
                      field: "weight" as const,
                      step: "0.1",
                      Icon: Scale,
                      macroKey: null as "protein" | "carbs" | "fat" | null,
                      isPrimary: true,
                    },
                    {
                      label: "Protein",
                      field: "protein_g" as const,
                      step: "1",
                      Icon: Beef,
                      macroKey: "protein" as const,
                      isPrimary: false,
                    },
                    {
                      label: "Carbs",
                      field: "carbs_g" as const,
                      step: "1",
                      Icon: Croissant,
                      macroKey: "carbs" as const,
                      isPrimary: false,
                    },
                    {
                      label: "Fat",
                      field: "fat_g" as const,
                      step: "1",
                      Icon: Droplet,
                      macroKey: "fat" as const,
                      isPrimary: false,
                    },
                    {
                      label: "Calories",
                      field: null,
                      step: "",
                      Icon: Flame,
                      macroKey: null as "protein" | "carbs" | "fat" | null,
                      isPrimary: true,
                    },
                  ] as const
                ).map(({ label, field, step, Icon, macroKey, isPrimary }) => {
                  const rowValues: (number | null)[] = weekDates.map((date) => {
                    const log = getLogForDate(date);
                    const row = editForm?.[date] ?? log;
                    if (field === null) {
                      const allNull =
                        row.carbs_g == null &&
                        row.protein_g == null &&
                        row.fat_g == null;
                      return allNull ? null : macrosToCalories(row.carbs_g, row.protein_g, row.fat_g);
                    }
                    const v = row[field as EditableField];
                    return v === null || v === undefined ? null : v;
                  });
                  const defined = rowValues.filter(
                    (v): v is number => typeof v === "number" && !Number.isNaN(v)
                  );
                  const sum = defined.reduce((a, v) => a + v, 0);
                  const count = defined.length;
                  const allEmpty = count === 0;
                  const aggDisplay =
                    allEmpty
                      ? "—"
                      : aggregateMode === "total"
                        ? sum
                        : sum / count;
                  const aggFormatted =
                    aggDisplay === "—"
                      ? "—"
                      : field === "weight"
                        ? Number(aggDisplay).toFixed(1)
                        : Math.round(Number(aggDisplay)).toString();

                  return (
                  <tr key={label} className="border-b border-border">
                    <td
                      className={
                        "py-2 pr-3 align-middle " +
                        (isEditMode ? "opacity-50 text-muted-foreground " : "") +
                        (isPrimary
                          ? "text-[1.1rem] text-foreground"
                          : macroKey === "protein"
                            ? "text-macro-protein"
                            : macroKey === "carbs"
                              ? "text-macro-carbs"
                              : macroKey === "fat"
                                ? "text-macro-fat"
                                : "text-muted-foreground")
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {Icon != null && (
                          <Icon
                            className={
                              isPrimary
                                ? "size-5 shrink-0 text-foreground"
                                : macroKey === "protein"
                                  ? "size-4 shrink-0 text-macro-protein"
                                  : macroKey === "carbs"
                                    ? "size-4 shrink-0 text-macro-carbs"
                                    : macroKey === "fat"
                                      ? "size-4 shrink-0 text-macro-fat"
                                      : "size-4 shrink-0 text-foreground"
                            }
                            aria-hidden
                          />
                        )}
                        {label}
                      </span>
                    </td>
                    {weekDates.map((date) => {
                      const log = getLogForDate(date);
                      const isCalories = field === null;
                      const savedValue = isCalories
                        ? macrosToCalories(log.carbs_g, log.protein_g, log.fat_g)
                        : log[field as EditableField];
                      const formRow = editForm?.[date];
                      const displayValue = formRow
                        ? isCalories
                          ? macrosToCalories(formRow.carbs_g, formRow.protein_g, formRow.fat_g)
                          : formRow[field as EditableField]
                        : savedValue;

                      if (isCalories) {
                        const cal =
                          typeof displayValue === "number"
                            ? displayValue
                            : 0;
                        const empty =
                          (formRow ?? log).carbs_g == null &&
                          (formRow ?? log).protein_g == null &&
                          (formRow ?? log).fat_g == null;
                        return (
                          <td
                            key={date}
                            className={
                              "py-2 pr-2 text-center " +
                              (isPrimary ? "text-[1.1rem]" : "") +
                              (isEditMode ? " opacity-50 text-muted-foreground" : "")
                            }
                          >
                            {empty && !formRow ? "—" : cal === 0 && empty ? "—" : cal}
                          </td>
                        );
                      }

                      const valueCellSizeColor =
                        isPrimary
                          ? "text-[1.1rem]"
                          : macroKey === "protein"
                            ? "text-macro-protein"
                            : macroKey === "carbs"
                              ? "text-macro-carbs"
                              : macroKey === "fat"
                                ? "text-macro-fat"
                                : "";
                      const editModeHoverBg =
                        macroKey === "protein"
                          ? "sm:bg-transparent sm:hover:bg-macro-protein-accent"
                          : macroKey === "carbs"
                            ? "sm:bg-transparent sm:hover:bg-macro-carbs-accent"
                            : macroKey === "fat"
                              ? "sm:bg-transparent sm:hover:bg-macro-fat-accent"
                              : "sm:bg-transparent sm:hover:bg-muted";
                      const cellClass =
                        "py-2 pr-2 text-center align-middle last:pr-0 " +
                        valueCellSizeColor +
                        (isEditMode ? " min-h-[44px] sm:min-h-0 " : "");

                      const isActive =
                        isEditMode &&
                        activeCell?.date === date &&
                        activeCell?.field === field;

                      if (isEditMode && editForm && isActive) {
                        const raw = formRow?.[field as EditableField];
                        const placeholderValue =
                          raw === null || raw === undefined ? "" : String(raw);
                        const dirty = isFieldDirty(date, field as EditableField);

                        const commitAndClose = () => {
                          const rawInput = activeCellInputValue.trim();
                          if (rawInput !== "") {
                            const num =
                              field === "weight"
                                ? parseFloat(rawInput)
                                : parseInt(rawInput, 10);
                            if (num !== null && !Number.isNaN(num)) {
                              setEditForm((prev) => ({
                                ...prev,
                                [date]: {
                                  ...(prev?.[date] ?? {
                                    weight: log.weight,
                                    carbs_g: log.carbs_g,
                                    protein_g: log.protein_g,
                                    fat_g: log.fat_g,
                                  }),
                                  [field]: num,
                                },
                              }));
                            }
                          }
                          setActiveCellInputValue("");
                          setActiveCell(null);
                        };

                        return (
                          <td key={date} className={cellClass}>
                            <Input
                              type="number"
                              step={step}
                              placeholder={placeholderValue}
                              className={
                                "mx-auto h-8 w-full min-w-0 max-w-[5rem] text-center placeholder:text-muted-foreground placeholder:opacity-70 [&::placeholder]:text-center " +
                                (dirty ? "italic " : "") +
                                (isPrimary ? "text-[1.1rem] " : "text-sm ") +
                                (macroKey === "protein"
                                  ? "text-macro-protein"
                                  : macroKey === "carbs"
                                    ? "text-macro-carbs"
                                    : macroKey === "fat"
                                      ? "text-macro-fat"
                                      : "")
                              }
                              value={activeCellInputValue}
                              onChange={(e) =>
                                setActiveCellInputValue(e.target.value)
                              }
                              onBlur={commitAndClose}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setActiveCellInputValue("");
                                  setActiveCell(null);
                                }
                              }}
                              aria-label={`${label} for ${date}`}
                              autoFocus
                            />
                          </td>
                        );
                      }

                      const display =
                        field === "weight"
                          ? (displayValue as number | null) ?? "—"
                          : (displayValue as number | null) ?? "—";
                      const dirty = isEditMode && isFieldDirty(date, field as EditableField);

                      return (
                        <td
                          key={date}
                          className={cellClass}
                          onClick={() => {
                            if (isEditMode) {
                              setActiveCellInputValue("");
                              setActiveCell({ date, field: field as EditableField });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              isEditMode &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              setActiveCellInputValue("");
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
                          <span
                            className={
                              "inline-flex min-w-[2.5rem] items-center justify-center rounded-lg px-3 py-1.5 " +
                              (isEditMode
                                ? "cursor-pointer transition-colors duration-200 ease-out " +
                                  editModeHoverBg
                                : "")
                            }
                          >
                            {dirty ? <span className="italic">{display}</span> : display}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-l border-border py-2 pl-2 pr-2 text-center align-middle text-muted-foreground">
                      <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg px-2 py-1">
                        {aggFormatted}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-10 w-full min-h-[280px] border-t border-border pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWeight((w) => !w)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showWeight
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showWeight}
                aria-label={showWeight ? "Hide weight" : "Show weight"}
              >
                {showWeight ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Weight
              </button>
              <button
                type="button"
                onClick={() => setShowCalories((c) => !c)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showCalories
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showCalories}
                aria-label={showCalories ? "Hide calories" : "Show calories"}
              >
                {showCalories ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Calories
              </button>
              <button
                type="button"
                onClick={() => setShowWeightDelta((d) => !d)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showWeightDelta
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showWeightDelta}
                aria-label={
                  showWeightDelta ? "Hide weight delta" : "Show weight delta"
                }
              >
                {showWeightDelta ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Weight Δ
              </button>
              <button
                type="button"
                onClick={() => setShowProtein((p) => !p)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showProtein
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showProtein}
                aria-label={showProtein ? "Hide protein" : "Show protein"}
              >
                {showProtein ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Protein
              </button>
              <button
                type="button"
                onClick={() => setShowCarbs((c) => !c)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showCarbs
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showCarbs}
                aria-label={showCarbs ? "Hide carbs" : "Show carbs"}
              >
                {showCarbs ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Carbs
              </button>
              <button
                type="button"
                onClick={() => setShowFat((f) => !f)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
                  (showFat
                    ? "border-border bg-accent text-foreground"
                    : "border-border bg-muted text-muted-foreground")
                }
                aria-pressed={showFat}
                aria-label={showFat ? "Hide fat" : "Show fat"}
              >
                {showFat ? (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0" aria-hidden />
                )}
                Fat
              </button>
            </div>
            {activeSeriesOrder.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.6rem] text-muted-foreground">
                <span>Y-axis:</span>
                {(
                  [
                    "weight",
                    "calories",
                    "weightDelta",
                    "protein",
                    "carbs",
                    "fat",
                  ] as const
                ).map((key) => {
                  const labels: Record<YAxisSeries, string> = {
                    weight: "Weight",
                    calories: "Calories",
                    weightDelta: "Weight Δ",
                    protein: "Protein",
                    carbs: "Carbs",
                    fat: "Fat",
                  };
                  const isActive =
                    (showWeight && key === "weight") ||
                    (showCalories && key === "calories") ||
                    (showWeightDelta && key === "weightDelta") ||
                    (showProtein && key === "protein") ||
                    (showCarbs && key === "carbs") ||
                    (showFat && key === "fat");
                  const isSelected = yAxisSeries === key;
                  if (!isActive) return null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setYAxisSeries(key)}
                      className={
                        "rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring " +
                        (isSelected ? "bg-accent text-foreground" : "hover:bg-muted")
                      }
                      aria-pressed={isSelected}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
            )}
            {(showWeight ||
              showCalories ||
              showWeightDelta ||
              showProtein ||
              showCarbs ||
              showFat) &&
            chartData.length > 0 ? (
              <ChartContainer
                config={HISTORY_CHART_CONFIG}
                className="mt-4 w-full min-h-[200px]"
              >
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <defs>
                    <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillCalories" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillWeightDelta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillProtein" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--macro-protein)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--macro-protein)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillCarbs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--macro-carbs)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--macro-carbs)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--macro-fat)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--macro-fat)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const d = new Date(value + "T12:00:00");
                      const mon = d.toLocaleString("en-US", { month: "short" });
                      const day = d.getDate().toString().padStart(2, "0");
                      return `${mon}-${day}`;
                    }}
                    className="text-[0.6rem] text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="single"
                    orientation="left"
                    domain={[0, 100]}
                    tickFormatter={(norm) => {
                      const { displayMin, max } = chartScaleRanges[yAxisSeries];
                      const range = max - displayMin;
                      const value = range === 0 ? displayMin : displayMin + (Number(norm) / 100) * range;
                      return yAxisSeries === "weight"
                        ? value.toFixed(1)
                        : Math.round(value).toString();
                    }}
                    className="text-[0.6rem] text-muted-foreground"
                  />
                  {showWeight && (
                    <Area
                      type="monotone"
                      dataKey="weightNorm"
                      yAxisId="single"
                      name="weight"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#fillWeight)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  {showCalories && (
                    <Area
                      type="monotone"
                      dataKey="caloriesNorm"
                      yAxisId="single"
                      name="calories"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#fillCalories)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  {showWeightDelta && (
                    <Area
                      type="monotone"
                      dataKey="weightDeltaNorm"
                      yAxisId="single"
                      name="weightDelta"
                      stroke="hsl(var(--chart-3))"
                      fill="url(#fillWeightDelta)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  {showProtein && (
                    <Area
                      type="monotone"
                      dataKey="proteinNorm"
                      yAxisId="single"
                      name="protein"
                      stroke="var(--macro-protein)"
                      fill="url(#fillProtein)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  {showCarbs && (
                    <Area
                      type="monotone"
                      dataKey="carbsNorm"
                      yAxisId="single"
                      name="carbs"
                      stroke="var(--macro-carbs)"
                      fill="url(#fillCarbs)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  {showFat && (
                    <Area
                      type="monotone"
                      dataKey="fatNorm"
                      yAxisId="single"
                      name="fat"
                      stroke="var(--macro-fat)"
                      fill="url(#fillFat)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={true}
                    />
                  )}
                  <ChartTooltip
                    content={(props) => (
                      <ChartTooltipContent
                        {...props}
                        labelFormatter={(label) => {
                          const d = new Date(String(label) + "T12:00:00");
                          const mon = d.toLocaleString("en-US", { month: "short" });
                          const day = d.getDate().toString().padStart(2, "0");
                          return `${mon}-${day}`;
                        }}
                        valueFormatter={(_, name, entry) => {
                          const dataKeyToReal: Record<string, string> = {
                            weightNorm: "weight",
                            caloriesNorm: "calories",
                            weightDeltaNorm: "weightDelta",
                            proteinNorm: "protein",
                            carbsNorm: "carbs",
                            fatNorm: "fat",
                          };
                          const realKey =
                            entry?.dataKey != null
                              ? dataKeyToReal[entry.dataKey] ?? entry.dataKey
                              : "weight";
                          const real = entry?.payload?.[realKey];
                          if (real == null) return "—";
                          if (name === "Weight") return Number(real).toFixed(1);
                          if (
                            name === "Protein" ||
                            name === "Carbs" ||
                            name === "Fat"
                          )
                            return Math.round(Number(real)).toString();
                          return Number(real).toLocaleString();
                        }}
                      />
                    )}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No data for this week. Toggle a series above to plot when data is available.
              </p>
            )}
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
