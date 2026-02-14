---
name: Weight Tracker App Plan
overview: Plan for a Next.js weight-and-macro tracker with Supabase, thin API/module architecture, shadcn dark-mode UI, PIN-style auth, daily logging (web + PWA), and runbook documentation for future LLM edits.
todos:
  - id: step-1-scaffold
    content: "Step 1: Scaffold Next.js, pnpm, TypeScript, Tailwind, path alias, .gitignore"
    status: completed
  - id: step-2-shadcn
    content: "Step 2: Init shadcn/ui and add base components"
    status: completed
  - id: step-3-dark-mode
    content: "Step 3: Dark mode (class, CSS vars, theme script, toggle)"
    status: completed
  - id: step-4-env-supabase-client
    content: "Step 4: .env.example, Supabase integration (client) in lib/integrations"
    status: completed
  - id: step-5-db-tables-rls
    content: "Step 5: Supabase tables (profiles, daily_logs) and RLS; generate types"
    status: completed
  - id: step-6-auth-module
    content: "Step 6: Auth module (service + module + thin routes sign-in/sign-out)"
    status: completed
  - id: step-7-profiles-module
    content: "Step 7: Profiles module (service + module + thin route(s))"
    status: completed
  - id: step-8-logs-module
    content: "Step 8: Logs module (service + module + thin routes)"
    status: completed
  - id: step-9-ui-pages
    content: "Step 9: UI – layout, Log page, History page, Profile/settings"
    status: completed
  - id: step-10-pwa
    content: "Step 10: PWA manifest and icons"
    status: completed
  - id: step-11-docs
    content: "Step 11: docs/ folder (architecture, user-stories, data-model, supabase, llms-readme)"
    status: completed
  - id: step-12-tests
    content: "Step 12: Vitest setup and module tests (auth, logs); optional check-module-boundaries"
    status: completed
isProject: false
---

# Weight Gain Tracker – Next.js App Plan

## How to execute this plan

- **Work step by step.** Complete **Step N** fully (including “Done when”) before starting Step N+1.
- **When asking an LLM to implement:** say e.g. “Execute Step 3” or “Do steps 4 and 5”; the LLM should only implement the requested step(s) and not skip ahead.
- **Sections 1–8** are reference (directory shape, tech stack, data model, env vars, etc.). **Section 9** is the ordered execution list; use it as the single source of steps.

---

## Current state

- Repo is effectively **greenfield**: only `[.cursor/rules/instructions.mdc](.cursor/rules/instructions.mdc)` exists (Ezra-style rules). No `package.json`, `src/`, or app code yet.
- Architecture rules already specify: thin routes, modules as public API, services for logic, integrations for external clients, no new `@/lib/` imports in app code, pnpm, Vitest, optional `check-module-boundaries`.

---

## 1. Directory shape and five rules (alignment)

Match the requested shape under `src/`:


| Layer           | Path                             | Role                                                                                        |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| Routes          | `src/app/api/**/route.ts`        | Thin: parse → validate (Zod) → auth → **one** module call → `NextResponse`                  |
| Modules         | `src/app/lib/modules/<domain>/`  | **Only** public API; re-export or call services; routes/other domains import from here only |
| Services        | `src/app/lib/services/<domain>/` | Business logic; call integrations or other domains via **modules**                          |
| Integrations    | `src/app/lib/integrations/`      | Supabase client(s), shared external API usage                                               |
| Legacy boundary | `src/lib/`                       | Optional; **no new** app imports from here (per rules)                                      |


**Concrete patterns to follow**

- **Route:** Zod parse body/query, optional `verifyBearerToken` (or cookie/session check for web), single call e.g. `await modules.logs.createLog(dto)`, return `NextResponse.json(...)`.
- **Module:** Each domain has `index.ts` that re-exports or calls services (e.g. `src/app/lib/modules/logs/index.ts` → `createLog`, `getLogsByDateRange` from `services/logs`).
- **Cross-domain:** Domain A uses B only via `@/app/lib/modules/B`, never `@/app/lib/integrations/` of B.
- **Check (optional):** Add `check-module-boundaries` script (e.g. ESLint or small script) that forbids routes/services importing from other domains’ services or integrations.

---

## 2. Tech stack and bootstrap

