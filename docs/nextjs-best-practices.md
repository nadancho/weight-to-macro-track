# Next.js best practices for this app

Summary of official [Next.js](https://nextjs.org/docs) guidance applied to the Weight Gain Tracker (App Router, Supabase, TypeScript). See the linked docs for full detail.

---

## Authentication and authorization

- **Server-side auth first:** Resolve session on the server (layout, middleware, Server Components). Use that to avoid flashing the wrong UI (e.g. sign-in when the user is already logged in).
- **Optimistic checks in middleware:** Use middleware to refresh the session (e.g. Supabase `getClaims()`) and optionally redirect:
  - Unauthenticated users hitting protected routes → redirect to `/` (or login).
  - Authenticated users hitting auth-only routes (e.g. `/sign-up`) → redirect to `/`.
- **Secure checks at the data layer:** Middleware/Proxy use cookie-based (optimistic) checks. Always verify the user in Route Handlers, Server Actions, and server code that returns or mutates data (e.g. `getSession()` / `getUser()` before DB access).
- **Server Actions for auth logic:** Sign-in/sign-up should run in Server Actions or Route Handlers so credentials never run only on the client. This app uses Route Handlers + modules; same principle.

References: [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication), [Authorization with Proxy](https://nextjs.org/docs/app/building-your-application/authentication#optimistic-checks-with-proxy-optional).

---

## Data fetching

- **Prefer Server Components:** Fetch in async Server Components when possible. Data stays on the server, reduces client JS, and avoids loading waterfalls.
- **Fetch where it’s needed:** Colocate data fetching with the component that needs it. Next.js memoizes `fetch` in a single render pass.
- **Parallel over sequential:** Start independent requests together (e.g. `Promise.all` or multiple awaits in the same component) instead of chaining.
- **Streaming and loading UI:** Use `loading.tsx` per route segment and/or `<Suspense>` so the shell appears immediately and content streams in. Prefer meaningful loading states (skeletons, placeholders).
- **Client data:** For client-only data use a library (e.g. SWR, React Query) or the React `use()` API with a promise passed from a Server Component.

References: [Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns), [Caching](https://nextjs.org/docs/app/guides/caching).

---

## Routing and rendering

- **Use `<Link>` for navigation:** Enables client-side navigation and prefetching. Use `<a>` only for external or non-prefetched URLs.
- **Loading UI:** Add `loading.tsx` in route segments that fetch data so users see instant feedback during navigation.
- **Error handling:** Add `error.tsx` for route segments to catch errors and show a fallback + recovery (e.g. “Try again”). Add `global-error.tsx` at the app root for a consistent fallback.
- **404:** Use `not-found.tsx` and the `notFound()` function for missing resources. Optionally add `global-not-found.tsx` for unmatched routes.
- **Dynamic APIs:** Using `cookies()`, `searchParams`, etc. opts the route into dynamic rendering. Use them intentionally and wrap in `<Suspense>` where it helps.

References: [Production checklist](https://nextjs.org/docs/app/guides/production-checklist), [Error handling](https://nextjs.org/docs/app/getting-started/error-handling).

---

## Security

- **Authorize every protected action:** In Route Handlers and Server Actions, check session (or role) before reading/writing user data. Do not rely only on middleware.
- **Secrets on the server:** Keep API keys and secrets out of client bundles. Use `NEXT_PUBLIC_*` only for non-sensitive values.
- **Validate at the boundary:** Validate and sanitize input (e.g. Zod) in Route Handlers and Server Actions before calling modules/services.
- **Tainting (optional):** Use the Next.js taint API to prevent accidentally passing sensitive objects to Client Components.

References: [Security (Server Components / Actions)](https://nextjs.org/blog/security-nextjs-server-components-actions), [Authentication](https://nextjs.org/docs/app/building-your-application/authentication).

---

## UI and accessibility

- **Semantic tokens:** Use design tokens (e.g. `bg-background`, `text-foreground`) so theming and dark mode stay consistent. Prefer these over raw colors.
- **Forms:** Use Server Actions (or Route Handlers) for submit, validate on the server, and use `useActionState` (or similar) for pending state and errors.
- **Images and fonts:** Use the Next.js `Image` and font modules to optimize assets and reduce layout shift.
- **Scripts:** Use the Next.js `Script` component for third-party scripts with appropriate loading strategy.

References: [Production checklist – UI and accessibility](https://nextjs.org/docs/app/guides/production-checklist#ui-and-accessibility).

---

## What this app does

| Practice                         | Status |
|----------------------------------|--------|
| Middleware session refresh       | ✅ Supabase `getClaims()` in `middleware.ts` |
| Middleware auth redirects       | ✅ Protected routes → `/`; `/sign-up` when authenticated → `/` |
| Server-side initial auth        | ✅ Layout calls `getSession()`, passes `initialAuth` to `AuthProvider` |
| No sign-in flash                | ✅ `authResolved` + loading state until client confirms |
| Route Handlers thin + Zod       | ✅ Parse → validate → auth → one module call |
| Modules as public API            | ✅ Routes and domains use `@/app/lib/modules/*` only |
| Loading UI                      | ✅ `(app)/loading.tsx` for streaming |
| Error UI                        | ✅ `(app)/error.tsx` for segment errors |
| Link for in-app navigation       | ✅ Used in nav and CTAs |
| Semantic theme tokens           | ✅ `globals.css` + Tailwind semantic classes |
