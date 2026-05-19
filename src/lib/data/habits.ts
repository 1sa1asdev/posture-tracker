import type { Habit } from '$lib/types';

// Habit ids are stable forever — they're keys in habits_log.
export const HABITS: Habit[] = [
  {
    id: 'chin_tuck',
    name: 'Chin tuck',
    dose: '5 reps × 3s — every 30 min seated',
    focus: 'ucs',
    cue: 'Pull chin straight back (not down), double chin. Hold 3s. Do every time you notice your head drifting forward. High-frequency low-load practice beats infrequent heavy loading for postural motor reprogramming.',
    source: 'DNF weakness is the primary cervical finding in UCS. Frequent sub-maximal activation is more effective for postural motor learning.'
  },
  {
    id: 'blade_set',
    name: 'Shoulder blade set',
    dose: '10 reps × 5s — any position',
    focus: 'ucs',
    cue: 'Squeeze shoulder blades together AND pull them DOWN away from your ears simultaneously. Hold 5s. Fires lower and middle trap — directly counteracting the forward/elevated shoulder position you default to all day.',
    source: 'Scapular setting targeting middle + lower trap is a primary daily intervention in all UCS treatment programs (PMC10583860, 2023).'
  },
  {
    id: 'seated_ppt',
    name: 'Seated posterior tilt',
    dose: '10 reps × 5s — when you sit down',
    focus: 'apt',
    cue: 'Sitting: tilt your pelvis backward so your lower back presses into the chair. Hold 5s. Contracts abs and glutes against the hip flexors dominating your sitting posture. Do this every time you take a seat.',
    source: 'Seated posterior pelvic tilt is the primary habit intervention for APT. Daily habit frequency is critical for corrective exercise outcomes (McGill; Kendall).'
  },
  {
    id: 'standing_glute',
    name: 'Standing glute squeeze',
    dose: '10s × 5 per hour standing',
    focus: 'apt',
    cue: 'Whenever standing: squeeze both glutes hard for 10s. Posteriorly tilts the pelvis and inhibits the overactive hip flexors simultaneously. Even 5× per day produces measurable glute activation change over weeks.',
    source: 'Gluteal amnesia (Janda) is a primary mechanism in APT. Low-intensity frequent glute max activation has a cumulative neuromuscular effect on pelvic position.'
  },
  {
    id: 'belly_breath',
    name: 'Diaphragmatic breathing reset',
    dose: '5 slow breaths — any time',
    focus: 'both',
    cue: 'One hand on belly, one on chest. Breathe so only the belly hand moves. 4s in (belly + lateral ribs), 6s out. Upper chest breathing fires scalenes and upper trap thousands of times per hour — reinforcing UCS on every single breath.',
    source: 'RCT (PMC12606979): respiratory exercise integration showed EMG-confirmed reduction in upper trap activity and increased serratus anterior activation vs exercise alone.'
  }
];

export const HABIT_BY_ID: Record<string, Habit> =
  Object.fromEntries(HABITS.map((h) => [h.id, h]));
