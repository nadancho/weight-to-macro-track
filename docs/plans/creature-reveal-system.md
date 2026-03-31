# Creature Reveal — Probabilistic Sprite Animation After Save Celebration

## Context

After the user taps the final pawprint and the rustle/leaves phase plays, we want to **probabilistically reveal a creature sprite animation** on a full-screen overlay — like a gacha/loot-table reveal. The admin configures a probability table: assign any sprite animation a percentage chance, with the remainder being "nothing happens." This gives the save celebration a rewarding, collectible feel.

## Phase Machine Change

Current: `idle → pawprints → leaves → idle`

New: `idle → pawprints → leaves → reveal → idle`

The `reveal` phase is new. It fires after the leaves phase ends. If the probability roll lands on "nothing," it skips straight to idle.

## Probability Table — Database

### New table: `reveal_odds`

```sql
create table public.reveal_odds (
  id uuid primary key default gen_random_uuid(),
  animation_id text not null references sprite_animations(id) on delete cascade,
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  created_at timestamptz not null default now(),
  unique (animation_id)
);

alter table public.reveal_odds enable row level security;
create policy "Authenticated users can read reveal odds"
  on public.reveal_odds for select to authenticated using (true);
```

**How it works:**
- Each row assigns a percentage `weight` to a sprite animation (e.g. `tyson-idle` at 30%)
- Sum of all weights must be ≤ 100 — enforced by the admin API on write
- The remainder (`100 - sum`) = probability of "nothing happens"
- Rolling: generate `Math.random() * 100`, walk the table — if the roll falls within a row's cumulative range, that animation plays; if it exceeds the total, nothing happens

**Why a separate table** (not a column on `sprite_animations`): Not every animation should be in the reveal pool. An animation might exist for the grove scene or profile but not be a reveal candidate. The join table keeps concerns separate.

## New Domain: `reveal`

### Service — `src/app/lib/services/reveal/reveal.service.ts`

- `getRevealOdds()` — all rows joined with `sprite_animations` (name, sprite_path, grid config, etc.)
- `setRevealOdds(entries: { animation_id: string, weight: number }[])` — replaces all rows in a transaction. Validates sum ≤ 100 before writing. Uses admin client.
- `rollReveal()` — server-side: fetches odds, rolls random, returns the winning `SpriteAnimationRow` or `null`

### Module — `src/app/lib/modules/reveal/index.ts`

Re-export: `getRevealOdds`, `setRevealOdds`, `rollReveal`

### API Routes

**`src/app/api/reveal/roll/route.ts`** (POST) — authenticated
- Auth check
- Call `rollReveal()`
- Return `{ animation: SpriteAnimationRow | null }`

**`src/app/api/admin/reveal/route.ts`** (GET, PUT) — admin only
- GET: return current odds table with animation details
- PUT: Zod-validate body `{ entries: { animation_id: string, weight: number }[] }`, validate sum ≤ 100, call `setRevealOdds()`

## Admin Page — `src/app/(app)/admin/reveal/page.tsx`

- Fetches all sprite animations (`GET /api/admin/animations`) and current odds (`GET /api/admin/reveal`)
- Renders a table/list:
  - Each row: animation name + live `SpriteAnimator` preview + weight input (number, 0-100, step 0.01)
  - "Add animation" dropdown to pick from available animations not yet in the table
  - Remove button per row
- **Live probability bar** at the top showing the visual breakdown:
  - Colored segments per animation (proportional width)
  - Gray segment for "nothing happens" (the remainder)
  - Total percentage displayed, turns red if > 100%
- Save button — calls `PUT /api/admin/reveal`, disabled if sum > 100%
- Link added to `/admin` page alongside animations and settings links

## Reveal Phase — Frontend

### Phase machine changes in `woodland-reveal.tsx`

```
type Phase = "idle" | "pawprints" | "leaves" | "reveal" | "fadeout";
```

**leaves → reveal transition:**
- When leaves phase timer fires (currently goes to idle), instead call `POST /api/reveal/roll`
- If result has an animation: transition to `"reveal"` phase
- If result is null: transition to `"idle"` (nothing happens)

**reveal phase:**
- Full-screen dark overlay (similar to leaves overlay, z-index 42)
- `SpriteAnimator` centered on screen, playing the won animation
- Animation name or creature name displayed below the sprite
- Duration: animation plays for ~3-4 seconds (or one full loop if `loop: false`)
- Fade out → idle

### New component: `CreatureReveal`

```tsx
function CreatureReveal({ animation, onComplete }: {
  animation: SpriteAnimationRow;
  onComplete: () => void;
}) {
  // Full-screen overlay with centered SpriteAnimator
  // Auto-dismiss after REVEAL_DURATION or on tap
  // Uses existing SpriteAnimator component — no new renderer needed
}
```

## Files to create

| File | Purpose |
|---|---|
| `supabase/migrations/<ts>_create_reveal_odds.sql` | Table + RLS |
| `src/app/lib/services/reveal/reveal.service.ts` | Odds CRUD + roll logic |
| `src/app/lib/modules/reveal/index.ts` | Public API barrel |
| `src/app/api/reveal/roll/route.ts` | Authenticated POST — roll the table |
| `src/app/api/admin/reveal/route.ts` | Admin GET + PUT — manage odds |
| `src/app/(app)/admin/reveal/page.tsx` | Admin probability table UI |

## Files to modify

| File | Change |
|---|---|
| `src/app/lib/integrations/supabase/types.ts` | Add `reveal_odds` table type |
| `src/components/woodland-reveal.tsx` | Add `"reveal"` phase, `CreatureReveal` component, leaves→reveal transition with API call |
| `src/app/(app)/admin/page.tsx` | Add link to `/admin/reveal` |

## Key design decisions

- **Roll happens server-side** — prevents client manipulation of odds. The API returns the result, client just renders it.
- **Sum ≤ 100 enforced on write** — not a DB constraint (would need a trigger), validated in the service layer before the transaction.
- **`reveal_odds` is a separate table** — not a column on `sprite_animations`. Keeps the animation registry clean and allows the same animation to exist without being in the reveal pool.
- **Reuses existing `SpriteAnimator`** — no new rendering code needed. The component already handles sprite sheets, frame sequences, offsets, mirrors, FPS, and looping.

## Verification

1. Apply migration → confirm `reveal_odds` table exists
2. Admin: navigate to `/admin/reveal`, add 2-3 animations with weights summing to e.g. 60%
3. Confirm the probability bar shows 60% assigned, 40% "nothing"
4. Attempt to save with sum > 100% → should be blocked
5. Save a log → tap the pawprint → rustles play → creature appears on full-screen overlay (60% of the time) or nothing extra happens (40%)
6. Verify the reveal overlay is dismissable (tap or auto-timeout)
7. Non-admin cannot access `/admin/reveal`
8. `pnpm build` passes

## Worktree

Recommended — new migration, new domain, phase machine changes. Use `wt switch` to isolate.
