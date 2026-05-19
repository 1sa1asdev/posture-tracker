# Posture Tracker — Project Context

This file gives Claude Code full context on this project. Read it before making any changes.

---

## What this is

A public, multi-user posture correction + training tracker. Anyone can sign up (email + password,
email confirmation required) and get a private workspace backed by Supabase.

Two halves:
- **Rehab** — research-backed locked preset protocols (Sessions A/B/C/D/E) covering UCS, APT, and
  gait/Achilles. Users can also add their own rehab routines.
- **Gym** — fully user-defined routines (push/pull/legs, boxing conditioning, whatever) with the
  same logging primitives.

Both halves share a calendar with recurring weekly defaults + per-date overrides.

**Live URL:** `https://<user>.github.io/<repo>/`

---

## Stack & deployment

| Layer       | Choice                                |
|-------------|---------------------------------------|
| Framework   | SvelteKit + `adapter-static` (SPA)    |
| UI          | Svelte 5 (runes) + Tailwind           |
| Auth        | Supabase Auth (email + password, PKCE)|
| Data        | Supabase Postgres + Row-Level Security|
| Hosting     | GitHub Pages                          |
| Build       | Vite, GitHub Actions                  |

`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are read from env at build time via
`$env/static/public`. In CI they come from `secrets.SUPABASE_URL` / `secrets.SUPABASE_ANON_KEY`.
`BASE_PATH` is set to `/<repo>` in CI so SvelteKit emits correct asset/link paths for Pages.

Anon key is publishable. Row-Level Security is what protects user data — it must remain enabled
on every table and gate every row by `auth.uid() = user_id`.

---

## The person using this (Velli)

- Programmer, Stockholm. Daily stack: Next.js App Router, TypeScript, Drizzle ORM, Tailwind, server actions.
- Trains boxing + gym. Strong performance/optimization mindset — no hedging, confident advice.
- Built this tracker to address three linked physical issues discovered through research:

---

## The physical problems (all connected on the same kinetic chain)

### 1. Heel striking + poor load distribution
- Quad dominant gait, weak posterior chain, stiff ankles, poor proprioception
- Loughborough University 2025 (JSR): visual biofeedback-guided gait modification significantly
  reduces heel forces and increases forefoot load.

### 2. Hip sway (Trendelenburg pattern)
- Glute medius weakness → pelvic drop → lateral trunk lean → asymmetric Achilles load
- EMG: side plank abduction = 103% MVIC, single-leg squat = 82%, lateral step-up = 79–113%
  (PMC3201064, PMC6350668).

### 3. Achilles load tolerance
- Tendon not loaded through full range → loses stiffness
- Gold standard: Heavy Slow Resistance (HSR), Beyer et al., AJSM 2015 — HSR = eccentric for
  outcomes, higher patient satisfaction. 3×/week × 12 weeks, straight + bent-knee variants.

### 4. Elevated chest (Upper Crossed Syndrome / UCS)
- Tight/overactive: pec major, pec minor, upper trap, levator scapulae, SCM
- Weak/inhibited: serratus anterior, lower trap, middle trap, deep neck flexors
- Upper-chest breathing fires scalenes + upper trap thousands of times/hour, reinforcing UCS
  on every breath (RCT PMC12606979).
- Research base: PMC10583860 (2023 systematic review), PMC10454745 (2023 narrative review).

### 5. Anterior pelvic tilt (APT)
- Tight/overactive: iliopsoas, rectus femoris, TFL, lumbar erectors
- Weak/inhibited: glute max/med, deep core (TVA), hamstrings
- 2024 EMG (PMC10885056): combined rectus abdominis + oblique externus + glute max is the
  primary motor strategy for pelvic retroversion.
- RCT González-de-la-Flor et al., 2024: iliopsoas/RF/TFL stretching produced ~3.4° APT reduction.

---

## Preset routines (locked, server-side)

Stored in `routines` with `is_preset = true` and `preset_code` set. Seeded by
`supabase/migrations/0002_seed_presets.sql` — re-runnable, idempotent. RLS prohibits writes from
the client.

| Code      | Name                          | Focus  |
|-----------|-------------------------------|--------|
| `rehab_a` | Upper — chest & posture       | UCS    |
| `rehab_b` | Lower — pelvic tilt           | APT    |
| `rehab_c` | Integration & mobility        | both   |
| `rehab_d` | Gait foundation               | gait   |
| `rehab_e` | Achilles HSR & reactive       | gait   |

Each exercise carries: `name`, `dose`, `focus`, `cue` (how to do it), `source` (research citation),
`trackable` (whether to show load/reps inputs), default sets/reps/load, and `unit`.

Habits live in code: [src/lib/data/habits.ts](src/lib/data/habits.ts). Five stable ids (`chin_tuck`,
`blade_set`, `seated_ppt`, `standing_glute`, `belly_breath`). Tracked per-day in `habits_log`.

---

## Data flow

On sign-in, [src/lib/stores/data.svelte.ts](src/lib/stores/data.svelte.ts) `loadAll()` pulls every
table the user can see in parallel into `$state` runes. All UI reads off those reactive arrays.
Mutations call store methods, which optimistically update local state and then upsert to Supabase.
`syncState` ('idle' | 'pending' | 'ok' | 'error') is reflected by the header dot.

Resolving routines for a date:
1. If `schedule` has any rows for `(user_id, date)`, use those.
2. Otherwise, fall back to `recurring` rows for that `day_of_week`.

New users get a default recurring schedule (Mon/Wed/Fri/Sat = preset A/B/C/A) seeded by the
`handle_new_user` trigger.

---

## Routing

- `/` → auth-aware redirect (`/app/today` if signed in, otherwise `/auth/signin`)
- `/auth/{signin,signup,check-email,callback}` — public
- `/app/{today,calendar,rehab,gym,stats}` — auth-required (gated client-side)

This is a pure SPA (`ssr = false`, `prerender = false`, `fallback: '404.html'`). GitHub Pages serves
`404.html` for any unknown path; the client router takes over from there. `BASE_PATH` is critical —
without it on Pages, asset URLs break.

---

## Security model

- Every table has RLS enabled with `auth.uid() = user_id` policies (presets readable globally via
  `is_preset = true` policy clause)
- Anon key is the only credential in the client
- PKCE flow + email confirmation required on signup
- Username validated server-side via a regex check constraint (`^[a-z0-9_]+$`, 2–32 chars)
- CSP meta in `src/app.html` restricts script/connect/img sources

If you add a table, you **must** add RLS policies in the same migration. The schema's invariant is
"no row is accessible without an authenticated user owning it (or it being marked `is_preset`)."

---

## Improvements / extensions (not yet built)

- **Web Push notifications** for daily habits (needs VAPID + push server — different architecture)
- **Exercise substitution suggestions** based on equipment available
- **Body measurement tracking** (waist, posture photo angles, etc.) — would need a new table
- **Export** (CSV / JSON) of exercise_log for external analysis
- **Public progress sharing** (read-only username pages) — opt-in flag on profile
- **Social / friend system** — would need explicit relationship table + new RLS policies
