# Posture Tracker — Project Context

This file gives Claude Code full context on this project. Read it before making any changes.

---

## What this is

A personal posture correction web app hosted on GitHub Pages. Single HTML file, no framework, no build step beyond the GitHub Actions secret injection. Syncs to Supabase so data persists across devices.

**Live URL:** `https://<username>.github.io/posture-tracker/`

---

## The person using this (Velli)

- Programmer, Stockholm. Stack: Next.js App Router, TypeScript, Drizzle ORM, Tailwind, server actions.
- Trains boxing + gym. Strong performance/optimization mindset — no hedging, confident advice.
- Built this tracker to address three linked physical issues discovered through research:

---

## The physical problems (all connected on the same kinetic chain)

### 1. Heel striking + poor load distribution
- Quad dominant gait, weak posterior chain, stiff ankles, poor proprioception
- Research: Loughborough University 2025 (JSR) — visual biofeedback-guided gait modification significantly reduces heel forces and increases forefoot load

### 2. Hip sway (Trendelenburg pattern)
- Root cause: glute medius weakness → pelvic drop on stance side → lateral trunk lean to compensate
- EMG research: Side plank abduction = 103% MVIC (highest), single-leg squat = 82% MVIC, lateral step-up = 79–113% MVIC (PMC3201064, PMC6350668)
- The full chain: weak glute med → hip sway → asymmetric ankle/Achilles load → compensatory heel strike → Achilles never loads elastically → tendon loses stiffness

### 3. Achilles load tolerance
- Tendon not being loaded through full range → loses stiffness, becomes reactive
- Gold standard: Heavy Slow Resistance (HSR) protocol — RCT (Beyer et al., AJSM 2015, PMC) showed HSR = eccentric training for outcomes, higher patient satisfaction
- Protocol: 3×/week, 12 weeks, straight-leg + bent-knee variants, progressive overload

### 4. Elevated chest (Upper Crossed Syndrome / UCS)
- Tight/overactive: pec major, pec minor, upper trap, levator scapulae, SCM
- Weak/inhibited: serratus anterior, lower trap, middle trap, deep neck flexors
- Key finding: upper chest breathing fires scalenes + upper trap thousands of times/hour, reinforcing UCS on every breath (RCT PMC12606979)
- Research base: PMC10583860 (2023 systematic review), PMC10454745 (2023 narrative review)

### 5. Anterior pelvic tilt (APT)
- Tight/overactive: iliopsoas, rectus femoris, TFL, lumbar erectors
- Weak/inhibited: glute max/med, deep core (transversus abdominis), hamstrings
- Key finding: combined rectus abdominis + oblique externus + glute max activation is the primary motor strategy for pelvic retroversion (EMG study PMC10885056, 2024)
- RCT: iliopsoas/RF/TFL stretching produced ~3.4° APT reduction (González-de-la-Flor et al., 2024)

---

## The exercise protocol

The app tracks this exact weekly schedule:

### Session A — Upper / chest & posture (Mon + Sat, 12–15 min)
1. **Wall angel** — 3×10 slow. Back flat on wall, slide arms up while keeping elbows+wrists in contact. Thoracic extension + lower trap.
2. **Serratus wall slide** — 3×12. Hands on wall, protract shoulder blades without bending elbows. Serratus anterior isolation.
3. **Y–T–W prone** — 3×10 each. Face down, hit Y/T/W positions slowly. Lower + middle trap.
4. **Chin tuck hold** — 3×8, 5s hold. Supine, chin straight back, head 2cm off floor. Deep neck flexors.
5. **Doorframe pec stretch** — 2×45s each side. Elbow 90°, feel it in pec minor not shoulder.

### Session B — Lower / pelvic tilt (Wed, 12–15 min)
1. **90/90 hip flexor stretch** — 3×60s each side. Kneeling lunge. Squeeze back glute FIRST to posteriorly tilt pelvis, then lean forward. Without the glute squeeze it's just lumbar compression.
2. **Dead bug** — 3×8 each side, 3s lower. Lower back pressed INTO floor throughout. Gold standard deep core for APT.
3. **Glute bridge + posterior tilt** — 3×12, 2s hold. At top, tuck pelvis (flatten back) before lowering. The tilt is the corrective movement, not the height.
4. **Prone RF stretch** — 2×45s each side. Face down, foot to glute + squeeze opposite glute. Hits both hip flexor and quad portions of rectus femoris.
5. **Bird dog** — 3×8 each side, 4s hold. Hips LEVEL throughout. Pelvis stability, not limb height.

