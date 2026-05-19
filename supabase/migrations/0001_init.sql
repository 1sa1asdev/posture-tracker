-- Posture Tracker — initial schema
-- Apply via Supabase SQL Editor (or `supabase db push` if using the CLI).
-- All tables enforce row-level security keyed to auth.uid().

-- ─── extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (char_length(username) between 2 and 32
                                          and username ~ '^[a-z0-9_]+$'),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── routines ────────────────────────────────────────────────────────────────
-- Preset rows: user_id is null AND is_preset = true (readable by everyone).
-- User rows : user_id = auth.uid() AND is_preset = false.
create table if not exists public.routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  is_preset     boolean not null default false,
  preset_code   text unique,                  -- e.g. 'rehab_a', 'rehab_b' — null for user rows
  name          text not null check (char_length(name) between 1 and 80),
  category      text not null check (category in ('rehab','gym')),
  time_estimate text,
  tags          text[] not null default '{}',
  position      int    not null default 0,
  created_at    timestamptz not null default now(),
  constraint preset_xor_user check (
    (is_preset and user_id is null) or (not is_preset and user_id is not null)
  )
);

create index if not exists routines_user_idx    on public.routines(user_id);
create index if not exists routines_preset_idx  on public.routines(is_preset) where is_preset;

alter table public.routines enable row level security;

create policy "routines_select_visible"
  on public.routines for select
  using (is_preset or auth.uid() = user_id);

create policy "routines_insert_own"
  on public.routines for insert
  with check (not is_preset and auth.uid() = user_id);

create policy "routines_update_own"
  on public.routines for update
  using (not is_preset and auth.uid() = user_id)
  with check (not is_preset and auth.uid() = user_id);

create policy "routines_delete_own"
  on public.routines for delete
  using (not is_preset and auth.uid() = user_id);

-- ─── routine_exercises ───────────────────────────────────────────────────────
create table if not exists public.routine_exercises (
  id            uuid primary key default gen_random_uuid(),
  routine_id    uuid not null references public.routines(id) on delete cascade,
  position      int  not null,
  name          text not null check (char_length(name) between 1 and 120),
  dose          text,
  focus         text not null default 'mobility'
                check (focus in ('ucs','apt','gait','strength','mobility','both')),
  cue           text,
  source        text,
  trackable     boolean not null default false,
  default_sets  int,
  default_reps  int,
  default_load  numeric,
  unit          text default 'kg' check (unit in ('kg','lb','s','reps','bw')),
  unique(routine_id, position)
);

create index if not exists routine_exercises_routine_idx
  on public.routine_exercises(routine_id, position);

alter table public.routine_exercises enable row level security;

create policy "routine_exercises_select"
  on public.routine_exercises for select
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id
        and (r.is_preset or r.user_id = auth.uid())
    )
  );

create policy "routine_exercises_write_own"
  on public.routine_exercises for all
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id
        and not r.is_preset
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id
        and not r.is_preset
        and r.user_id = auth.uid()
    )
  );

-- ─── schedule (per-date overrides) ───────────────────────────────────────────
create table if not exists public.schedule (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  routine_id  uuid not null references public.routines(id) on delete cascade,
  position    int  not null default 0,
  unique(user_id, date, routine_id)
);

create index if not exists schedule_user_date_idx on public.schedule(user_id, date);

alter table public.schedule enable row level security;

create policy "schedule_own_all"
  on public.schedule for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── recurring (default weekly assignment) ───────────────────────────────────
create table if not exists public.recurring (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day_of_week   int  not null check (day_of_week between 0 and 6),  -- 0=Sun..6=Sat
  routine_id    uuid not null references public.routines(id) on delete cascade,
  position      int  not null default 0,
  unique(user_id, day_of_week, routine_id)
);

create index if not exists recurring_user_dow_idx on public.recurring(user_id, day_of_week);

alter table public.recurring enable row level security;

create policy "recurring_own_all"
  on public.recurring for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── exercise_log (the scientific dataset) ───────────────────────────────────
create table if not exists public.exercise_log (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  date                 date not null,
  routine_exercise_id  uuid not null references public.routine_exercises(id) on delete cascade,
  completed            boolean not null default true,
  sets                 int,
  reps                 int,
  load                 numeric,                 -- kg (or per `unit` on the exercise row)
  rpe                  numeric check (rpe between 0 and 10),
  notes                text,
  ts                   timestamptz not null default now(),
  unique(user_id, date, routine_exercise_id)
);

create index if not exists exercise_log_user_ex_date_idx
  on public.exercise_log(user_id, routine_exercise_id, date desc);
create index if not exists exercise_log_user_date_idx
  on public.exercise_log(user_id, date);

alter table public.exercise_log enable row level security;

create policy "exercise_log_own_all"
  on public.exercise_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── habits_log ──────────────────────────────────────────────────────────────
-- Habit ids are stable client-side constants; no separate habits table needed.
create table if not exists public.habits_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  habit_id    text not null check (char_length(habit_id) between 1 and 64),
  completed   boolean not null default true,
  unique(user_id, date, habit_id)
);

create index if not exists habits_log_user_date_idx on public.habits_log(user_id, date);

alter table public.habits_log enable row level security;

create policy "habits_log_own_all"
  on public.habits_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── username availability check (callable by anyone) ───────────────────────
-- Avoids leaking the full profiles table to anon while still enabling client-side
-- uniqueness pre-checks during signup.
create or replace function public.username_available(p text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(p))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ─── new-user bootstrap trigger ──────────────────────────────────────────────
-- On auth.users insert, create a profile row with a fallback username.
-- Client should immediately update with the chosen username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username',
                          'user_' || substr(new.id::text, 1, 8)));
  insert into public.profiles (id, username)
    values (new.id, uname)
    on conflict (id) do nothing;
  -- Seed default recurring schedule (Mon/Wed/Fri/Sat = preset A/B/C/A)
  insert into public.recurring (user_id, day_of_week, routine_id)
    select new.id, dow, r.id
      from (values (1,'rehab_a'),(3,'rehab_b'),(5,'rehab_c'),(6,'rehab_a')) as v(dow, code)
      join public.routines r on r.preset_code = v.code
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
