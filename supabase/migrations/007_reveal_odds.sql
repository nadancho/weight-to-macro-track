-- Probability table for creature reveal after save celebration.
-- Each row assigns a percentage weight to a sprite animation.
-- Sum of weights must be ≤ 100 (enforced at the API layer).
-- The remainder (100 - sum) = "nothing happens."

create table public.reveal_odds (
  id uuid primary key default gen_random_uuid(),
  animation_id text not null references sprite_animations(id) on delete cascade,
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  created_at timestamptz not null default now(),
  unique (animation_id)
);

alter table public.reveal_odds enable row level security;

create policy "Authenticated users can read reveal odds"
  on public.reveal_odds for select
  to authenticated using (true);

-- Audit log of creature encounters per user.
-- Tracks every reveal roll that produced a result (not "nothing").
-- first_encounter flag allows efficient compendium lookups later.

create table public.reveal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  animation_id text not null references sprite_animations(id) on delete cascade,
  creature_id text references badges(id) on delete set null,
  first_encounter boolean not null default false,
  created_at timestamptz not null default now()
);

create index reveal_log_user_id_idx on public.reveal_log (user_id);
create index reveal_log_user_creature_idx on public.reveal_log (user_id, creature_id);

alter table public.reveal_log enable row level security;

create policy "Users can read own reveal log"
  on public.reveal_log for select
  to authenticated using (auth.uid() = user_id);
