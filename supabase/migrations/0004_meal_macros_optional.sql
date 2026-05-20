-- Make meal macros optional on the template, and allow per-log overrides.
-- Effective macros for a (date, meal) = meals_log.* ?? meals.* ?? 0.

alter table public.meals
  alter column calories drop default,
  alter column calories drop not null,
  alter column protein  drop default,
  alter column protein  drop not null;

alter table public.meals_log
  add column if not exists calories numeric check (calories is null or calories >= 0),
  add column if not exists protein  numeric check (protein  is null or protein  >= 0);
