-- Create a profile row whenever a new auth user is created (trigger).
-- Also backfill profiles for any existing auth users that don't have one.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill: ensure every existing auth user has a profile.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
