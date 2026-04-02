# Dashboard Date Range Filter

## Context

The dashboard currently shows all data from the last 12 months with no way to narrow the view. As more data accumulates, the daily chart becomes cramped and hard to read. Adding a from/to date range filter lets the user scope the stats cards and chart to any time window.

## Approach

Add two date inputs (From / To) to the `StatsView` component header area. Filter `logs` through the existing `getLogsByRange(from, to)` before computing `dayData`, `weekData`, and stats. Default to last 30 days (not 12 months) so the chart is immediately useful.

## Key file

`src/app/(app)/dashboard/page.tsx` — single file, all changes are here. The worktree copy is at `.claude/worktrees/dashboard-time-ranges/src/app/(app)/dashboard/page.tsx`.

## Changes

### 1. Add date range state to `StatsView`

```ts
const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const [rangeFrom, setRangeFrom] = useState(thirtyDaysAgo);
const [rangeTo, setRangeTo] = useState(today);
```

### 2. Filter logs by range

Currently `StatsView` receives `logs` and uses them directly for `dayData`. Change to:

```ts
const filteredLogs = useMemo(
  () => logs.filter(l => l.date >= rangeFrom && l.date <= rangeTo),
  [logs, rangeFrom, rangeTo],
);
```

Then replace all references to `logs` in `dayData` computation with `filteredLogs`.

### 3. Update stats subtitle

Change hardcoded `"last 12 months"` to show the actual date range: `"{count} log entries · {rangeFrom} – {rangeTo}"`.

### 4. Add date range UI

Below the user name / subtitle, add two native `<input type="date">` fields in a row:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <input type="date" value={rangeFrom} onChange={...} max={rangeTo} />
  <span className="text-muted-foreground">to</span>
  <input type="date" value={rangeTo} onChange={...} min={rangeFrom} max={today} />
</div>
```

Style with the existing input pattern: `rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm`. Min height 44px for touch targets.

### 5. Add preset quick-select buttons (optional enhancement)

Below the date inputs, small pill buttons: `1W`, `1M`, `3M`, `6M`, `All`. Each sets `rangeFrom` to the appropriate offset from today. Light styling, same pattern as the Daily/Weekly toggle.

### 6. Admin view

The admin view fetches logs separately via `GET /api/admin/logs?userId=X`. The admin logs API currently returns all logs with no date filter. Two options:
- **Client-side filter** (simpler): the admin fetch returns all logs, then the same `filteredLogs` filter applies. This works since the dataset is small.
- No API changes needed.

## Files to modify

| File | Change |
|---|---|
| `.claude/worktrees/dashboard-time-ranges/src/app/(app)/dashboard/page.tsx` | Add date range state, filter logs, date inputs UI, preset buttons, update subtitle |

## Verification

1. Load dashboard → defaults to last 30 days (not 12 months)
2. Chart shows ~30 data points in daily view — readable, not cramped
3. Change "From" date → stats cards and chart update immediately
4. Change "To" date → same
5. Click "1M" preset → range snaps to last month
6. Click "All" → shows full 12-month range (original behavior)
7. Admin view: select a user → date range filter still works
8. `pnpm build` passes

## Worktree

Already in worktree: `dashboard-time-ranges`