### Session C — Integration & mobility (Fri, 10–12 min)
1. **Cat–camel** — 2×10 slow cycles. Segmental, one vertebra at a time from sacrum upward.
2. **Thoracic extension on roller** — 2×8 segments, 30s each. Mid-thoracic only (T4–T8), NOT lumbar.
3. **Posterior pelvic tilt hold** — 5×10s standing against wall. Abs + glutes simultaneously flatten lower back against wall.
4. **Wall angel + belly breath** — 3×5 breaths. Hold wall angel position, breathe into belly and lateral ribs only. No upper chest movement.
5. **Prone cobra** — 3×8, 3s hold. Blades DOWN and back, not up toward ears. Thumbs to ceiling.

### Daily habits (every day, throughout the day)
1. **Chin tuck** — 5 reps × 3s every 30 min seated
2. **Shoulder blade set** — 10 reps × 5s, blades together AND down
3. **Seated posterior tilt** — 10 reps × 5s every time you sit down
4. **Standing glute squeeze** — 10s × 5 per hour standing
5. **Diaphragmatic breathing reset** — 5 breaths any time, belly only

---

## App architecture

```
posture-tracker/
├── index.html                    # Entire app — HTML + CSS + JS, no dependencies
├── .github/
│   └── workflows/
│       └── deploy.yml            # Injects secrets, deploys to GitHub Pages
└── README.md
```

### Credential injection (important)
`index.html` contains three placeholder strings that GitHub Actions replaces at deploy time:
- `__SUPABASE_URL__` → `secrets.SUPABASE_URL`
- `__SUPABASE_KEY__` → `secrets.SUPABASE_KEY`
- `__USER_ID__`      → `secrets.POSTURE_USER_ID`

**Never hardcode real credentials in index.html.** They only exist in GitHub Secrets and the deployed file (which is never committed).

### Data layer
- **Supabase** (Postgres, free tier) — single table `posture_data`, one row per user_id, data stored as JSONB
- **localStorage** — offline cache, syncs to Supabase within 600ms of any change
- **State shape:**
  ```js
  {
    checked: { 'Mon_0': true, 'habit_2': false, ... },
    weekKey: '2026-05-18',   // ISO Monday date of current week
    history: [{ week: '2026-05-11', pct: 85 }, ...],  // last 10 weeks
    streak: 3                // consecutive weeks >= 70%
  }
  ```

### Week rollover
On load, the app compares the current week's Monday date to `data.weekKey`. If different (new week), it archives the previous week to `history`, increments `streak` if pct ≥ 70, resets `checked`, and updates `weekKey`.

### Supabase table (must be created manually by user)
```sql
CREATE TABLE posture_data (
  user_id    TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE posture_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON posture_data
  FOR ALL USING (true) WITH CHECK (true);
```

---

## Design system

Dark theme. No external dependencies.

```css
--bg: #0c0c0c          /* page background */
--surface: #161616     /* card background */
--teal: #1D9E75        /* UCS / chest exercises, sync OK, progress */
--coral: #D85A30       /* APT / pelvis exercises */
--amber: #BA7517       /* streak, Session C, partial completion */
--red: #e24b4a         /* errors */
```

Exercises tagged: `ucs` (chest/posture) → teal, `apt` (pelvis) → coral, `both` → neutral.

---

## What could be improved / extended

- **Notifications** — Web Push API or a simple reminder mechanism to prompt daily habits
- **Notes per session** — free text field to log how each session felt
- **Exercise substitutions** — swap exercises for equipment-free alternatives
- **Gait tracking tab** — separate section for the heel strike / Achilles / hip sway protocol from earlier in the conversation (those exercises are NOT currently in the app — only the UCS + APT ones are tracked)
- **Progressive overload log** — for the Achilles HSR protocol specifically, tracking load week by week
- **Dark/light toggle** — currently dark only
- **PWA manifest** — add `manifest.json` and service worker for proper home screen install

---

## The broader exercise context (not yet in app)

The conversation also covered a full evidence-based protocol for the gait issues. If adding a second tracker or tab:

**Gait / lower body protocol:**
- Copenhagen plank — 3×20–30s (adductor + groin stabilization)
- Clamshells with band — 3×15, 3s up/down (slow = glute med, fast = TFL)
- Short foot exercise — 2×60s (intrinsic foot muscles, arch control)
- Single-leg RDL with pause — 4×8 each
- Lateral band walk — 3×15 each direction
- Step-down eccentric — 4×10 each (most direct heel strike transfer)
- Tibialis anterior raises — 3×20 (heels on plate, lift forefoot)
- Alfredson eccentric heel drop — 3×15 each, bilateral up/unilateral down on step edge
- HSR calf raises — 4×6, 3s up/3s down, both straight-leg and bent-knee variants
- Pogo jumps (week 5+ only) — 3×10s, stiff ankles, reactive
- Single-leg ankle hops — once pogos are easy

**Gait retraining:**
- Metronome walking at 170–180 bpm
- Barefoot walking on soft surfaces daily (10 min)
- Forward lean from ankle drill ("fall" from ankle, not waist)
