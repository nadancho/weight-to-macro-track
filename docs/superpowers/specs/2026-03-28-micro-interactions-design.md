# Micro-Interactions: Page Transitions, Skeleton Loaders, Button Feedback, Collapsible Calendar

## Summary

Add four app-feel improvements: Framer Motion page transitions on tab navigation, skeleton loading states replacing "Loading..." text, press feedback on all interactive elements, and a collapsible calendar on the log page. These are themeable foundations — built generic now, ready for the woodland palette in Phase 2.

## 1. Page Transitions

**New dependency:** `framer-motion`

**New file:** `src/app/(app)/template.tsx`

A client component using `motion.div` keyed by `usePathname()`. Next.js templates re-mount on every route change, which triggers the enter/exit animations.

**Animation:**
- Enter: `opacity: 0 → 1`, `y: 6 → 0` over 150ms ease-out
- Exit: `opacity: 1 → 0` over 100ms ease-in
- Mode: `"wait"` — old page fully exits before new one enters

No directional sliding — crossfade with a gentle rise feels native for tab navigation. Directional slides can be added later if desired.

**Why template.tsx:** Layouts in Next.js App Router persist across navigations and don't re-mount. Templates re-mount on every route change, which is required for `AnimatePresence` to detect enter/exit.

## 2. Skeleton Loaders

**New file:** `src/components/ui/skeleton.tsx`

A simple div component: `animate-pulse rounded-md` with a configurable background via CSS custom property `--skeleton` (defaults to `hsl(var(--muted))`). Accepts `className` for sizing. Uses `cn()` from `@/lib/utils`.

**Apply to these loading states:**

| Location | Current | Replacement |
|----------|---------|-------------|
| Dashboard stat cards | `"Loading..."` text | 6 skeleton cards matching StatCard dimensions |
| Dashboard chart area | `"Loading..."` text | Skeleton rectangle at chart height (300px) |
| History page log loading | `"Loading..."` or empty | Skeleton rows matching the weekly table structure |
| Auth loading | `AuthLoadingSkeleton` | Review existing — update if it's just text |

Each page that currently shows a loading string should instead render skeleton placeholders that match the shape of the real content. This creates the perception of speed — the user sees the "structure" of the page before data arrives.

**Themeable:** The `--skeleton` CSS variable in `globals.css` can be overridden in Phase 2 to use a warmer woodland tone instead of the default gray.

## 3. Button Press Feedback

**Modify:** `src/components/ui/button.tsx`

Add to the base `buttonVariants` class: `active:scale-[0.97] transition-transform duration-75`

This gives every `<Button>` in the app a subtle press-down feel. Duration 75ms keeps it snappy.

**Also apply to custom buttons not using the Button component:**
- Bottom nav tab links in `src/components/bottom-nav.tsx` — add `active:scale-95` to each Link
- Macro upload button in `src/app/(app)/page.tsx` — already a custom `<button>`, add `active:scale-[0.97]`
- Weight stepper buttons in `src/components/weight-stepper.tsx` — already have `active:scale-95`, keep as-is

## 4. Collapsible Calendar

The calendar on the log page takes significant vertical space. Most days the user logs for today and doesn't need to pick a date. The existing date bar ("Friday, Mar 28" + "Jump to today") becomes the toggle — no separate accordion wrapper.

**Default state:** Collapsed. Only the date bar is visible with a chevron indicating it can expand.

**Collapsed:**
```
┌─────────────────────────────────┐
│  Friday, Mar 28      ▼   Today │
└─────────────────────────────────┘
```

**Expanded (tap date bar to open):**
```
┌─────────────────────────────────┐
│          < March 2026 >         │
│  Mo Tu We Th Fr Sa Su           │
│  ...calendar grid...            │
│                                 │
│  Friday, Mar 28      ▲   Today │
└─────────────────────────────────┘
```

**Animation:** Use Framer Motion `AnimatePresence` + `motion.div` with `height: auto` animation (via `layout` prop or explicit height measurement). The calendar fades in and expands smoothly. The chevron rotates 180 degrees.

**Auto-collapse:** After selecting a date, the calendar collapses automatically with a brief delay (200ms) so the user sees their selection register before it closes.

**Modify:** `src/app/(app)/page.tsx` — wrap the `<Calendar>` component in a collapsible section controlled by a `calendarOpen` state (default `false`). Move the date bar below the calendar and make it the toggle trigger. The chevron icon (`ChevronDown` from lucide) rotates based on state.

## Files

| File | Action |
|------|--------|
| `src/app/(app)/template.tsx` | New — page transition wrapper |
| `src/components/ui/skeleton.tsx` | New — skeleton loader component |
| `src/components/ui/button.tsx` | Modify — add press feedback |
| `src/components/bottom-nav.tsx` | Modify — add press feedback to tab links |
| `src/app/(app)/page.tsx` | Modify — collapsible calendar, press feedback on upload button |
| `src/app/(app)/dashboard/page.tsx` | Modify — replace loading text with skeletons |
| `src/app/(app)/history/page.tsx` | Modify — replace loading text with skeletons |
| `src/app/globals.css` | Modify — add `--skeleton` CSS variable |
| `package.json` | Modify — add `framer-motion` dependency |

## Out of Scope

- Directional slide transitions (can layer on later)
- Woodland color palette (Phase 2)
- Save button checkmark animation (future enhancement)
- Pull-to-refresh (future enhancement)
