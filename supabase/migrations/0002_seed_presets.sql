-- Seed preset rehab routines + their exercises.
-- Idempotent: presets are keyed by preset_code; re-running the migration is safe.
-- Sources cite the research backing each exercise (PMC / RCT / EMG study where applicable).

-- ─── helper: upsert preset routine + exercises ───────────────────────────────
create or replace function public._seed_preset(
  p_code        text,
  p_name        text,
  p_category    text,
  p_time        text,
  p_tags        text[],
  p_position    int,
  p_exercises   jsonb        -- [{ position, name, dose, focus, cue, source, trackable, default_sets, default_reps, default_load, unit }]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routine_id uuid;
  v_ex         jsonb;
begin
  insert into public.routines (is_preset, preset_code, name, category, time_estimate, tags, position)
    values (true, p_code, p_name, p_category, p_time, p_tags, p_position)
    on conflict (preset_code) do update
      set name = excluded.name,
          category = excluded.category,
          time_estimate = excluded.time_estimate,
          tags = excluded.tags,
          position = excluded.position
    returning id into v_routine_id;

  -- wipe and re-seed exercises (cleanest path for evolving cue/source text)
  delete from public.routine_exercises where routine_id = v_routine_id;

  for v_ex in select * from jsonb_array_elements(p_exercises) loop
    insert into public.routine_exercises (
      routine_id, position, name, dose, focus, cue, source,
      trackable, default_sets, default_reps, default_load, unit
    ) values (
      v_routine_id,
      (v_ex->>'position')::int,
      v_ex->>'name',
      v_ex->>'dose',
      coalesce(v_ex->>'focus','mobility'),
      v_ex->>'cue',
      v_ex->>'source',
      coalesce((v_ex->>'trackable')::boolean, false),
      nullif(v_ex->>'default_sets','')::int,
      nullif(v_ex->>'default_reps','')::int,
      nullif(v_ex->>'default_load','')::numeric,
      coalesce(v_ex->>'unit','kg')
    );
  end loop;
end;
$$;

-- ─── A — Upper / chest & posture ─────────────────────────────────────────────
select public._seed_preset(
  'rehab_a',
  'Upper — chest & posture',
  'rehab',
  '12–15 min',
  array['rehab','ucs'],
  0,
  $j$[
    {"position":0,"name":"Wall angel","dose":"3 × 10, slow","focus":"ucs","cue":"Stand with full back contact on wall, feet 6cm out. Slide arms up — elbows and wrists must stay in contact the whole time. If they lift off, shorten the range. Goal is thoracic extension + lower trap activation, not arm height.","source":"JOSPT wall slide study: highest serratus anterior activation above 90° humeral elevation. UCS systematic review (PMC10454745, 2023) confirms scapular stabilization exercises improve postural alignment."},
    {"position":1,"name":"Serratus wall slide","dose":"3 × 12","focus":"ucs","cue":"Hands on wall, arms extended at shoulder height. Without bending elbows, reach shoulder blades forward (protract) — thoracic spine slightly rounds. Hold 2s at end range. Serratus anterior is the sole mover here, not the arms.","source":"JOSPT wall slide study: serratus anterior activation is highest during wall slide above 90° elevation vs traditional push-up plus."},
    {"position":2,"name":"Y–T–W prone","dose":"3 × 10 each shape","focus":"ucs","cue":"Lie face down, arms overhead. Y = thumbs up, lift to Y shape. T = arms straight out to sides. W = elbows bent 90°, squeeze blades. All done slowly with no neck tension. Directly targets lower and middle trapezius.","source":"UCS systematic review (PMC10583860, 2023): lower/middle trap targeting showed significant improvement in scapular alignment and UCS postural correction."},
    {"position":3,"name":"Chin tuck hold","dose":"3 × 8, 5s hold","focus":"ucs","cue":"Lie on your back. Pull chin straight back — not down. Lift head 2cm off floor, hold 5s. Deep neck flexors only. No jaw jut, no mouth opening. The most neglected UCS exercise.","source":"UCS treatment review (PMC10454745, 2023): deep neck flexor strengthening is the primary target due to SCM overactivation compensating for weak DNFs."},
    {"position":4,"name":"Doorframe pec stretch","dose":"2 × 45s each side","focus":"ucs","cue":"Elbow at 90°, forearm on doorframe. Step through slowly. Feel it in the lower front chest (pec minor), not the shoulder. If you feel shoulder impingement, drop arm angle to 70°. Pec minor restriction directly limits scapular posterior tilt.","source":"Tight pec minor limits scapular upward rotation and posterior tilt — a primary structural driver of elevated chest posture (Physiopedia UCS)."}
  ]$j$::jsonb
);

-- ─── B — Lower / pelvic tilt ─────────────────────────────────────────────────
select public._seed_preset(
  'rehab_b',
  'Lower — pelvic tilt',
  'rehab',
  '12–15 min',
  array['rehab','apt'],
  1,
  $j$[
    {"position":0,"name":"90/90 hip flexor stretch","dose":"3 × 60s each side","focus":"apt","cue":"Kneeling lunge, back knee on floor. Squeeze the back leg glute FIRST (this tilts the pelvis back), then lean your torso forward without arching the back. Without the glute squeeze you just compress the lumbar spine instead of stretching the iliopsoas.","source":"APT RCT (González-de-la-Flor et al., 2024): iliopsoas/rectus femoris/TFL stretching produced ~3.4° APT reduction. EMG confirmed glute max co-activation required for pelvic retroversion during stretch."},
    {"position":1,"name":"Dead bug","dose":"3 × 8 each side, 3s lower","focus":"apt","cue":"Lie on back, arms vertical, knees at 90°. Press lower back INTO the floor — no gap at all. Slowly lower one arm overhead + opposite leg toward floor for 3s. If your back lifts: you have gone too far.","source":"Dead bug trains transversus abdominis and deep stabilizers with lumbar spine in neutral — directly antagonizes the APT pattern. NASM EMG study (PLOS ONE, 2024) confirmed gluteal + core co-activation."},
    {"position":2,"name":"Glute bridge + posterior tilt","dose":"3 × 12, 2s hold","focus":"apt","cue":"Bridge up, but at the top tuck your pelvis (flatten your lower back) BEFORE lowering. Focus on glutes not hamstrings — if you feel hamstring cramp, feet are too far forward. The posterior tilt at the top is the actual corrective movement.","source":"EMG study (PMC10885056, 2024): glute max showed the strongest correlation with pelvic retroversion during bridge. NASM EMG confirmed glute max activation is most specific to APT correction."},
    {"position":3,"name":"Prone RF stretch","dose":"2 × 45s each side","focus":"apt","cue":"Lie on stomach, pull one foot toward your glute. Add posterior tilt by squeezing the opposite glute. The rectus femoris crosses both hip and knee — standing quad stretches miss the hip flexor component. Prone position hits both.","source":"APT literature confirms rectus femoris as a primary driver of anterior tilt separate from the iliopsoas (TPM review, 2025)."},
    {"position":4,"name":"Bird dog","dose":"3 × 8 each side, 4s hold","focus":"both","cue":"All fours, neutral spine — no sagging, no arching. Extend one arm and opposite leg simultaneously. Keep hips LEVEL, do not let the extending hip drop or rotate. Hold 4s. Pelvic stability is the goal, not limb height.","source":"Bird dog activates erector spinae + multifidus symmetrically while forcing glute max and contralateral lat — trains muscle coordination needed for neutral pelvis during gait."}
  ]$j$::jsonb
);

-- ─── C — Integration & mobility ──────────────────────────────────────────────
select public._seed_preset(
  'rehab_c',
  'Integration & mobility',
  'rehab',
  '10–12 min',
  array['rehab','both'],
  2,
  $j$[
    {"position":0,"name":"Cat–camel","dose":"2 × 10 slow cycles","focus":"both","cue":"Full thoracic flexion → full extension, segmentally. Move ONE vertebra at a time from the sacrum upward. The camel (extension) phase mobilises thoracic extension and requires the lumbar spine to find neutral. This is motor control, not just stretching.","source":"Cat–camel included in all evidence-based thoracic kyphosis correction protocols reviewed (PMC10148263, 2023 feasibility study)."},
    {"position":1,"name":"Thoracic extension on roller","dose":"2 × 8 segments, 30s each","focus":"ucs","cue":"Sit in front of foam roller, support your head. Lean back so roller is at mid-thoracic (between shoulder blades — NOT lower back). Let your head drop back with control. Shift roller up 2cm after each hold.","source":"Thoracic extension exercises targeting T4–T8 are central to UCS correction. Overhead arm wall slide and thoracic extension improve scapular alignment associated with spine alignment (PMC10148263)."},
    {"position":2,"name":"Posterior pelvic tilt hold","dose":"5 × 10s standing","focus":"apt","cue":"Stand against wall. Contract abs and glutes simultaneously to flatten your lower back against it. No breath holding. This is the neutral posture you are working toward making automatic. Practice 10× per day whenever standing.","source":"2024 EMG study (PMC10885056): combined rectus abdominis + oblique externus + glute max is the most effective motor pattern for pelvic retroversion."},
    {"position":3,"name":"Wall angel + belly breath","dose":"3 × 5 breaths in position","focus":"both","cue":"Get into wall angel position, hold it. Instead of moving arms, breathe into your belly and lateral ribs — not upper chest. Upper chest breathing fires scalenes and upper trap on every single breath, reinforcing UCS all day.","source":"RCT (PMC12606979): respiratory exercises added to scapular stabilization reduced upper trap activation and increased serratus anterior + lower trap activation vs exercise alone."},
    {"position":4,"name":"Prone cobra","dose":"3 × 8, 3s hold","focus":"ucs","cue":"Lie face down, arms at sides, palms down. Lift head, chest, and hands by squeezing shoulder blades DOWN and back — not up toward ears. Thumbs rotate toward ceiling. Lower trap + rhomboids + mid trap all activated.","source":"Comprehensive kyphosis correction programs (PMC9778671) include prone extension for spinal extensor strengthening — demonstrated reduction in kyphosis angle in 8-week RCTs."}
  ]$j$::jsonb
);

-- ─── D — Gait foundation (lower body strength + hip stability) ──────────────
select public._seed_preset(
  'rehab_d',
  'Gait foundation',
  'rehab',
  '15–18 min',
  array['rehab','gait'],
  3,
  $j$[
    {"position":0,"name":"Copenhagen plank","dose":"3 × 20–30s each side","focus":"gait","cue":"Side plank with top leg supported on a bench at knee height. Drive the inner thigh down into the bench while holding side plank. Adductor + groin stabilization — also strongly activates glute medius on the support side.","source":"Copenhagen adduction protocol RCT (Bjordal et al., AJSM): high adductor longus activation + measurable reduction in groin injury incidence. Glute med co-activation documented at 60–80% MVIC."},
    {"position":1,"name":"Clamshells with band","dose":"3 × 15, 3s up / 3s down","focus":"gait","cue":"Side-lying, knees bent, band above knees. SLOW reps target glute medius; fast reps recruit TFL. Stack hips — do NOT roll backward as you open. Hand on top hip to feel for any rocking.","source":"EMG (PMC3201064, 2011): clamshell at moderate band tension reaches 38–58% MVIC of glute medius. Hip external rotation control is the primary Trendelenburg corrective."},
    {"position":2,"name":"Short foot exercise","dose":"2 × 60s each foot","focus":"gait","cue":"Seated, foot flat. Without curling toes, draw the ball of the foot toward the heel — the arch should rise. Intrinsic foot muscles only. Critical for foot proprioception and arch control during ground contact phase of gait.","source":"Intrinsic foot strengthening RCTs (JOSPT 2015): improved navicular drop + dynamic arch control in runners with overpronation patterns."},
    {"position":3,"name":"Single-leg RDL with pause","dose":"4 × 8 each","focus":"gait","cue":"Stand on one leg, hinge from hip with neutral spine. Pause 2s at bottom (hands near floor). Drives single-leg posterior chain + hip stability. Hip of the standing leg must NOT drop. Add load (kettlebell) once bodyweight is controlled.","source":"Single-leg RDL targets the same lateral hip stabilizers (glute med) that fail in Trendelenburg gait. EMG: 79–113% MVIC for lateral step variants (PMC6350668).","trackable":true,"default_sets":4,"default_reps":8,"unit":"kg"},
    {"position":4,"name":"Lateral band walk","dose":"3 × 15 each direction","focus":"gait","cue":"Band above knees, athletic stance, knees tracking over toes. Step laterally 15 steps without the knees collapsing in or the upper body swaying. Slow and controlled — the goal is glute med endurance, not speed.","source":"Lateral band walking is among the highest-EMG glute med exercises (PMC6350668) and reproduces the frontal-plane control demand of gait."},
    {"position":5,"name":"Step-down eccentric","dose":"4 × 10 each leg","focus":"gait","cue":"Stand on a step. Lower the opposite heel SLOWLY (3s) until it just touches floor. Knee must track over toes — no inward collapse. Hip of standing leg stays level. Most direct transfer to heel-strike correction.","source":"Step-down eccentric: 79% MVIC glute med (PMC6350668). Targets the exact phase of gait (single-leg loading) where Trendelenburg compensation occurs.","trackable":true,"default_sets":4,"default_reps":10,"unit":"reps"},
    {"position":6,"name":"Tibialis anterior raises","dose":"3 × 20","focus":"gait","cue":"Heels on a small plate, balls of feet on floor. Lift the forefoot toward shin. Strengthens dorsiflexor — directly counteracts the foot slap / heel strike pattern. Add load (plate on shoe) when bodyweight is easy.","source":"Tibialis anterior weakness is associated with reduced ankle dorsiflexion control during foot strike. Strengthening improves gait kinetics in heel-strike-dominant runners (JSR 2025, Loughborough).","trackable":true,"default_sets":3,"default_reps":20,"unit":"reps"}
  ]$j$::jsonb
);

-- ─── E — Achilles HSR & reactive ─────────────────────────────────────────────
select public._seed_preset(
  'rehab_e',
  'Achilles HSR & reactive',
  'rehab',
  '12–15 min',
  array['rehab','gait'],
  4,
  $j$[
    {"position":0,"name":"Alfredson eccentric heel drop","dose":"3 × 15 each, bilateral up / unilateral down","focus":"gait","cue":"Stand on a step, balls of feet, heels off edge. Raise on BOTH legs, then transfer to one leg and lower SLOWLY (3s) below step level. Eccentric loading is the active ingredient. Mild discomfort is expected; sharp pain stops the set.","source":"Alfredson eccentric protocol: original RCT showed significant tendon remodelling + pain reduction. Modern HSR (Beyer et al., AJSM 2015) showed equivalence with higher satisfaction.","trackable":true,"default_sets":3,"default_reps":15,"unit":"reps"},
    {"position":1,"name":"HSR calf raise — straight leg","dose":"4 × 6, 3s up / 3s down","focus":"gait","cue":"Standing calf raise (gastrocnemius dominant). 3s up, 1s hold, 3s down. Load progressively — start at bodyweight + small dumbbell, add weight weekly. Failure should be around rep 6–8.","source":"Heavy Slow Resistance protocol (Beyer et al., AJSM 2015): HSR = eccentric for outcomes, higher patient satisfaction. 3×/week × 12 weeks builds tendon stiffness.","trackable":true,"default_sets":4,"default_reps":6,"unit":"kg"},
    {"position":2,"name":"HSR calf raise — bent knee","dose":"4 × 6, 3s up / 3s down","focus":"gait","cue":"Seated calf raise OR standing with knee bent 30° (soleus dominant). Same tempo as straight-leg. Soleus is the dominant calf muscle in walking gait — straight-leg variants only target gastrocnemius.","source":"HSR protocol requires both bent-knee (soleus) and straight-leg (gastroc) variants to load the full Achilles complex (Beyer et al., 2015).","trackable":true,"default_sets":4,"default_reps":6,"unit":"kg"},
    {"position":3,"name":"Pogo jumps","dose":"3 × 10s (week 5+ only)","focus":"gait","cue":"Stand tall, jump straight up using ANKLES ONLY — knees stay nearly locked, hips minimal. Reactive, fast contacts. Stiff ankle = elastic Achilles loading. Skip this entirely until weeks 5+ of HSR adaptation.","source":"Reactive plyometrics restore Achilles elastic recoil after HSR baseline tendon stiffness is established. Premature plyometrics increase rerupture risk."},
    {"position":4,"name":"Single-leg ankle hops","dose":"3 × 10 each leg","focus":"gait","cue":"Once pogos feel easy: hop on one leg, ankle-only, minimal knee bend. 10 contacts per leg. This is the most gait-specific reactive drill — single-leg ground contact with elastic Achilles return.","source":"Single-leg reactive drills bridge HSR strength → functional gait propulsion. Progression criterion: pain-free, controlled bilateral pogos first."}
  ]$j$::jsonb
);

-- _seed_preset only needed for migration — drop it so it can't be re-called from API.
drop function public._seed_preset(text, text, text, text, text[], int, jsonb);
