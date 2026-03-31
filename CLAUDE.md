# CLAUDE.md

## Commands

```bash
pnpm dev          # Dev server (Next.js, default port 3000)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest (watch mode)
pnpm test:run     # Vitest (single run)
```

## Supabase (local)

Run from this project directory (has its own `supabase/` with migrations):

```bash
supabase start    # Start local Supabase stack
supabase stop
supabase studio   # localhost:54323
```

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Architecture

4-layer (see `docs/architecture.md`):

| Layer        | Path                              | Role                                             |
|--------------|-----------------------------------|--------------------------------------------------|
| Routes       | `src/app/api/**/route.ts`         | Thin: parse → validate → auth → one module call |
| Modules      | `src/app/lib/modules/<domain>/`   | **Only public API** for cross-domain use         |
| Services     | `src/app/lib/services/<domain>/`  | Business logic                                   |
| Integrations | `src/app/lib/integrations/`       | Supabase clients + Anthropic                     |
| Legacy       | `src/lib/`                        | Do not import from here                          |

**Five rules:**
1. Routes call exactly one module
2. Only import from `@/app/lib/modules/<domain>` — never from services or integrations directly
3. Services use other domains via modules
4. `src/lib/` is legacy — no new imports
5. All imports use `@/` alias

## Domains

- **auth** — `signIn`, `signUp`, `signOut`, `getSession`, `updatePassword`
- **profiles** — `getProfile`, `updateProfile`
- **logs** — `createOrUpdateDailyLog`, `getLogsByDateRange`, `getLogByDate`
- **macros** — `extractMacrosFromImage` (Claude Haiku vision; extracts fat/carbs/protein from food photo)
- **collectibles** — `getUserCollectibles`, `getAllBadges`
- **animations** — `getAllAnimations`, `getAnimation`, `getAnimationsForCreature`, `createAnimation`, `updateAnimation`, `deleteAnimation`
- **reveal** — `rollReveal`, `logEncounter`, `getRevealOdds`, `setRevealOdds`, `getUserEncounters`

## Data Model

- `profiles` — one per user (`id`, `display_name`, `theme`, `week_start`, timestamps). Auto-created via `handle_new_user` DB trigger on signup, with `ensureProfile()` fallback in auth service.
- `daily_logs` — one per user per day; upsert by `(user_id, date)`. Columns: `weight`, `carbs_g`, `protein_g`, `fat_g`, `notes`.
- `badges` — registry of all collectibles (`name`, `description`, `image_path`, `kind`, `tags`, `rarity`). Badge definitions live in DB, images in Supabase Storage `badges` bucket.
- `user_collectibles` — join table: `user_id` + `collectible_id` (FK → `badges.id`) + `awarded_at`
- `sprite_animations` — sprite sheet metadata (`creature_id`, `animation_type`, `sprite_path`, grid layout, `frame_sequence`, `fps`, `loop`, `frame_offsets`, `frame_mirrors`)
- `reveal_odds` — probability weights per sprite animation for creature reveal (key: `animation_id`, value: `weight` 0-100). Sum must be ≤ 100; remainder = "nothing happens."
- `reveal_log` — audit of creature encounters per user (`user_id`, `animation_id`, `creature_id`, `first_encounter`)

## Auth / Routing

Protected paths (redirect to `/` if no session): `/history`, `/profile`, `/grove`
Auth-only paths (redirect to `/` if session exists): `/sign-up`
Middleware at `src/middleware.ts` handles this.

## Key Components

| Component | Path | Role |
|-----------|------|------|
| `log-cache-provider` | `src/components/` | localStorage cache + optimistic writes + request deduplication |
| `user-prefs-provider` | `src/components/` | `weekStartsOn` context from profile's `week_start` column |
| `auth-provider` | `src/components/` | Session context for client components |
| `woodland-theme-provider` | `src/components/` | Applies theme CSS variables to `:root` (cottagecore, classic dark) |
| `date-picker` | `src/components/` | Custom calendar: week strip (always visible) + expandable month grid |
| `weight-stepper` | `src/components/` | ±0.1/±1 stepper with auto-fill from recent entry + delta badge |
| `sprite-animator` | `src/components/` | CSS `background-position` sprite animation engine |
| `woodland-reveal` | `src/components/` | Pull-to-reveal gesture interaction (WIP) |
| `toast` | `src/components/ui/` | Right-aligned notifications, auto-dismiss, Framer Motion slide-in |

## UI Rules

- **No layout shifts for feedback.** Success/error messages must not push content around. Use toasts, overlays, or inline indicators that don't change the document flow.
- **44px minimum touch targets** on all interactive elements for mobile.

## Testing

Vitest, node environment. Test files: `src/**/*.test.ts`. Tests live alongside modules.
