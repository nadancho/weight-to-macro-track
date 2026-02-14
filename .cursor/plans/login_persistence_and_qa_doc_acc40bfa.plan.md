---
name: Login persistence and QA doc
overview: Fix the bug where the app does not remember the user is logged in after clicking "Log today" by adding Supabase-recommended middleware to refresh the session and forward cookies, and add a QA document to record this fix and future iterations.
todos: []
isProject: false
---

# Login persistence fix and QA documentation

## Problem

After signing in on the home page, clicking **"Log today"** (or the nav **"Log"** link) takes the user to `/log`, but the app shows **"You need to sign in to log"** instead of the log form. The `/log` page checks auth by calling `GET /api/profile` with `credentials: "include"`. That API (and `/api/logs`) uses the server Supabase client and `supabase.auth.getUser()` to resolve the user; when no user is found, the server returns 401 and the client treats the user as unauthenticated.

So the server is not seeing a valid session on the request that follows login (e.g. the first request to `/api/profile` or `/api/logs` after navigating to `/log`).

## Root cause

- **No middleware:** The app has no Next.js middleware. Supabase’s [SSR guide for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) states that you need a **proxy** (middleware) to:
  - Refresh the auth token (e.g. via `getClaims()`).
  - Write refreshed cookies to the **response** so the browser and server stay in sync.
- Without this, the session cookie set during `POST /api/auth/sign-in` may not be refreshed or forwarded correctly on subsequent requests. Known issues with [Next.js 14.2+ and Supabase SSR](https://github.com/supabase/ssr/issues/107) (e.g. `AuthSessionMissingError` despite cookies) are often addressed by ensuring middleware runs and updates the session on every request.

Current flow:

- Sign-in: [src/app/api/auth/sign-in/route.ts](src/app/api/auth/sign-in/route.ts) → auth module → [auth.service.ts](src/app/lib/services/auth/auth.service.ts) uses server `createClient()` and `signInWithPassword()`. Server client uses [server.ts](src/app/lib/integrations/supabase/server.ts) cookie adapter (`getAll` / `setAll`). So the sign-in response *can* set cookies, but there is no middleware to refresh or re-apply them on later requests.
- Protected calls: [src/app/(app)/log/page.tsx](src/app/(app)/log/page.tsx) calls `fetch("/api/profile", { credentials: "include" })`; [src/app/api/profile/route.ts](src/app/api/profile/route.ts) and [src/app/api/logs/route.ts](src/app/api/logs/route.ts) use server `createClient()` and `getUser()`. If the session is not refreshed or cookies are not correctly forwarded, `getUser()` returns no user.

## Fix (implementation plan)

### 1. Add Next.js middleware to refresh Supabase session

- Add a single middleware file at the project root: `**middleware.ts**` (or `**src/middleware.ts**` if the app lives under `src/`; Next 14 looks for both). No middleware exists today.
- In middleware:
  - Create a Supabase server client that reads cookies from the **request** and writes them to the **response** (using the same pattern as [Supabase’s proxy example](https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/lib/supabase/proxy.ts)): `getAll()` from `request.cookies`, `setAll()` on the `NextResponse` so refreshed cookies are sent back.
  - Call `**supabase.auth.getClaims()**` (Supabase’s current recommendation; avoids trusting `getSession()` in server code and refreshes the token).
  - Return the **same response object** that had cookies set (so cookie headers are not lost).
- Do **not** redirect unauthenticated users to a login page in middleware. The app intentionally allows:
  - Public access to `/` (login/sign-in or welcome).
  - `/log`, `/history`, `/profile` to be reachable without redirect; they show in-page “sign in” or similar when unauthenticated. So middleware should only refresh the session and forward cookies; leave route-level auth checks as they are.

Matcher: run middleware for all routes that might hit the app or API (e.g. exclude `_next/static`, `_next/image`, favicon, and static assets) so that every HTML and API request gets the session refresh and cookie update.

### 2. Ensure sign-in response can set cookies

- The sign-in route already uses the server Supabase client with the cookie adapter; on success, Supabase will call `setAll()` with session cookies. If the adapter uses `cookies()` from `next/headers` in the Route Handler, verify that this actually attaches Set-Cookie to the Route Handler response (behavior can be subtle in Next 14.2+). If needed, document or add a minimal test that after `POST /api/auth/sign-in` the response has the expected `Set-Cookie` header(s). The main fix is middleware; this is a sanity check.

### 3. QA documentation

- Add `**docs/qa.md**` (or similarly named living doc) as the QA record. Structure it so you can iterate:
  - **Bugs fixed:** Short entries with: symptom, root cause, fix (with file/area), and date/version if useful.
  - **Designs / behaviors implemented:** Optional section for intentional behavior or design decisions that affect QA.
- First bug entry: **Login not remembered after “Log today”** — symptom: after sign-in, navigating to “Log today” shows “You need to sign in to log”; root cause: no middleware to refresh Supabase session and forward cookies; fix: add middleware that creates Supabase server client with request/response cookies and calls `getClaims()`, returning the response with updated cookies; no redirect for unauthenticated users.

## Verification

- Sign in on `/` with valid email/PIN.
- Click **“Log today”** (or nav **“Log”**) to go to `/log`.
- Expect: log form is shown (no “You need to sign in to log”).
- Submit a log: expect “Saved.” and no 401 from `/api/logs`.
- Optional: reload `/log` or open `/profile` and confirm the app still shows the user as logged in.

## Files to add/change


| Action      | File                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Add         | `middleware.ts` (or `src/middleware.ts`) – Supabase server client + `getClaims()` + cookie forwarding; matcher for app/API routes. |
| Add         | `docs/qa.md` – QA log with “Bugs fixed” and first entry for this login persistence bug.                                            |
| Verify only | `src/app/lib/integrations/supabase/server.ts` – keep existing adapter; middleware uses its own request/response cookie handling.   |


## Optional follow-ups

- If cookie handling differs between Route Handler and middleware, consider a small shared cookie adapter or doc note so future changes stay consistent.
- Add a unit test or E2E step that signs in and then calls `GET /api/profile` (with cookies) and asserts 200, to guard against regressions.

