create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  color text not null default '#39ff14',
  customization text not null default 'flim',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progression jsonb not null default '{}'::jsonb,
  level_progress jsonb not null default '{}'::jsonb,
  score_profile jsonb not null default '{}'::jsonb,
  daily_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz not null default timezone('utc', now())
);

create trigger set_player_profiles_updated_at
before update on public.player_profiles
for each row
execute function public.set_updated_at();

create trigger set_player_progress_updated_at
before update on public.player_progress
for each row
execute function public.set_updated_at();

alter table public.player_profiles enable row level security;
alter table public.player_progress enable row level security;

create policy "player_profiles_select_own"
on public.player_profiles
for select
using (auth.uid() = user_id);

create policy "player_profiles_insert_own"
on public.player_profiles
for insert
with check (auth.uid() = user_id);

create policy "player_profiles_update_own"
on public.player_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "player_progress_select_own"
on public.player_progress
for select
using (auth.uid() = user_id);

create policy "player_progress_insert_own"
on public.player_progress
for insert
with check (auth.uid() = user_id);

create policy "player_progress_update_own"
on public.player_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
