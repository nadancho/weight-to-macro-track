# QA log

Living record of bugs fixed and designs implemented. Update this doc as you fix issues or ship intentional behavior.

---

## QA to execute

Checklist of planned work. When an item is done, move it to "Bugs fixed" or "Designs / behaviors implemented" and tick it off.

- [x] **1. Instagram-like dark theme and frontend docs** – Theme tokens in `globals.css`, nav icons (lucide), `docs/frontend/` (README, theme.md).
- [x] **2. Fix auth flash** – Server-side initial auth in (app) layout via `AuthProvider` and `useInitialAuth()`; no sign-in form on first paint.
- [x] **3. Caching and cookie-backed UX** – `Cache-Control: private, max-age=60` on GET profile; `Cache-Control: private, max-age=31536000` on GET logs (logs only change on self-edit). `last_log_date` cookie on log page; `logs_cache` cookie for instant history (range + logs), cleared on log POST.
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

### Log page – date input / calendar selector

- **What:** The log page uses the native date input (`<input type="date">`). Clicking the field or calendar icon opens the browser’s built-in date picker: overlay, month/year dropdown, previous/next arrows, calendar grid, and footer actions (Clear, Today).
- **QA / design note:** The calendar selector’s mannerism is challenging to justify from a consistency standpoint:
  - **Selected date highlight** uses the browser default (e.g. solid blue), which does not align with the app’s silver primary and gentle gradient + white tones.
  - **Month/year navigation** uses native up/down arrows, which can look inconsistent with the rest of the UI and with our icon-based buttons.
  - **Footer actions** (Clear, Today) are text-only; the app elsewhere favors icon + label for primary actions.
- **Rationale for current behavior:** Native `<input type="date">` is used for accessibility, minimal JS, and reliable mobile behavior. Styling of the native picker is limited and varies by browser.
- **Future options (for QA/backlog):** Custom date picker component (e.g. Radix Calendar or similar) would allow silver/gradient selected state, Lucide arrows, and icon+label footer buttons; trade-off is more code and need to maintain keyboard/accessibility behavior.
