export type Focus = 'ucs' | 'apt' | 'gait' | 'strength' | 'mobility' | 'both';
export type Category = 'rehab' | 'gym';
export type Unit = 'kg' | 'lb' | 's' | 'reps' | 'bw';

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string | null;
  is_preset: boolean;
  preset_code: string | null;
  name: string;
  category: Category;
  time_estimate: string | null;
  tags: string[];
  position: number;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  position: number;
  name: string;
  dose: string | null;
  focus: Focus;
  cue: string | null;
  source: string | null;
  trackable: boolean;
  default_sets: number | null;
  default_reps: number | null;
  default_load: number | null;
  unit: Unit;
}

export interface ScheduleRow {
  id: string;
  user_id: string;
  date: string;            // YYYY-MM-DD
  routine_id: string;
  position: number;
}

export interface RecurringRow {
  id: string;
  user_id: string;
  day_of_week: number;     // 0=Sun..6=Sat
  routine_id: string;
  position: number;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  date: string;
  routine_exercise_id: string;
  completed: boolean;
  sets: number | null;
  reps: number | null;
  load: number | null;
  rpe: number | null;
  notes: string | null;
  ts: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  date: string;
  habit_id: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  dose: string;
  focus: Focus;
  cue: string;
  source?: string;
}

// ─── diet & supplements ──────────────────────────────────────────────────────
export type SupplementUnit = 'pill' | 'capsule' | 'scoop' | 'tablet' | 'gummy' | 'ml' | 'g';

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  position: number;
}

export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  unit: SupplementUnit;
  per_unit_protein: number;
  per_unit_calories: number;
  per_unit_amount: number | null;
  per_unit_label: string | null;
  daily_target: number;
  position: number;
}

export interface DietSettings {
  user_id: string;
  calorie_target: number | null;
  protein_target: number | null;
  water_target_ml: number;
}

export interface MealLog {
  id: string;
  user_id: string;
  date: string;
  meal_id: string;
  completed: boolean;
  calories: number | null;
  protein: number | null;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  date: string;
  supplement_id: string;
  amount: number;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
}
