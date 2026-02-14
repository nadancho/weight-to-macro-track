# Data model

## Tables

### `profiles`

- One row per Supabase Auth user.
- **Columns:** `id` (uuid, PK, FK to `auth.users`), `display_name`, `created_at`, `updated_at`.
- **RLS:** User can SELECT, INSERT, UPDATE own row (`auth.uid() = id`).
- **Auto-creation:** A trigger on `auth.users` (`handle_new_user`) inserts a profile row for every new signup. Migration `002_handle_new_user_profile.sql` also backfills profiles for existing auth users.

### `daily_logs`

- One row per user per day.
- **Columns:** `id`, `user_id` (FK to `profiles`), `date`, `weight`, `carbs_g`, `protein_g`, `fat_g`, `notes`, `created_at`, `updated_at`.
- **Unique:** `(user_id, date)`.
- **RLS:** User can SELECT, INSERT, UPDATE, DELETE only own rows (`auth.uid() = user_id`).

## Notes

- “One log row per user per day”: upsert by `(user_id, date)` when saving a log.
