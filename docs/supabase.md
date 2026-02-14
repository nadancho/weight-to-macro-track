# Supabase

When changing database schema, RLS, or auth, **consult the latest Supabase documentation**:

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [API keys (publishable / secret)](https://supabase.com/docs/guides/api/api-keys)
- [Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Generate TypeScript types](https://supabase.com/docs/guides/api/generating-types): `supabase gen types typescript --project-id <id>`

## Session persistence

- The session is stored in **cookies** (httpOnly, secure in production) via `@supabase/ssr`. No extra "persist session" flag is required in app code.
- **Middleware** ([`src/middleware.ts`](../src/middleware.ts)) runs on each request and calls `supabase.auth.getClaims()` to refresh the token, then forwards updated cookies in the response so the browser and server stay in sync.
- Any future **client-side** Supabase usage (e.g. auth state listeners) should stay aligned with the SSR cookie approach; see [Supabase Next.js guide](https://supabase.com/docs/guides/auth/server-side/nextjs).

## Env vars

- `NEXT_PUBLIC_SUPABASE_URL` – Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` – Publishable key for RLS-respecting access.
- `SUPABASE_SECRET_KEY` – Optional; server-only, bypasses RLS.
