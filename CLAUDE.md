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
| Integrations | `src/app/lib/integrations/`       | Supabase clients (browser/server)                |
| Legacy       | `src/lib/`                        | Do not import from here                          |

**Five rules:**
1. Routes call exactly one module
2. Only import from `@/app/lib/modules/<domain>` — never from services or integrations directly
3. Services use other domains via modules
4. `src/lib/` is legacy — no new imports
5. All imports use `@/` alias

## Domains

- **auth** — `signIn`, `signOut`, `getSession`
- **profiles** — `getProfile`, `updateProfile`
- **logs** — `createOrUpdateDailyLog`, `getLogsByDateRange`, `getLogByDate`

## Data Model

- `profiles` — one per user; auto-created via `handle_new_user` trigger on signup
- `daily_logs` — one per user per day; upsert by `(user_id, date)`

## Auth / Routing

Protected paths (redirect to `/` if no session): `/history`, `/profile`
Auth-only paths (redirect to `/` if session exists): `/sign-up`
Middleware at `src/middleware.ts` handles this.

## Testing

Vitest, node environment. Test files: `src/**/*.test.ts`. Tests live alongside modules.
