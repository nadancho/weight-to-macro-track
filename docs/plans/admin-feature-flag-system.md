# Admin Feature Flags System

## Context

The app has several tunable behaviors (animation probabilities, save celebration triggers, etc.) that are currently hardcoded as constants. We want an **admin-controlled feature flags system** backed by Supabase so that settings can be changed in real-time without redeployment. The admin page will let Nathan adjust percentage probabilities and toggle features, and the app reads the current values on each relevant action.

## Architecture

A new `app_settings` table stores key-value pairs with typed values. A new `settings` domain follows the existing 4-layer pattern (route → module → service → integration). The admin page provides a UI to edit values. Client-side code fetches settings once on app load and caches them in a React context.

## Changes

### 1. Database — new `app_settings` table

**Migration:** `supabase/migrations/<timestamp>_create_app_settings.sql`

```sql
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- RLS: readable by all authenticated users, writable only via admin (service role)
alter table public.app_settings enable row level security;
create policy "Authenticated users can read settings"
  on public.app_settings for select
  to authenticated using (true);

-- Seed initial flags
insert into public.app_settings (key, value, description) values
  ('woodland_save_animation_enabled', 'true', 'Enable the pawprint trail animation on save'),
  ('woodland_save_animation_chance', '1.0', 'Probability (0-1) that the save animation fires when eligible'),
  ('leaf_burst_enabled', 'true', 'Enable leaf emoji burst during rustle phase'),
  ('leaf_burst_count', '5', 'Number of leaves per burst'),
  ('leaf_burst_gravity', '800', 'Gravity in px/s² for leaf projectiles');
```

Values are `jsonb` so they can hold booleans, numbers, strings, or even objects. The `key` is the primary key — no surrogate ID needed.

### 2. Types — `src/app/lib/integrations/supabase/types.ts`

Add `AppSettings` table type to the existing `Database` interface:
```ts
app_settings: {
  Row: { key: string; value: unknown; description: string | null; updated_at: string };
  Insert: { key: string; value: unknown; description?: string | null };
  Update: { key?: string; value?: unknown; description?: string | null };
};
```

### 3. Service — `src/app/lib/services/settings/settings.service.ts`

- `getAllSettings()` — reads all rows from `app_settings` (uses normal `createClient`, RLS allows authenticated reads)
- `getSetting(key: string)` — reads single setting by key
- `updateSetting(key: string, value: unknown)` — uses `createAdminClient()` to upsert (admin only at the API layer)

### 4. Module — `src/app/lib/modules/settings/index.ts`

Re-export: `getAllSettings`, `getSetting`, `updateSetting`

### 5. API Routes

**`src/app/api/settings/route.ts`** (GET) — authenticated users can read all settings
- Auth check (401 if no user)
- Call `getAllSettings()`
- Return as JSON map `{ [key]: value }`

**`src/app/api/admin/settings/route.ts`** (GET, PUT) — admin can read and update
- GET: same as above but through admin path for consistency
- PUT: admin UUID check (403 if not admin), Zod-validate body `{ key: string, value: unknown }`, call `updateSetting()`

### 6. Client-side provider — `src/components/settings-provider.tsx`

```tsx
SettingsProvider — wraps the app, fetches settings on mount
useSettings() — returns { settings: Map<string, unknown>, loading, refresh }
getSetting<T>(key, defaultValue) — typed accessor with fallback
```

- Fetches `GET /api/settings` once on auth
- Caches in React state (not localStorage — settings should always be fresh from DB)
- Exposes `refresh()` for the admin page to call after saving

### 7. Admin page — `src/app/(app)/admin/settings/page.tsx`

- Client component with existing admin UUID guard pattern
- Fetches current settings via the provider
- Renders each setting as an appropriate control:
  - **Boolean flags** → toggle switch
  - **Number values** → number input or slider (0-1 for probabilities, open range for others)
  - **String values** → text input
- Save button calls `PUT /api/admin/settings` per changed value
- Shows the `description` field as helper text under each control
- Calls `refresh()` after save to sync the provider

### 8. Wire into existing code

**`src/components/woodland-reveal.tsx`** — read `woodland_save_animation_enabled` and `woodland_save_animation_chance` from settings context. If disabled, skip. If chance < 1.0, roll `Math.random()` before triggering.

**`src/app/(app)/page.tsx`** — gate the `woodland:save` dispatch with the settings check (or move the gate into `WoodlandScene` itself for cleaner separation).

### 9. Add link to admin nav

**`src/app/(app)/admin/page.tsx`** — add a link to `/admin/settings` alongside the existing `/admin/animations` link.

## Files to create

| File | Purpose |
|---|---|
| `supabase/migrations/<ts>_create_app_settings.sql` | Table + RLS + seed data |
| `src/app/lib/services/settings/settings.service.ts` | CRUD logic |
| `src/app/lib/modules/settings/index.ts` | Public API barrel |
| `src/app/api/settings/route.ts` | Authenticated GET |
| `src/app/api/admin/settings/route.ts` | Admin GET + PUT |
| `src/components/settings-provider.tsx` | Client-side cache + context |
| `src/app/(app)/admin/settings/page.tsx` | Admin UI |

## Files to modify

| File | Change |
|---|---|
| `src/app/lib/integrations/supabase/types.ts` | Add `app_settings` table type |
| `src/app/(app)/layout.tsx` | Wrap with `SettingsProvider` |
| `src/components/woodland-reveal.tsx` | Read settings for animation gating |
| `src/app/(app)/admin/page.tsx` | Add settings link |

## Verification

1. Run `supabase db reset` or apply migration — confirm `app_settings` table exists with seed data
2. `pnpm dev` → sign in as admin → navigate to `/admin/settings`
3. Toggle a boolean flag → confirm it saves and the settings provider picks up the change
4. Adjust `woodland_save_animation_chance` to `0` → save a log → confirm animation does NOT fire
5. Set it back to `1.0` → save a log → confirm animation fires
6. Sign in as non-admin → confirm `/admin/settings` shows "Access denied"
7. `pnpm build` passes clean

## Worktree

Recommended — this touches multiple layers (migration, service, module, routes, provider, admin UI, existing components). Use `wt switch` to isolate.
