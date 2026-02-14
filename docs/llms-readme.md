# LLM readme (weight-to-macro-track)

This repo is a **weight and macro tracker** (Next.js App Router, Supabase, shadcn, dark mode, PWA).

- **Read first:** `docs/architecture.md` (directory shape, five rules, domains) and `docs/user-stories.md` (user stories).
- **Backend:** Thin API routes → one module call per route. Modules are the only public API; services hold logic; integrations are Supabase clients. Cross-domain use only via `@/app/lib/modules/<domain>`.
- **Supabase:** For any DB, RLS, or auth change, use the **current Supabase docs** (see `docs/supabase.md`).
- **Data:** `profiles` (one per user), `daily_logs` (one per user per day). See `docs/data-model.md`.