- **Next.js** (App Router), **TypeScript**, **pnpm**.
- **Tailwind CSS** with **class-based dark mode** (see Section 4).
- **shadcn/ui** – init with `npx shadcn@latest init` (App Router, Tailwind), then add only the components you need (e.g. Button, Card, Input, Form, Table, Dialog).
- **Supabase** – `@supabase/supabase-js` (and optionally `@supabase/ssr` for cookie-based auth in Next.js). Use **publishable** and **secret** API keys (not legacy anon/service_role); see [Understanding API keys](https://supabase.com/docs/guides/api/api-keys). **When implementing:** use the **current Supabase docs** for client setup, RLS, and TypeScript types:
  - [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
  - [Auth](https://supabase.com/docs/guides/auth)
  - [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
  - [Database: Generate types](https://supabase.com/docs/guides/api/generating-types) (`supabase gen types typescript`)
- **Testing:** Vitest; test **module** public API with Supabase client mocked.
- **PWA:** Next.js PWA support (manifest, icons) for installability on iPhone – see [Next.js PWAs](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps).

---

## 3. Supabase data model and auth (consult docs when implementing)

**Important:** When writing migrations, RLS policies, and client code, **look up the latest Supabase documentation** (links above and in [Supabase Docs](https://supabase.com/docs)) for exact API and SQL patterns.

**Tables**

- `**profiles**`
  - Tied to Supabase Auth user (`id` = `auth.users.id` or 1:1 link).
  - Columns: e.g. `id` (uuid, PK), `display_name`, `pin_hash` (if using custom PIN – see below), `created_at`, `updated_at`.
  - RLS: user can read/update own row by `auth.uid() = id`.
- `**log` (or `daily_logs`)
  - One row per user per day.
  - Columns: e.g. `id` (uuid), `user_id` (FK to `profiles.id`), `date` (date, unique per user), `weight`, `carbs_g`, `protein_g`, `fat_g`, optional fields (e.g. `notes`, `water_ml`), `created_at`, `updated_at`.
  - Unique constraint on `(user_id, date)`.
  - RLS: SELECT/INSERT/UPDATE/DELETE only where `auth.uid() = user_id` (use separate policies per operation; see [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)).

**Auth: “PIN as password”**

- Supabase does **not** provide a built-in “PIN-only” auth. Two practical options:
  - **Option A (recommended for simplicity):** Use **email + password** where the “password” is the user’s PIN (e.g. 4–6 digits). One account per user; RLS with `auth.uid()` works as usual. UX: user enters email + PIN.
  - **Option B:** Custom PIN-only flow: store a **hashed PIN** in `profiles`, implement a custom login API that verifies PIN and then creates a Supabase session (e.g. via Admin API or magic link) or a separate app session (cookie/JWT) and, if needed, use service role or a fixed user for DB access (more work and less aligned with Supabase RLS).
- **Recommendation:** Start with **Option A** (email + PIN as password); document in `docs/` that “PIN” is implemented as the account password.

---

## 4. Dark mode (shadcn + Tailwind, class-based)

Apply the dark mode schematic you provided:

- **Tailwind:** `darkMode: "class"` in `tailwind.config.ts`.
- **CSS variables:** In `globals.css` (or equivalent), define the same semantic tokens you provided:
  - Default (light): `@theme { ... }` with `--color-background`, `--color-foreground`, `--color-card`, `--color-primary`, etc.
  - Dark: `.dark { ... }` overriding those variables.
- **Tailwind theme:** Extend `theme.colors` (or equivalent in your Tailwind version) so that `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `border-border`, etc. use `var(--color-*)` (or `hsl(var(--color-*))` if variables are HSL triplets without `hsl()`).
- **Base:** `@layer base { * { @apply border-border; } html, body { @apply bg-background text-foreground; } }`.
- **No flash:** Inline script in root layout `<head>`: read theme from cookie (e.g. `theme=dark`) and set `document.documentElement.classList.toggle('dark', dark)` before first paint.
- **Toggle:** Theme toggle component updates cookie (and/or localStorage) and adds/removes `dark` on `document.documentElement`.
- **Components:** Use semantic classes only (`bg-primary`, `text-muted-foreground`, etc.); use `dark:` only for rare overrides.

If the project uses **Tailwind v4** with `@theme`, keep the variable names and the `.dark` block as in your spec; if v3, map the same variables in `tailwind.config` and in `globals.css`.

---

## 5. Domain breakdown (modules / services / integrations)

- `**auth**`
  - **Module:** `signIn(email, pin)`, `signOut()`, `getSession()`, maybe `updatePin()`.
  - **Service:** Call Supabase Auth (e.g. `signInWithPassword`); optionally sync profile.
  - **Integration:** Supabase client (server and client variants as per [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) if used).
- `**profiles**`
  - **Module:** `getProfile()`, `updateProfile()`.
  - **Service:** Read/update `profiles` table.
  - **Integration:** Same Supabase client.
- `**logs**`
  - **Module:** `createOrUpdateDailyLog(dto)`, `getLogsByDateRange(userId, start, end)`, `getLogByDate(userId, date)`.
  - **Service:** Upsert/select on `log` table; one record per day; validate DTO (weight, carbs, protein, fat).
  - **Integration:** Same Supabase client.

Routes:

- `POST /api/auth/sign-in` → body `{ email, password }` (password = PIN) → validate with Zod → `modules.auth.signIn(...)`.
- `POST /api/auth/sign-out` → `modules.auth.signOut()`.
- `GET /api/profile` → auth required → `modules.profiles.getProfile()`.
- `GET /api/logs?from=&to=` → auth required → `modules.logs.getLogsByDateRange(...)`.
- `POST /api/logs` or `PUT /api/logs` → body with `date`, `weight`, `carbs_g`, `protein_g`, `fat_g` → validate → `modules.logs.createOrUpdateDailyLog(...)`.

All route handlers stay thin; no business logic in route files.

---

## 6. Frontend (high level)

- **Layout:** Root layout applies theme script and semantic background; sidebar or nav for “Log”, “History”, “Profile”, “Theme”.
- **Log (batch):** Single “logging” page where the user picks a date and enters weight + macros (carbs, protein, fat) and submits once (calls `POST/PUT /api/logs`).
- **History:** List or table of daily logs (and optionally a simple chart) using `GET /api/logs?from=&to=`.
- **PWA:** Add `manifest.ts` (or `manifest.json`) and required icons; `display: 'standalone'`, `start_url: '/'`. Ensure the app works well on narrow viewports for iPhone quick-logging. Optional: “Add to Home Screen” hint.
- **Theme:** Use semantic tokens everywhere; default to dark per your schematic; theme toggle in header/settings.

---

## 7. Documentation folder (for you and for LLMs)

Create a `**docs/**` folder and maintain it so future edits (including by an LLM) can rely on it like an “llms.txt” runbook.

**Suggested files:**

- `**docs/architecture.md**`
  - Directory shape (api, lib/modules, lib/services, lib/integrations).
  - Five rules (thin routes, modules as public API, services own logic, integrations as clients, no new legacy imports).
  - Diagram (e.g. Mermaid): Request → Route → Module → Service → Integration → Supabase.
  - List of domains (auth, profiles, logs) and their public module APIs.
- `**docs/user-stories.md**`
  - User stories in short form, e.g.: “As a user I can sign in with email and PIN”, “As a user I can log weight and macros for a day in one form”, “As a user I can open the app on my iPhone and log quickly”, “As a user I can see my history and trends”.
- `**docs/data-model.md**`
  - Tables: `profiles`, `log`; columns; RLS rules; note “one log row per user per day”.
- `**docs/supabase.md**`
  - Pointers to Supabase docs (Auth, RLS, JS client, type generation).
  - Note: “When changing DB or auth, consult the latest Supabase documentation at [https://supabase.com/docs.”](https://supabase.com/docs.”)
- `**docs/llms-readme.md**` (or `llms.txt` at repo root)
  - One-page summary for LLMs: “This is a weight/macro tracker. Read `docs/architecture.md` and `docs/user-stories.md` first. Backend follows module/service/integration boundaries. Use Supabase docs for Supabase-specific work.”

---

## 8. Environment variables

Follow **Supabase’s current API key best practices**: use the **publishable key** (`sb_publishable_...`) for client and server when you need RLS-respecting access, and the **secret key** (`sb_secret_...`) only for server-side elevated access. The legacy JWT-based `anon` and `service_role` keys are being phased out; publishable and secret keys allow zero-downtime rotation and are recommended. See [Understanding API keys Supabase Docs](https://supabase.com/docs/guides/api/api-keys).

Provide a `**.env.example**` (and document in `docs/` so the list is the single source of truth):

```bash
# Supabase (from Project Settings → API Keys; use Publishable key section for client-safe key)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Optional: server-side only (for admin or custom auth flows). Use Secret key from API Keys dashboard; never expose.
SUPABASE_SECRET_KEY=sb_secret_...
```

- `**NEXT_PUBLIC_SUPABASE_URL**` – Supabase project URL (client + server).
- `**NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**` – Publishable API key (`sb_publishable_...`). Safe to expose in browser and server; use for all RLS-respecting access. Replaces the legacy anon key.
- `**SUPABASE_SECRET_KEY**` – Secret API key (`sb_secret_...`). Server-only; full access, bypasses RLS. Use only when needed (e.g. custom session creation or admin operations). Replaces the legacy service_role key. Never expose to the client or commit.

Do **not** commit real keys; add `.env` and `.env.local` to `.gitignore`.

---

## 9. Step-by-step execution (do in order)

Complete each step fully before moving to the next. Reference Sections 1–8 for patterns and details.

---

**Step 1 – Scaffold**

- Create Next.js app (App Router), TypeScript, pnpm.
- Add Tailwind CSS.
- Configure path alias `@/app/lib` → `src/app/lib` (and `@/*` if needed for app root).
- Add `.gitignore` (include `.env`, `.env.local`, `node_modules`, `.next`).
- **Done when:** `pnpm dev` runs and a minimal page renders; path alias resolves.

---

**Step 2 – shadcn/ui**

- Run `npx shadcn@latest init` (App Router, Tailwind); accept or adjust `components.json`.
- Add only the components needed for the app: e.g. Button, Card, Input, Label, Form (if using react-hook-form + zod), Table, Dialog. Add more later as needed.
- **Done when:** You can import and render a shadcn component (e.g. Button) from `@/components/ui/...`.

---

**Step 3 – Dark mode**

- Set `darkMode: "class"` in `tailwind.config.ts`.
- In `globals.css`: define semantic CSS variables for light (default) and `.dark` (Section 4); add `@layer base` with `border-border`, `bg-background`, `text-foreground` on `html`/`body`.
- In root layout `<head>`: inline script that reads theme from cookie (e.g. `theme=dark`) and sets `document.documentElement.classList.toggle('dark', dark)` before first paint.
- Add a theme toggle component that updates the cookie (and/or localStorage) and adds/removes `dark` on `document.documentElement`.
- **Done when:** Toggling theme switches appearance without flash; semantic classes (`bg-background`, `text-primary`) respond to `.dark`.

---

**Step 4 – Env and Supabase client**

- Add `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `SUPABASE_SECRET_KEY` (Section 8). Document in `docs/` if folder exists, or add a one-line note in README.
- Create `src/app/lib/integrations/supabase/` (or similar): browser client and server client factories that use env vars. Use publishable key for RLS-respecting access; consult [Supabase docs](https://supabase.com/docs/guides/api/api-keys) and [Next.js + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs) for createClient patterns.
- **Done when:** App can create a Supabase client (server and client) without hardcoding keys; `.env.local` is in `.gitignore`.

---

**Step 5 – Database tables and RLS**

- In Supabase (Dashboard or SQL): create `profiles` table (Section 3); create `daily_logs` (or `log`) table with unique `(user_id, date)`; enable RLS on both; add policies using `auth.uid()` (separate SELECT/INSERT/UPDATE/DELETE where applicable). Consult [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Generate TypeScript types (`supabase gen types typescript` or Dashboard) and save to `src/app/lib/integrations/supabase/types.ts` (or agreed location).
- **Done when:** Tables exist, RLS is enabled, types file is committed and imported where needed.

---

**Step 6 – Auth module**

- **Integration:** Use Supabase client from Step 4 (no new integration).
- **Service:** `src/app/lib/services/auth/` – signIn (email + password via `signInWithPassword`), signOut, getSession. Optionally ensure profile row exists after sign-in.
- **Module:** `src/app/lib/modules/auth/index.ts` – re-export or call auth service (signIn, signOut, getSession).
- **Routes:** `POST /api/auth/sign-in` (Zod body `{ email, password }` → `modules.auth.signIn` → set cookie/session per Supabase SSR if used); `POST /api/auth/sign-out` → `modules.auth.signOut` → clear cookie/session.
- **Done when:** User can sign in with email + PIN (as password) and sign out via API; session is available on the server for protected routes.

---

**Step 7 – Profiles module**

- **Service:** `src/app/lib/services/profiles/` – getProfile, updateProfile (using Supabase client, scoped by auth.uid()).
- **Module:** `src/app/lib/modules/profiles/index.ts` – re-export getProfile, updateProfile.
- **Routes:** `GET /api/profile` (auth required → `modules.profiles.getProfile`); optionally `PATCH /api/profile` (auth required → `modules.profiles.updateProfile`).
- **Done when:** Authenticated user can fetch and optionally update their profile via API.

---

**Step 8 – Logs module**

- **Service:** `src/app/lib/services/logs/` – createOrUpdateDailyLog(dto), getLogsByDateRange(userId, from, to), getLogByDate(userId, date). Validate DTO (date, weight, carbs_g, protein_g, fat_g); upsert by (user_id, date).
- **Module:** `src/app/lib/modules/logs/index.ts` – re-export or call log service.
- **Routes:** `GET /api/logs?from=&to=` (auth required → getLogsByDateRange); `POST /api/logs` or `PUT /api/logs` (Zod body → createOrUpdateDailyLog).
- **Done when:** Authenticated user can submit a day’s log and fetch logs for a date range via API.

---

**Step 9 – UI pages**

- **Layout:** Root layout with nav/sidebar: Log, History, Profile, Theme toggle. Use semantic tokens (`bg-background`, `text-foreground`, etc.).
- **Log page:** Form with date picker, weight, carbs, protein, fat; submit calls `POST/PUT /api/logs`. Auth required (redirect or show sign-in if no session).
- **History page:** Table or list of daily logs; fetch via `GET /api/logs?from=&to=`. Optional simple chart later.
- **Profile/settings:** Display profile; optional edit; theme toggle if not in header.
- **Done when:** User can open the app, sign in, log a day, view history, and toggle theme from the UI.

---

**Step 10 – PWA**

- Add `app/manifest.ts` (or `manifest.json`) with `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, `background_color`, icons (e.g. 192x192, 512x512). See [Next.js PWA](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps).
- Add icon assets to `public/`.
- **Done when:** App is installable (e.g. “Add to Home Screen” on iPhone); narrow viewport works for quick logging.

---

**Step 11 – Documentation**

- Create `docs/architecture.md` (directory shape, five rules, diagram, domain list).
- Create `docs/user-stories.md` (short user stories).
- Create `docs/data-model.md` (profiles, daily_logs, RLS summary).
- Create `docs/supabase.md` (links to Supabase docs; “consult latest docs when changing DB/auth”).
- Create `docs/llms-readme.md` or root `llms.txt` (one-page LLM summary pointing to architecture + user-stories).
- **Done when:** All files exist and a future LLM can read them to understand the project and boundaries.

---

**Step 12 – Tests and boundaries**

- Add Vitest; configure for TypeScript and path aliases.
- Write unit tests for **module** public API: auth (signIn, signOut, getSession) and logs (createOrUpdateDailyLog, getLogsByDateRange) with Supabase client **mocked**.
- Optional: add `check-module-boundaries` script (ESLint or small script) that forbids routes/services from importing other domains’ services or integrations.
- **Done when:** `pnpm test --run` passes; optional boundary check runs and passes before commit.

---

## 10. Checklist (quick verification)

Use **Section 9** for the actual execution order. This list is for a final pass after all steps:

- Next.js App Router + pnpm + TypeScript; path alias `@/app/lib`.
- Tailwind with `darkMode: "class"`; semantic CSS variables (light + `.dark`); theme script + toggle.
- shadcn init; use only needed components; semantic classes.
- `src/app/api/**` = thin routes (Zod, auth, one module call).
- `src/app/lib/modules/<domain>/index.ts` = public API; `services/<domain>/` = logic; `integrations/` = Supabase.
- Cross-domain only via `@/app/lib/modules/<domain>`.
- Supabase: publishable/secret keys; tables + RLS; types generated; consult current Supabase docs when writing SQL/client code.
- `.env.example` with Supabase URL and publishable (and optional secret) keys; documented in `docs/`.
- `docs/architecture.md`, `docs/user-stories.md`, `docs/data-model.md`, `docs/supabase.md`, and LLM-facing readme.
- Vitest; test modules with integrations mocked; optional `check-module-boundaries`.
- PWA manifest + icons for iPhone-friendly quick logging.

