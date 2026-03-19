"use client";

import { useAuth, AuthLoadingSkeleton } from "@/components/auth-provider";
import { macrosToCalories } from "@/app/lib/utils/calories";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ADMIN_UUID = "48b3ea43-dc0b-48dc-b4ae-b2144f21d564";

type LogEntry = {
  id: string;
  date: string;
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

type Profile = { id: string; display_name: string | null };

type DayRow = {
  label: string;
  date: string;
  weight: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  calories: number | null;
};

type WeekRow = {
  label: string;
  weight: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  calories: number | null;
};

type Metric = "weight" | "carbs" | "protein" | "fat" | "calories";
type View = "daily" | "weekly";
type WeightUnit = "kg" | "lbs";

const LBS_TO_KG = 0.453592;
// DB stores weight in lbs; convert to kg when requested
const toDisplay = (lbs: number | null, unit: WeightUnit): number | null =>
  lbs == null ? null : unit === "kg" ? Math.round(lbs * LBS_TO_KG * 10) / 10 : lbs;

const METRICS: {
  id: Metric;
  label: string;
  color: string;
  unit: string;
  axis: "left" | "right";
}[] = [
  { id: "weight",   label: "Weight",   color: "hsl(var(--primary))", unit: "kg",   axis: "left"  },
  { id: "carbs",    label: "Carbs",    color: "#60a5fa",             unit: "g",    axis: "right" },
  { id: "protein",  label: "Protein",  color: "#34d399",             unit: "g",    axis: "right" },
  { id: "fat",      label: "Fat",      color: "#fbbf24",             unit: "g",    axis: "right" },
  { id: "calories", label: "Calories", color: "#f472b6",             unit: "kcal", axis: "right" },
];

const fmt = (d: string) => {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
};

const avgNum = (vals: (number | null)[]): number | null => {
  const v = vals.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

const fmtAvg = (rows: DayRow[], key: keyof DayRow): string => {
  const n = avgNum(rows.map((r) => r[key] as number | null));
  return n != null ? n.toFixed(1) : "—";
};

/** ISO week label: "W8 '26" */
function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    Math.ceil(
      ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
    );
  return `W${weekNum} '${String(d.getFullYear()).slice(2)}`;
}

function buildWeekRows(days: DayRow[]): WeekRow[] {
  const map = new Map<string, DayRow[]>();
  for (const d of days) {
    const key = isoWeekLabel(d.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries()).map(([label, rows]) => ({
    label,
    weight: avgNum(rows.map((r) => r.weight)),
    carbs: avgNum(rows.map((r) => r.carbs)),
    protein: avgNum(rows.map((r) => r.protein)),
    fat: avgNum(rows.map((r) => r.fat)),
    calories: avgNum(rows.map((r) => r.calories)),
  }));
}

const StatCard = ({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) => (
  <Card className="flex-1 min-w-[130px]">
    <CardContent className="pt-4 pb-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold leading-none">
        {value}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

function ChartControls({
  active,
  toggle,
  view,
  setView,
  weightUnit,
  setWeightUnit,
}: {
  active: Set<Metric>;
  toggle: (m: Metric) => void;
  view: View;
  setView: (v: View) => void;
  weightUnit: WeightUnit;
  setWeightUnit: (u: WeightUnit) => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      {/* Metric toggles */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const on = active.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              style={on ? { borderColor: m.color, color: m.color, backgroundColor: `${m.color}18` } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                on ? "border-current" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: on ? m.color : "currentColor", opacity: on ? 1 : 0.4 }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* kg / lbs slider */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium transition-colors ${weightUnit === "kg" ? "text-foreground" : "text-muted-foreground"}`}>
            kg
          </span>
          <button
            role="switch"
            aria-checked={weightUnit === "lbs"}
            onClick={() => setWeightUnit(weightUnit === "kg" ? "lbs" : "kg")}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              weightUnit === "lbs" ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                weightUnit === "lbs" ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${weightUnit === "lbs" ? "text-foreground" : "text-muted-foreground"}`}>
            lbs
          </span>
        </div>

        {/* Daily / Weekly */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["daily", "weekly"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Normalise a value to 0–100 given the series min/max. Flat series → 50. */
function norm(val: number | null, min: number, max: number): number | null {
  if (val == null) return null;
  if (max === min) return 50;
  return ((val - min) / (max - min)) * 100;
}

function Charts({
  active,
  view,
  dayData,
  weekData,
  weightUnit,
}: {
  active: Set<Metric>;
  view: View;
  dayData: DayRow[];
  weekData: WeekRow[];
  weightUnit: WeightUnit;
}) {
  const rawRows = view === "daily" ? dayData : weekData;

  if (rawRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No data for this view.
      </div>
    );
  }

  if (active.size === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Select a metric above to display.
      </div>
    );
  }

  // Compute per-metric min/max for normalisation
  const metricKeys: Metric[] = ["weight", "carbs", "protein", "fat", "calories"];
  const ranges = Object.fromEntries(
    metricKeys.map((key) => {
      const vals = rawRows
        .map((r) => (key === "weight" ? toDisplay(r.weight, weightUnit) : r[key as keyof typeof r]) as number | null)
        .filter((v): v is number => v != null);
      return [key, { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0, vals }];
    })
  ) as Record<Metric, { min: number; max: number; vals: number[] }>;

  // Build rows with both original values (for tooltip) and normalised values (for chart)
  const rows = rawRows.map((r) => {
    const w = toDisplay(r.weight, weightUnit);
    return {
      label: r.label,
      // originals
      _weight: w,
      _carbs: r.carbs,
      _protein: r.protein,
      _fat: r.fat,
      _calories: r.calories,
      // normalised
      weight:   norm(w,         ranges.weight.min,   ranges.weight.max),
      carbs:    norm(r.carbs,   ranges.carbs.min,    ranges.carbs.max),
      protein:  norm(r.protein, ranges.protein.min,  ranges.protein.max),
      fat:      norm(r.fat,     ranges.fat.min,      ranges.fat.max),
      calories: norm(r.calories,ranges.calories.min, ranges.calories.max),
    };
  });

  const weightColor = "hsl(var(--primary))";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} hide />

        <Tooltip
          content={({ active: a, payload, label }) => {
            if (!a || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md space-y-1">
                <p className="font-medium text-foreground mb-1">{label}</p>
                {payload.map((p) => {
                  const key = p.dataKey as Metric;
                  const orig = p.payload[`_${key}`] as number | null;
                  const meta = key === "weight"
                    ? { label: "Weight", color: weightColor, fmt: (v: number) => `${v.toFixed(1)} ${weightUnit}` }
                    : METRICS.find((m) => m.id === key);
                  if (!meta || orig == null) return null;
                  const display = key === "weight"
                    ? (orig as number).toFixed(1) + ` ${weightUnit}`
                    : key === "calories"
                    ? `${Math.round(orig)} kcal`
                    : `${orig.toFixed(1)} g`;
                  return (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.color as string }} />
                        {meta.label}
                      </span>
                      <span className="font-medium text-foreground">{display}</span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) => {
            const m = METRICS.find((m) => m.id === value);
            return m ? m.label : value;
          }}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />

        {active.has("weight") && (
          <Line
            type="monotone"
            dataKey="weight"
            name="weight"
            stroke={weightColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        )}

        {METRICS.filter((m) => m.axis === "right").map((m) =>
          active.has(m.id) ? (
            <Line
              key={m.id}
              type="monotone"
              dataKey={m.id}
              name={m.id}
              stroke={m.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatsView({
  logs,
  fetching,
  title,
}: {
  logs: LogEntry[];
  fetching: boolean;
  title?: string;
}) {
  const [active, setActive] = useState<Set<Metric>>(new Set<Metric>(["weight", "calories"]));
  const [view, setView] = useState<View>("daily");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");

  const toggle = (m: Metric) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });

  const dayData: DayRow[] = useMemo(
    () =>
      [...logs]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => ({
          label: fmt(l.date),
          date: l.date,
          weight: l.weight,
          carbs: l.carbs_g,
          protein: l.protein_g,
          fat: l.fat_g,
          calories:
            l.carbs_g != null || l.protein_g != null || l.fat_g != null
              ? macrosToCalories(l.carbs_g, l.protein_g, l.fat_g)
              : null,
        })),
    [logs]
  );

  const weekData = useMemo(() => buildWeekRows(dayData), [dayData]);

  const weightVals = dayData.map((d) => d.weight).filter((v): v is number => v != null);
  const minW = weightVals.length ? Math.min(...weightVals) : 0;
  const maxW = weightVals.length ? Math.max(...weightVals) : 0;

  return (
    <div className="space-y-6">
      {title && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dayData.length} log entries · last 12 months
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Avg Weight"
          value={(toDisplay(avgNum(dayData.map((d) => d.weight)), weightUnit) ?? 0).toFixed(1)}
          unit={weightUnit}
        />
        <StatCard
          label="Weight Δ"
          value={weightVals.length ? `+${(toDisplay(maxW, weightUnit)! - toDisplay(minW, weightUnit)!).toFixed(1)}` : "—"}
          unit={weightUnit}
          sub={weightVals.length ? `${toDisplay(minW, weightUnit)?.toFixed(1)}–${toDisplay(maxW, weightUnit)?.toFixed(1)} ${weightUnit} range` : undefined}
        />
        <StatCard label="Avg Protein" value={fmtAvg(dayData, "protein")} unit="g" />
        <StatCard label="Avg Carbs" value={fmtAvg(dayData, "carbs")} unit="g" />
        <StatCard label="Avg Fat" value={fmtAvg(dayData, "fat")} unit="g" />
        <StatCard label="Avg Calories" value={fmtAvg(dayData, "calories")} unit="kcal" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <ChartControls active={active} toggle={toggle} view={view} setView={setView} weightUnit={weightUnit} setWeightUnit={setWeightUnit} />
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : dayData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No logs yet.
            </div>
          ) : (
            <Charts active={active} view={view} dayData={dayData} weekData={weekData} weightUnit={weightUnit} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, authResolved, userId } = useAuth();
  const isAdmin = userId === ADMIN_UUID;

  // Own logs
  const [ownLogs, setOwnLogs] = useState<LogEntry[]>([]);
  const [ownFetching, setOwnFetching] = useState(false);

  // Admin state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [adminLogs, setAdminLogs] = useState<LogEntry[]>([]);
  const [adminFetching, setAdminFetching] = useState(false);

  // Fetch own logs
  useEffect(() => {
    if (!isAuthenticated) return;
    setOwnFetching(true);
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    fetch(`/api/logs?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setOwnLogs)
      .finally(() => setOwnFetching(false));
  }, [isAuthenticated]);

  // Fetch profiles if admin
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        setProfiles(data);
        if (data.length > 0) setSelectedUserId(data[0].id);
      });
  }, [isAdmin]);

  // Fetch selected user's logs
  useEffect(() => {
    if (!isAdmin || !selectedUserId) return;
    setAdminFetching(true);
    fetch(`/api/admin/logs?userId=${selectedUserId}`)
      .then((r) => r.json())
      .then(setAdminLogs)
      .finally(() => setAdminFetching(false));
  }, [isAdmin, selectedUserId]);

  if (!authResolved) return <AuthLoadingSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Sign in to view your dashboard.</p>
        <Link
          href="/auth"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    const selected = profiles.find((p) => p.id === selectedUserId);
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Admin view
            </p>
          </div>
          {/* Profile selector */}
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-select" className="text-xs text-muted-foreground">
              Viewing profile
            </label>
            <select
              id="profile-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <StatsView
          logs={adminLogs}
          fetching={adminFetching}
          title={selected?.display_name ?? undefined}
        />
      </div>
    );
  }

  return <StatsView logs={ownLogs} fetching={ownFetching} title="Dashboard" />;
}
