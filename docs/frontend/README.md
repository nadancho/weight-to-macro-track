# Frontend

Documentation for UI, theme, and component decisions.

- **[Theme](theme.md)** – Instagram-inspired dark palette, semantic tokens, wire-like icons.

## Auth and visibility

- We do not show protected content or the login form until auth state is known.
- We use **server-provided initial auth** (session read in the (app) layout, passed via `AuthProvider`) so the first paint is correct and the sign-in form never flashes.
- Pages under `(app)` use `useInitialAuth()` as the initial value for auth state and still run a client-side fetch to stay in sync after navigation.

## Caching and cookies

- **GET APIs:** `GET /api/profile` sends `Cache-Control: private, max-age=60`. `GET /api/logs` sends `Cache-Control: private, max-age=31536000` (1 year) because logs only change when the user edits; the client invalidates on POST.
- **UX cookies:** Non-sensitive preferences (e.g. last log date) and the **logs cache** (`logs_cache`: last-fetched range + logs for instant History load) use `src/app/lib/utils/cookies.ts` with `path=/`, `max-age=1 year`, `SameSite=Lax`. The logs cache is cleared after each log create/update so the next History fetch is fresh. Auth stays in Supabase session cookies only.

## Mobile

- The **log** flow is optimized for mobile: touch-friendly tap targets (min 44px), responsive macro grid (stacked on narrow viewports), and `text-base` on inputs to avoid iOS zoom. Nav shows icons only on small screens (labels visible from `sm` up).
- **History** is not yet optimized for mobile; desktop layout is sufficient for now.
