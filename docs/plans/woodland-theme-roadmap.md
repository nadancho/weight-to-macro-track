# Woodland Theme Roadmap

Three-phase plan to transform the app from a functional dark-mode tracker into a cozy, illustrated world with swappable themes.

See also: `docs/design-brief-cottagecore-theme.md` for full visual direction, raccoon character states, and PostHog-inspired design language.

## Phase 2: Woodland Color Palette

**Status:** Not started
**Depends on:** Cache refactoring (theme selection uses the same storage/broadcast infra)

### What changes
- Replace the current silver/gray palette with warm earthy tones
- Dark mode: deep forest background, warm gold accent, sage green secondary, cream text
- Light mode: parchment/linen background, forest green accent, warm brown secondary
- Macro colors shift warmer: protein → warm clay, carbs → moss, fat → honey
- Soft textured backgrounds (subtle parchment/linen feel via CSS, not images)
- `--skeleton` variable updated to warmer tone

### Swappable theme system
- Each theme = a set of CSS custom properties applied via `data-theme` attribute on root
- Theme selection stored in localStorage (via the new `storage.ts` adapter)
- Theme changes broadcast across tabs (via `broadcast.ts`)
- Default theme: "cottagecore" (woodland)
- Future themes unlock via achievements/streaks (mechanism TBD)

### Files
- `src/app/globals.css` — new theme variable sets
- `src/app/lib/integrations/client/storage.ts` — persist theme selection (reuse from cache refactor)
- `src/components/theme-provider.tsx` — extend to support multiple themes
- New: theme definitions (could be JSON or CSS-in-JS, TBD)

---

## Phase 3: Micro-Interactions (Partially Complete)

**Status:** In progress
**Completed:** Page transitions, skeleton loaders, button press feedback, collapsible calendar, optimistic saves
**Remaining:**

### Save button checkmark animation
- Brief morph from "Save log" → checkmark icon → back to "Save log"
- Uses Framer Motion `AnimatePresence` on the button content
- Celebrates the action without the raccoon (raccoon is the bigger celebration)

### Active tab indicator
- Small dot or pill below the active icon in the bottom nav
- Animated position change when switching tabs (Framer Motion `layoutId`)

### Smooth number transitions
- Weight stepper number animates when incrementing/decrementing
- Subtle counter-style roll animation using Framer Motion

---

## Phase 4: Full Woodland Personality

**Status:** Not started
**Depends on:** Phase 2 (palette), art assets from separate package

### Illustrated elements
- Small clipart accents on card corners/edges (mushrooms, leaves, acorns)
- Nature-themed dividers (vine/branch lines instead of `border-b`)
- Calendar logged-day indicators: tiny flower/berry instead of green dot
- Custom icon set for nav tabs (acorn for profile, leaf for log, etc.)

### Raccoon character expansion
- Multiple states: greeting (sign-in), sleeping (empty dashboard), foraging (loading), confused (error), celebrating (save), party hat (streak milestone)
- Raccoon appears in more contexts throughout the app, not just on save
- Sprite sheet expansion or switch to SVG-based character

### Animated background
- Floating leaves (3-5 small SVGs drifting slowly, CSS animation only)
- Fireflies in dark mode (tiny warm dots that pulse and drift)
- `prefers-reduced-motion` media query to disable for accessibility
- Seasonal variation (future): autumn leaves, winter snowflakes, spring flowers

### Empty states
- Illustrated scenes instead of plain text (raccoon napping under tree, etc.)
- Each page gets a unique empty state illustration
