# Weight Stepper Input — Design Spec

## Summary

Replace the standard number input for weight entry with a stepper-based component optimized for mobile. Auto-fills from yesterday's weight so most days require 0-3 taps instead of keyboard typing.

## Motivation

The weight field is the most-used input in the app. The current `<input type="number">` triggers the system keyboard, which shifts the screen and requires precise typing on small keys. Native fitness apps (Withings, Happy Scale, Renpho) use stepper/dial patterns that avoid the keyboard entirely.

## Component: `<WeightStepper>`

**File:** `src/components/weight-stepper.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| null` | Current weight value |
| `onChange` | `(value: number \| null) => void` | Callback when weight changes |
| `previousDayWeight` | `number \| null` | Yesterday's weight for auto-fill + delta |
| `loading` | `boolean` (optional) | Whether previous day data is still loading |

### Layout

```
     Yesterday: 154.2 lbs           ← muted, shown only when available

   [ − ]       154.3       [ + ]    ← large centered number, stepper buttons
              ↑ 0.1 lbs             ← colored delta badge
```

- Center number: `text-2xl font-bold tabular-nums`, tappable to switch to keyboard input
- Stepper buttons: 44px minimum touch target, rounded, `−` and `+` labels
- Previous day reference: `text-sm text-muted-foreground`, above the stepper row
- Delta badge: green for loss, red for gain, hidden when no previous day or values match
- Unit label "lbs" shown after the number

### Behavior

1. **Auto-fill:** When `value` is null and `previousDayWeight` is available, auto-populate with yesterday's weight. The user sees a starting point immediately.

2. **Tap stepper:** Each tap adjusts by 0.1 lbs. No keyboard involved.

3. **Long-press acceleration:** Holding a stepper button:
   - 0-500ms: 0.1 per tick (every 100ms)
   - 500-1500ms: 0.5 per tick
   - 1500ms+: 1.0 per tick
   - Uses `setInterval`, cleared on pointer-up/pointer-leave.

4. **Tap-to-type fallback:** Tapping the center number switches to an inline `<input>` for manual entry. Blur or Enter confirms the value. Handles first-time use or large corrections.

5. **Range:** Clamped to 50.0-500.0 lbs. Step precision: 0.1.

### Edge Cases

- **No previous day data:** Stepper shows empty state with muted "Enter weight" placeholder. Tapping the placeholder opens keyboard input.
- **First-ever entry:** Same as no previous day — no auto-fill, user taps to type.
- **Loading state:** Shows a subtle pulse/skeleton on the previous day line while fetching.
- **Rapid tapping:** No debounce needed — each tap is a discrete local state change, no API calls until Save.

## Changes to page.tsx

The weight stepper replaces lines 361-417 in `src/app/(app)/page.tsx`.

### Remove
- `chipExpanded` state and the expandable previous-day chip button
- The weight `<Input>` field and its wrapping `<div>`
- The weight `<Label>` (the stepper is self-labeled)

### Add
```tsx
<WeightStepper
  value={weight}
  onChange={setWeight}
  previousDayWeight={prevDayWeight === "loading" ? null : prevDayWeight}
  loading={prevDayWeight === "loading"}
/>
```

### State change
- `weight` state type changes from `string` to `number | null`
- Remove string-to-number conversion in `handleSubmit` — pass `weight` directly
- Update `handleFileUpload` and log-loading effect to set `number | null` instead of string

## Testing

- Unit test the `WeightStepper` component in `src/components/weight-stepper.test.tsx`
- Test cases: auto-fill from previous day, tap increment/decrement, range clamping, tap-to-type mode, null/loading states
- Existing `logs.test.ts` unaffected — the stepper is a pure UI component with no API interaction

## Out of Scope

- Bottom tab navigation (Phase 1 — separate spec)
- Woodland theme / color changes (Phase 2)
- Scroll wheel picker (future enhancement if stepper isn't satisfying enough)
- kg/lbs unit toggle on the stepper (dashboard already handles unit conversion)
