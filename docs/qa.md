# QA log

Living record of bugs fixed and designs implemented. Update this doc as you fix issues or ship intentional behavior.

---

## QA to execute

Checklist of planned work. When an item is done, move it to "Bugs fixed" or "Designs / behaviors implemented" and tick it off.

- [x] **1. Instagram-like dark theme and frontend docs** – Theme tokens in `globals.css`, nav icons (lucide), `docs/frontend/` (README, theme.md).
- [x] **2. Fix auth flash** – Server-side initial auth in (app) layout via `AuthProvider` and `useInitialAuth()`; no sign-in form on first paint.
- [x] **3. Caching and cookie-backed UX** – `Cache-Control: private, max-age=60` on GET profile/logs; `last_log_date` cookie on log page.
- [x] **4. Sign-up user story** – `POST /api/auth/sign-up`, auth module `signUp`, `/sign-up` page, link from home.
- [x] **5. Session persistence** – Documented in `docs/supabase.md`; middleware + cookies, no extra app flag.
- [x] **6. Mobile-optimized log** – Responsive form (grid-cols-1 sm:grid-cols-3), touch targets (min-h-[44px]), text-base; nav icons only on small screens. History not optimized for mobile yet.

---

## Bugs fixed

### Login not remembered after "Log today"

- **Symptom:** After signing in on the home page, clicking "Log today" (or nav "Log") goes to `/log` but the app shows "You need to sign in to log" instead of the log form.
- **Root cause:** No middleware to refresh the Supabase session and forward cookies. The session cookie set during `POST /api/auth/sign-in` was not being refreshed or applied correctly on subsequent requests (e.g. `GET /api/profile` from the log page).
- **Fix:** Added Next.js middleware ([`src/middleware.ts`](../src/middleware.ts)) that creates a Supabase server client with request/response cookie access, calls `supabase.auth.getClaims()` to refresh the session, and returns the response with updated cookies. No redirect for unauthenticated users (app keeps public `/` and in-page "sign in" on `/log`, `/profile`).
- **Sign-in route:** Confirmed the sign-in API already uses the server Supabase client and cookie adapter; on success Supabase calls `setAll()` and the Route Handler response includes Set-Cookie. No change required there.

---

## Designs / behaviors implemented

_(Optional: add short notes on intentional behavior or design decisions that affect QA.)_
