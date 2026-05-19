# Posture Tracker

Evidence-based posture correction + custom training tracker. Public, multi-user, end-to-end on Supabase.

- **Rehab presets** — locked, research-backed protocols (Sessions A/B/C + Gait foundation + Achilles HSR), readable by everyone, editable by nobody
- **Custom routines** — build your own rehab additions or gym splits
- **Shared calendar** — recurring weekly defaults + per-date overrides, rehab and gym side by side
- **Per-exercise logging** — sets / reps / load / RPE / notes per session, indexed for long-term progression analytics
- **Per-day habits** — five micro-exercises tracked daily
- **Stats** — current week %, weekly history, per-tag breakdown (UCS / APT / gait / strength), per-exercise load progression, habit streak
- **PWA** — installable, offline shell, network-first for HTML so deploys propagate

## Stack

| Layer       | Choice                                |
|-------------|---------------------------------------|
| Framework   | SvelteKit + `adapter-static`          |
| UI          | Svelte 5 (runes) + Tailwind CSS       |
| Auth        | Supabase Auth (email + password, PKCE flow, email confirmation required) |
| Data        | Supabase Postgres (normalized schema, row-level security tied to `auth.uid()`) |
| Hosting     | GitHub Pages (static)                 |
| Build       | Vite                                  |

Anon key only in the client. Row-Level Security gatekeeps every row by user_id. No service-role credentials anywhere on the frontend.

## Setup

### 1. Supabase project

Create a new project at [supabase.com](https://supabase.com). Open **SQL Editor** and run, in order:

1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) — schema, RLS policies, new-user trigger
2. [`supabase/migrations/0002_seed_presets.sql`](./supabase/migrations/0002_seed_presets.sql) — preset routines (Sessions A–E) and their exercises

Then in **Authentication → Providers → Email**:
- Enable **Confirm email**
- Set the **Site URL** to your deployed URL (`https://<user>.github.io/<repo>/`)
- Add a redirect URL: `https://<user>.github.io/<repo>/auth/callback`

Copy from **Project Settings → API**:
- **Project URL**
- **anon / public key**

### 2. GitHub secrets

In repo **Settings → Secrets and variables → Actions** add:

| Name                   | Value                |
|------------------------|----------------------|
| `SUPABASE_URL`         | the project URL      |
| `SUPABASE_ANON_KEY`    | the anon key         |

### 3. GitHub Pages

Repo → **Settings → Pages → Source → GitHub Actions**.

Push to `main`. The workflow builds with Vite, injects the public Supabase env, and deploys to Pages.

### 4. Local development

```bash
cp .env.example .env
# fill in PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Project structure

```
src/
  routes/
    +layout.svelte              auth gate + redirect logic
    auth/
      signin/+page.svelte
      signup/+page.svelte
      check-email/+page.svelte
      callback/+page.svelte     email-link landing
    app/
      +layout.svelte            tabs + header + sign-out
      today/+page.svelte
      calendar/+page.svelte     month grid + recurring editor
      rehab/+page.svelte        presets (locked) + custom rehab
      gym/+page.svelte          user-created gym routines
      stats/+page.svelte        per-tag, history, load progression
  lib/
    supabase.ts                 Supabase client
    types.ts
    date.ts
    data/
      habits.ts                 5 daily habits (hardcoded constants)
    stores/
      session.svelte.ts         auth user + profile
      data.svelte.ts            routines, schedule, logs, mutations
      toast.svelte.ts
    components/
      ExerciseRow.svelte        check + expand + log inputs
      HabitRow.svelte
      RoutinePicker.svelte      multi-select used by calendar
      RoutineEditor.svelte      create/edit/delete user routines + exercises
      Sheet.svelte              modal/bottom-sheet
      TagPill.svelte
      Toast.svelte
static/
  manifest.json
  icon.svg, icon-maskable.svg
  sw.js                         network-first service worker
supabase/migrations/
  0001_init.sql                 schema + RLS + new-user trigger
  0002_seed_presets.sql         preset routines + exercises
.github/workflows/deploy.yml    build + deploy
```

## Security

- All tables enforce `auth.uid() = user_id` via Row-Level Security
- Preset routines: readable by all authenticated users, writable by no one (no anon-key UPDATE/DELETE policy)
- Anon key is the only credential in the client; service-role key is never exposed
- HTTPS-enforced by GitHub Pages
- Content-Security-Policy meta tag restricts script/connect/img sources
- Auth flow uses PKCE; confirmation email required before first sign-in
- Password minimum: 8 characters (enforced client-side; Supabase enforces minimum independently)

## Data model

Designed for long-term scientific tracking — every set/rep/load is its own row, indexed for per-exercise time series queries.

```
profiles            (id, username)
routines            (id, user_id|null, is_preset, preset_code, name, category, tags[], position)
routine_exercises   (id, routine_id, position, name, dose, focus, cue, source, trackable, default_*, unit)
schedule            (user_id, date, routine_id, position)         per-date override
recurring           (user_id, day_of_week, routine_id, position)  weekly default
exercise_log        (user_id, date, routine_exercise_id, completed, sets, reps, load, rpe, notes, ts)
habits_log          (user_id, date, habit_id, completed)
```

Resolving routines for a date:
```
if any rows in schedule for (user_id, date) → use those
else                                          → use recurring rows for the day_of_week
```

## License

Personal project. No license granted.
