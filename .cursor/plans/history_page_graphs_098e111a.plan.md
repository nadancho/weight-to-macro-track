---
name: History page graphs
overview: Add a chart section below the History table with checkbox-style chip toggles (Weight, Calories, Weight delta) and shadcn/Recharts line charts—blue for weight, orange for calories, with dual Y-axis where needed and a separate series for daily weight delta.
todos: []
isProject: false
---

# History Page: Graphs Below Table

## Scope

- **Location:** Below the existing History table, inside the same `Card` / `CardContent`, so the graph has the same width as the table (same `overflow-x-auto` parent or sibling with `w-full`).
- **Chart stack:** shadcn Chart (Recharts) for line charts.
- **Chip controls:** Three toggle chips: **Weight**, **Calories**, **Weight delta**. Deselected = `CircleDashed` icon + lighter color; selected = `CircleCheckBig` icon + darker color.
- **Series:** Weight (blue), Calories (orange), Weight delta (distinct color, e.g. green or muted). Y-axis “relative” handled via dual Y-axis when mixing weight and calories (left: weight/delta, right: calories).

## Key files

- [src/app/(app)/history/page.tsx](src/app/(app)/history/page.tsx) – Add graph block and chip state; reuse `logs`, `weekDates` / date range and `macrosToCalories`.
- New: [src/components/ui/chart.tsx](src/components/ui/chart.tsx) – Add via `npx shadcn@latest add chart` (adds Recharts + ChartContainer, ChartTooltip, etc.).
- [src/app/globals.css](src/app/globals.css) – Add `--chart-1` … `--chart-5` (and optional custom tokens for weight/calories/delta) for theming.

## Data and series

- **Source:** Existing `logs` in `HistoryPage`, sorted by date. No new API.
- **Weight:** `log.weight` per `log.date` (line, blue).
- **Calories:** `macrosToCalories(log.carbs_g, log.protein_g, log.fat_g)` per day (line, orange).
- **Weight delta:** For each date, `weight - previousDayWeight`; first day can be `null` or omitted. One extra series (e.g. green), same X-axis (date).

Chart data will be derived in a `useMemo`: from `logs` build `{ date, weight, calories, weightDelta }[]` (sorted by date), and filter series by chip state so only selected series are rendered.

## Layout and width

- Keep current structure: `Card` > `CardHeader` + `CardContent`.
- Inside `CardContent`: keep existing table in `<div className="overflow-x-auto">`. Add a second block below it (e.g. `<div className="mt-6 w-full">`) for:
  1. Chip row (flex wrap): three chips, same width context as table.
  2. Chart container: `ChartContainer` with `className="w-full min-h-[200px]"` (or similar) so it matches table width and is responsive.

## Chip UX (checkbox-style)

- Each chip: click toggles visibility of that series.
- **Deselected:** `CircleDashed` icon, lighter styling (e.g. `text-muted-foreground` / `bg-muted`).
- **Selected:** `CircleCheckBig` icon, darker (e.g. `text-foreground` / `bg-accent` or `border-border`).
- Use Lucide: `CircleDashed`, `CircleCheckBig`. Prefer semantic classes so dark mode stays consistent.
- At least one series should be selected by default (e.g. Weight).

## Chart implementation (Recharts + shadcn)

1. **Install:** `pnpm add recharts` and add shadcn chart component (`npx shadcn@latest add chart`), then add chart CSS variables to `globals.css` (per shadcn chart docs).
2. **Config:** Define a `ChartConfig` with keys for `weight`, `calories`, `weightDelta` (labels + colors: blue, orange, e.g. green or `var(--chart-3)`).
3. **Line chart:** Use Recharts `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ChartTooltip` / `ChartTooltipContent`. Render only `Line` components for series that are currently selected.
4. **Y-axis:**

- If only weight (and optionally delta): single left Y-axis (same unit).
  - If calories is included with weight/delta: use two YAxis (e.g. left = weight/delta, right = calories) so each scale is “relative” to its own series. Recharts supports `yAxisId="left"` / `yAxisId="right"` on `YAxis` and `Line`.

## Edge cases

- **Empty range / no data:** Show a single empty state message (e.g. “No data for this week”) or a minimal grid with no lines.
- **Missing weight for a day:** Omit point or connect with gap (Recharts can show gaps if we pass `connectNulls={false}`).
- **Delta on first day:** Omit or show 0; document in code.

## Theming and accessibility

- Use CSS variables for line colors (e.g. `--history-weight`, `--history-calories`, `--history-delta`) or reuse `--chart-1` (blue), `--chart-2` (orange), `--chart-3` (delta) in `globals.css` so light/dark stay consistent.
- Preserve existing semantic tokens (`bg-background`, `text-foreground`, `border-border`, etc.) for chip and container.
- Enable `accessibilityLayer` on `ChartContainer` if available for keyboard/screen reader.

## Implementation order

1. Add Recharts and shadcn chart component; add chart CSS variables to `globals.css`.
2. In history page: add state for chip toggles (e.g. `showWeight`, `showCalories`, `showWeightDelta`), default at least weight on.
3. Add `useMemo` to build chart data (date, weight, calories, weightDelta) from `logs`, sorted by date.
4. Add chip row UI (three chips with CircleDashed / CircleCheckBig and light/dark styling).
5. Add `ChartContainer` + `LineChart` below chips; conditionally render `Line` and YAxis by selected series; implement dual Y-axis when calories is selected.
6. Wire tooltip (ChartTooltipContent) and optional legend so labels match config.

## Optional follow-up

- Persist chip selection in a cookie (e.g. `HISTORY_CHART_SERIES_COOKIE`) so it survives refresh; same pattern as `HISTORY_AGGREGATE_COOKIE`.

