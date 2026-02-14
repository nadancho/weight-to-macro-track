-- Profiles: one row per auth user (id = auth.users.id)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Daily logs: one row per user per day
create table if not exists public.daily_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  weight numeric,
  carbs_g numeric,
  protein_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, date)
);

alter table public.daily_logs enable row level security;

create policy "Users can view own daily_logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily_logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily_logs"
  on public.daily_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily_logs"
  on public.daily_logs for delete
  using (auth.uid() = user_id);
