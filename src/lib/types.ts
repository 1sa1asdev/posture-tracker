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
