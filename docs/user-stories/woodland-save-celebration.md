# Woodland save celebration

## Story

As a user, when I save my first daily log, I see a **pawprint trail walk up the screen** as a delightful celebration, reinforcing the woodland theme and rewarding consistent logging.

As an admin, I see the pawprint trail **on every save** (not just the first of the day).

## Trigger

- Pressing "Save log" on the Daily Log page dispatches a `woodland:save` custom DOM event.
- **Regular users:** the event fires only if no log exists yet for the selected date (first log of the day).
- **Admin** (`ADMIN_UUID`): the event fires on every save.
- The animation respects `prefers-reduced-motion` and does not fire if already in progress.

## Flow

### Phase machine

The `WoodlandScene` component manages a four-phase state machine:

```
idle  -->  pawprints  -->  leaves  -->  idle
                      \->  fadeout -->  idle
```

1. **idle** — nothing visible; listening for the `woodland:save` event.
2. **pawprints** — 10 glowing pawprints walk up the screen in a staggered random-walk pattern. The final (10th) print is 25% larger and tappable.
3. **leaves** (if user taps the last pawprint) — a dark green overlay fades in with italic `*rustle*` / `*crunch*` text at staggered positions, then resets to idle.
4. **fadeout** (if user ignores the pawprints) — all prints fade out after a timeout (~7.4s), then resets to idle.

### Pawprint trail details

- 10 prints appear one-by-one (0.2s stagger), each with a random walk position (momentum-based, edge-bouncing).
- Each regular print is visible for ~1s; the final print lingers for 5s.
- One glow color is randomly chosen per trail from a palette of warm browns, moss greens, and sages.
- Prints drift slightly during their lifespan for a natural feel.
- The final print acts as a button; tapping it triggers the rustle phase.

## Acceptance criteria

- [ ] Saving the first log of the day shows a pawprint trail animation.
- [ ] Subsequent saves on the same day do **not** re-trigger the animation for regular users.
- [ ] Admin sees the animation on every save regardless.
- [ ] The animation does not fire if `prefers-reduced-motion: reduce` is set.
- [ ] If the user taps the last (large) pawprint, a brief rustle overlay appears.
- [ ] If the user ignores the pawprints, they fade out automatically after ~7 seconds.
- [ ] The animation does not interfere with form interaction (pointer-events are `none` except on the tappable final print).
- [ ] A second save during an active animation does not restart or double-trigger it.

## Key files

| File | Role |
|---|---|
| `src/app/(app)/page.tsx` | Dispatches `woodland:save` event on save, gates by user type |
| `src/components/woodland-reveal.tsx` | Phase machine, pawprint trail, rustle overlay |
| `src/app/lib/constants.ts` | `ADMIN_UUID` |
