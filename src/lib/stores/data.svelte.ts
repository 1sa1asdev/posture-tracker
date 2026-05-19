import { supabase } from '$lib/supabase';
import { session } from './session.svelte';
import { dateKey, dayOfWeek, parseDate } from '$lib/date';
import type {
  Routine, RoutineExercise, ScheduleRow, RecurringRow, ExerciseLog, HabitLog
} from '$lib/types';

class DataStore {
  routines        = $state<Routine[]>([]);
  exercises       = $state<RoutineExercise[]>([]);
  schedule        = $state<ScheduleRow[]>([]);
  recurring       = $state<RecurringRow[]>([]);
  exerciseLog     = $state<ExerciseLog[]>([]);
  habitsLog       = $state<HabitLog[]>([]);
  loading         = $state(false);
  loaded          = $state(false);
  syncState       = $state<'idle' | 'pending' | 'ok' | 'error'>('idle');

  routineById      = $derived(new Map(this.routines.map((r) => [r.id, r])));
  exercisesByRoutine = $derived.by(() => {
    const m = new Map<string, RoutineExercise[]>();
    for (const ex of this.exercises) {
      const arr = m.get(ex.routine_id) ?? [];
      arr.push(ex);
      m.set(ex.routine_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.position - b.position);
    return m;
  });

  async loadAll() {
    if (!session.user) return;
    this.loading = true;
    try {
      const uid = session.user.id;
      const [r, e, s, rec, log, hab] = await Promise.all([
        supabase.from('routines').select('*').or(`is_preset.eq.true,user_id.eq.${uid}`),
        supabase.from('routine_exercises').select('*'),
        supabase.from('schedule').select('*').eq('user_id', uid),
        supabase.from('recurring').select('*').eq('user_id', uid),
        supabase.from('exercise_log').select('*').eq('user_id', uid),
        supabase.from('habits_log').select('*').eq('user_id', uid)
      ]);
      this.routines    = (r.data   ?? []) as Routine[];
      this.exercises   = (e.data   ?? []) as RoutineExercise[];
      this.schedule    = (s.data   ?? []) as ScheduleRow[];
      this.recurring   = (rec.data ?? []) as RecurringRow[];
      this.exerciseLog = (log.data ?? []) as ExerciseLog[];
      this.habitsLog   = (hab.data ?? []) as HabitLog[];
      this.loaded = true;
      this.syncState = 'ok';
    } catch (err) {
      console.error('loadAll failed', err);
      this.syncState = 'error';
    } finally {
      this.loading = false;
    }
  }

  reset() {
    this.routines = [];
    this.exercises = [];
    this.schedule = [];
    this.recurring = [];
    this.exerciseLog = [];
    this.habitsLog = [];
    this.loaded = false;
  }

  // ─── derived resolvers ─────────────────────────────────────────────────────
  routinesForDate(dk: string): Routine[] {
    const overrides = this.schedule.filter((s) => s.date === dk);
    if (overrides.length > 0) {
      return overrides
        .sort((a, b) => a.position - b.position)
        .map((s) => this.routineById.get(s.routine_id))
        .filter((r): r is Routine => !!r);
    }
    const dow = dayOfWeek(dk);
    return this.recurring
      .filter((r) => r.day_of_week === dow)
      .sort((a, b) => a.position - b.position)
      .map((r) => this.routineById.get(r.routine_id))
      .filter((r): r is Routine => !!r);
  }

  hasOverride(dk: string): boolean {
    return this.schedule.some((s) => s.date === dk);
  }

  logFor(dk: string, exId: string): ExerciseLog | undefined {
    return this.exerciseLog.find((l) => l.date === dk && l.routine_exercise_id === exId);
  }

  habitDone(dk: string, habitId: string): boolean {
    return this.habitsLog.some((h) => h.date === dk && h.habit_id === habitId && h.completed);
  }

  // ─── mutations ─────────────────────────────────────────────────────────────
  async toggleExercise(dk: string, exId: string, completed: boolean): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const existing = this.logFor(dk, exId);
    const payload = {
      user_id: session.user.id,
      date: dk,
      routine_exercise_id: exId,
      completed
    };
    if (existing) {
      const idx = this.exerciseLog.findIndex((l) => l.id === existing.id);
      if (idx >= 0) this.exerciseLog[idx] = { ...existing, completed };
    } else {
      const tmp: ExerciseLog = {
        id: 'tmp_' + crypto.randomUUID(),
        user_id: session.user.id,
        date: dk,
        routine_exercise_id: exId,
        completed,
        sets: null, reps: null, load: null, rpe: null, notes: null,
        ts: new Date().toISOString()
      };
      this.exerciseLog = [...this.exerciseLog, tmp];
    }
    const { data, error } = await supabase
      .from('exercise_log')
      .upsert(payload, { onConflict: 'user_id,date,routine_exercise_id' })
      .select()
      .single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.exerciseLog.findIndex(
        (l) => l.date === dk && l.routine_exercise_id === exId
      );
      if (i >= 0) this.exerciseLog[i] = data as ExerciseLog;
    }
    this.syncState = 'ok';
  }

  async updateLog(
    dk: string,
    exId: string,
    fields: Partial<Pick<ExerciseLog, 'sets' | 'reps' | 'load' | 'rpe' | 'notes'>>
  ): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const existing = this.logFor(dk, exId);
    const merged = {
      user_id: session.user.id,
      date: dk,
      routine_exercise_id: exId,
      completed: existing?.completed ?? false,
      sets: fields.sets ?? existing?.sets ?? null,
      reps: fields.reps ?? existing?.reps ?? null,
      load: fields.load ?? existing?.load ?? null,
      rpe: fields.rpe ?? existing?.rpe ?? null,
      notes: fields.notes ?? existing?.notes ?? null
    };
    // optimistic
    if (existing) {
      const idx = this.exerciseLog.findIndex((l) => l.id === existing.id);
      if (idx >= 0) this.exerciseLog[idx] = { ...existing, ...merged };
    }
    const { data, error } = await supabase
      .from('exercise_log')
      .upsert(merged, { onConflict: 'user_id,date,routine_exercise_id' })
      .select()
      .single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.exerciseLog.findIndex(
        (l) => l.date === dk && l.routine_exercise_id === exId
      );
      if (i >= 0) this.exerciseLog[i] = data as ExerciseLog;
      else this.exerciseLog = [...this.exerciseLog, data as ExerciseLog];
    }
    this.syncState = 'ok';
  }

  async toggleHabit(dk: string, habitId: string, completed: boolean): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const existing = this.habitsLog.find((h) => h.date === dk && h.habit_id === habitId);
    if (existing) {
      const idx = this.habitsLog.findIndex((h) => h.id === existing.id);
      if (idx >= 0) this.habitsLog[idx] = { ...existing, completed };
    } else {
      this.habitsLog = [...this.habitsLog, {
        id: 'tmp_' + crypto.randomUUID(),
        user_id: session.user.id,
        date: dk,
        habit_id: habitId,
        completed
      }];
    }
    const { data, error } = await supabase
      .from('habits_log')
      .upsert(
        { user_id: session.user.id, date: dk, habit_id: habitId, completed },
        { onConflict: 'user_id,date,habit_id' }
      )
      .select()
      .single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.habitsLog.findIndex((h) => h.date === dk && h.habit_id === habitId);
      if (i >= 0) this.habitsLog[i] = data as HabitLog;
    }
    this.syncState = 'ok';
  }

  // ─── routine CRUD (user-owned only; presets are server-managed) ────────────
  async createRoutine(name: string, category: 'rehab' | 'gym', time_estimate?: string): Promise<Routine | null> {
    if (!session.user) return null;
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: session.user.id,
        is_preset: false,
        name,
        category,
        time_estimate: time_estimate ?? null,
        tags: [category],
        position: this.routines.filter((r) => r.user_id === session.user!.id && r.category === category).length
      })
      .select()
      .single();
    if (error || !data) { this.syncState = 'error'; return null; }
    this.routines = [...this.routines, data as Routine];
    return data as Routine;
  }

  async deleteRoutine(routineId: string): Promise<void> {
    const r = this.routineById.get(routineId);
    if (!r || r.is_preset) return;
    const { error } = await supabase.from('routines').delete().eq('id', routineId);
    if (error) { this.syncState = 'error'; return; }
    this.routines    = this.routines.filter((x) => x.id !== routineId);
    this.exercises   = this.exercises.filter((x) => x.routine_id !== routineId);
    this.schedule    = this.schedule.filter((x) => x.routine_id !== routineId);
    this.recurring   = this.recurring.filter((x) => x.routine_id !== routineId);
  }

  async addExercise(routineId: string, ex: Omit<RoutineExercise, 'id' | 'routine_id' | 'position'>): Promise<RoutineExercise | null> {
    const r = this.routineById.get(routineId);
    if (!r || r.is_preset) return null;
    const existing = this.exercises.filter((e) => e.routine_id === routineId);
    const { data, error } = await supabase
      .from('routine_exercises')
      .insert({ ...ex, routine_id: routineId, position: existing.length })
      .select()
      .single();
    if (error || !data) { this.syncState = 'error'; return null; }
    this.exercises = [...this.exercises, data as RoutineExercise];
    return data as RoutineExercise;
  }

  async updateExercise(exId: string, fields: Partial<RoutineExercise>): Promise<void> {
    const ex = this.exercises.find((e) => e.id === exId);
    if (!ex) return;
    const routine = this.routineById.get(ex.routine_id);
    if (!routine || routine.is_preset) return;
    const { data, error } = await supabase
      .from('routine_exercises')
      .update(fields)
      .eq('id', exId)
      .select()
      .single();
    if (error || !data) { this.syncState = 'error'; return; }
    const i = this.exercises.findIndex((e) => e.id === exId);
    if (i >= 0) this.exercises[i] = data as RoutineExercise;
  }

  async deleteExercise(exId: string): Promise<void> {
    const ex = this.exercises.find((e) => e.id === exId);
    if (!ex) return;
    const routine = this.routineById.get(ex.routine_id);
    if (!routine || routine.is_preset) return;
    const { error } = await supabase.from('routine_exercises').delete().eq('id', exId);
    if (error) { this.syncState = 'error'; return; }
    this.exercises = this.exercises.filter((e) => e.id !== exId);
  }

  // ─── schedule ──────────────────────────────────────────────────────────────
  async scheduleSet(dk: string, routineIds: string[]): Promise<void> {
    if (!session.user) return;
    const uid = session.user.id;
    await supabase.from('schedule').delete().eq('user_id', uid).eq('date', dk);
    if (routineIds.length === 0) {
      this.schedule = this.schedule.filter((s) => s.date !== dk);
      return;
    }
    const rows = routineIds.map((rid, i) => ({
      user_id: uid, date: dk, routine_id: rid, position: i
    }));
    const { data, error } = await supabase.from('schedule').insert(rows).select();
    if (error) { this.syncState = 'error'; return; }
    this.schedule = [
      ...this.schedule.filter((s) => s.date !== dk),
      ...((data ?? []) as ScheduleRow[])
    ];
  }

  async recurringSet(dow: number, routineIds: string[]): Promise<void> {
    if (!session.user) return;
    const uid = session.user.id;
    await supabase.from('recurring').delete().eq('user_id', uid).eq('day_of_week', dow);
    if (routineIds.length === 0) {
      this.recurring = this.recurring.filter((r) => r.day_of_week !== dow);
      return;
    }
    const rows = routineIds.map((rid, i) => ({
      user_id: uid, day_of_week: dow, routine_id: rid, position: i
    }));
    const { data, error } = await supabase.from('recurring').insert(rows).select();
    if (error) { this.syncState = 'error'; return; }
    this.recurring = [
      ...this.recurring.filter((r) => r.day_of_week !== dow),
      ...((data ?? []) as RecurringRow[])
    ];
  }
}

export const data = new DataStore();
