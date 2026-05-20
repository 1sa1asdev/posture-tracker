-- Posture Tracker — diet & supplements module.
-- Apply after 0001/0002. Idempotent; safe to re-run.

-- ─── meals (user's standard daily diet template) ─────────────────────────────
create table if not exists public.meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 60),
  calories  numeric not null default 0 check (calories  >= 0),
  protein   numeric not null default 0 check (protein   >= 0),
  position  int     not null default 0
);

create index if not exists meals_user_idx on public.meals(user_id, position);

alter table public.meals enable row level security;

drop policy if exists "meals_own_all" on public.meals;
create policy "meals_own_all" on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── supplements (user-defined: protein powder, vit D, creatine, etc.) ──────
-- `per_unit_*` describe one unit (pill / scoop / ml). Totals are derived at read
-- time as amount × per_unit_*. Long-term tracking happens via supplements_log.amount.
create table if not exists public.supplements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 60),
  unit               text not null default 'pill'
                     check (unit in ('pill','capsule','scoop','tablet','gummy','ml','g')),
  per_unit_protein   numeric not null default 0 check (per_unit_protein  >= 0),
  per_unit_calories  numeric not null default 0 check (per_unit_calories >= 0),
  per_unit_amount    numeric,                    -- e.g. 1000 (IU), 5 (g creatine)
  per_unit_label     text,                       -- 'IU','mg','mcg','g'
  daily_target       numeric not null default 1 check (daily_target >= 0),
  position           int     not null default 0
);

create index if not exists supplements_user_idx on public.supplements(user_id, position);

alter table public.supplements enable row level security;

drop policy if exists "supplements_own_all" on public.supplements;
create policy "supplements_own_all" on public.supplements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── diet_settings (daily targets) ───────────────────────────────────────────
create table if not exists public.diet_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  calorie_target   numeric,
  protein_target   numeric,
  water_target_ml  int not null default 3000 check (water_target_ml >= 0)
);

alter table public.diet_settings enable row level security;

drop policy if exists "diet_settings_own_all" on public.diet_settings;
create policy "diet_settings_own_all" on public.diet_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── meals_log ───────────────────────────────────────────────────────────────
create table if not exists public.meals_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  meal_id    uuid not null references public.meals(id) on delete cascade,
  completed  boolean not null default true,
  unique(user_id, date, meal_id)
);

create index if not exists meals_log_user_date_idx on public.meals_log(user_id, date);

alter table public.meals_log enable row level security;

drop policy if exists "meals_log_own_all" on public.meals_log;
create policy "meals_log_own_all" on public.meals_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── supplements_log ─────────────────────────────────────────────────────────
create table if not exists public.supplements_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  supplement_id  uuid not null references public.supplements(id) on delete cascade,
  amount         numeric not null default 0 check (amount >= 0),
  unique(user_id, date, supplement_id)
);

create index if not exists supplements_log_user_date_idx on public.supplements_log(user_id, date);
create index if not exists supplements_log_user_supp_date_idx
  on public.supplements_log(user_id, supplement_id, date desc);

alter table public.supplements_log enable row level security;

drop policy if exists "supplements_log_own_all" on public.supplements_log;
create policy "supplements_log_own_all" on public.supplements_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── water_log (one row per (user, date)) ────────────────────────────────────
create table if not exists public.water_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  amount_ml  int  not null default 0 check (amount_ml >= 0),
  unique(user_id, date)
);

create index if not exists water_log_user_date_idx on public.water_log(user_id, date);

alter table public.water_log enable row level security;

drop policy if exists "water_log_own_all" on public.water_log;
create policy "water_log_own_all" on public.water_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── auto-create diet_settings on signup ─────────────────────────────────────
create or replace function public.handle_new_user_diet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.diet_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_diet on auth.users;
create trigger on_auth_user_created_diet
  after insert on auth.users
  for each row execute function public.handle_new_user_diet();

-- Backfill existing users so the app doesn't 404 on missing settings rows.
insert into public.diet_settings (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;
