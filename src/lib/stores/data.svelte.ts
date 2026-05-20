import { supabase } from '$lib/supabase';
import { session } from './session.svelte';
import { dateKey, dayOfWeek, parseDate } from '$lib/date';
import type {
  Routine, RoutineExercise, ScheduleRow, RecurringRow, ExerciseLog, HabitLog,
  Meal, Supplement, DietSettings, MealLog, SupplementLog, WaterLog, SupplementUnit
} from '$lib/types';

class DataStore {
  routines        = $state<Routine[]>([]);
  exercises       = $state<RoutineExercise[]>([]);
  schedule        = $state<ScheduleRow[]>([]);
  recurring       = $state<RecurringRow[]>([]);
  exerciseLog     = $state<ExerciseLog[]>([]);
  habitsLog       = $state<HabitLog[]>([]);
  meals           = $state<Meal[]>([]);
  supplements     = $state<Supplement[]>([]);
  dietSettings    = $state<DietSettings | null>(null);
  mealsLog        = $state<MealLog[]>([]);
  supplementsLog  = $state<SupplementLog[]>([]);
  waterLog        = $state<WaterLog[]>([]);
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
      const [r, e, s, rec, log, hab, ml, sp, ds, mll, spl, wl] = await Promise.all([
        supabase.from('routines').select('*').or(`is_preset.eq.true,user_id.eq.${uid}`),
        supabase.from('routine_exercises').select('*'),
        supabase.from('schedule').select('*').eq('user_id', uid),
        supabase.from('recurring').select('*').eq('user_id', uid),
        supabase.from('exercise_log').select('*').eq('user_id', uid),
        supabase.from('habits_log').select('*').eq('user_id', uid),
        supabase.from('meals').select('*').eq('user_id', uid),
        supabase.from('supplements').select('*').eq('user_id', uid),
        supabase.from('diet_settings').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('meals_log').select('*').eq('user_id', uid),
        supabase.from('supplements_log').select('*').eq('user_id', uid),
        supabase.from('water_log').select('*').eq('user_id', uid)
      ]);
      this.routines       = (r.data   ?? []) as Routine[];
      this.exercises      = (e.data   ?? []) as RoutineExercise[];
      this.schedule       = (s.data   ?? []) as ScheduleRow[];
      this.recurring      = (rec.data ?? []) as RecurringRow[];
      this.exerciseLog    = (log.data ?? []) as ExerciseLog[];
      this.habitsLog      = (hab.data ?? []) as HabitLog[];
      this.meals          = (ml.data  ?? []) as Meal[];
      this.supplements    = (sp.data  ?? []) as Supplement[];
      this.dietSettings   = (ds.data  ?? null) as DietSettings | null;
      this.mealsLog       = (mll.data ?? []) as MealLog[];
      this.supplementsLog = (spl.data ?? []) as SupplementLog[];
      this.waterLog       = (wl.data  ?? []) as WaterLog[];
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
    this.meals = [];
    this.supplements = [];
    this.dietSettings = null;
    this.mealsLog = [];
    this.supplementsLog = [];
    this.waterLog = [];
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

  // ─── diet — derived day totals ─────────────────────────────────────────────
  // Effective meal macros = log override ?? template default ?? null (treated as 0).
  effectiveMealMacros(dk: string, mealId: string): {
    calories: number | null; protein: number | null;
    source: { calories: 'log' | 'template' | 'none'; protein: 'log' | 'template' | 'none' };
  } {
    const m = this.meals.find((x) => x.id === mealId);
    const log = this.mealsLog.find((l) => l.date === dk && l.meal_id === mealId);
    const cal = log?.calories ?? m?.calories ?? null;
    const pro = log?.protein  ?? m?.protein  ?? null;
    return {
      calories: cal === null ? null : Number(cal),
      protein:  pro === null ? null : Number(pro),
      source: {
        calories: log?.calories != null ? 'log' : (m?.calories != null ? 'template' : 'none'),
        protein:  log?.protein  != null ? 'log' : (m?.protein  != null ? 'template' : 'none')
      }
    };
  }

  dayDietTotals(dk: string): {
    calories: number; protein: number; water_ml: number;
    pendingMeals: number;       // meals that are checked but have no macros recorded
  } {
    let calories = 0, protein = 0, pendingMeals = 0;
    for (const ml of this.mealsLog) {
      if (ml.date !== dk || !ml.completed) continue;
      const eff = this.effectiveMealMacros(dk, ml.meal_id);
      if (eff.calories == null && eff.protein == null) pendingMeals++;
      calories += eff.calories ?? 0;
      protein  += eff.protein  ?? 0;
    }
    for (const sl of this.supplementsLog) {
      if (sl.date !== dk) continue;
      const s = this.supplements.find((x) => x.id === sl.supplement_id);
      if (!s) continue;
      calories += Number(s.per_unit_calories) * Number(sl.amount);
      protein  += Number(s.per_unit_protein)  * Number(sl.amount);
    }
    const w = this.waterLog.find((x) => x.date === dk);
    return { calories, protein, water_ml: w ? Number(w.amount_ml) : 0, pendingMeals };
  }

  mealCompleted(dk: string, mealId: string): boolean {
    return this.mealsLog.some((m) => m.date === dk && m.meal_id === mealId && m.completed);
  }

  async setMealMacros(
    dk: string,
    mealId: string,
    fields: { calories?: number | null; protein?: number | null }
  ): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const existing = this.mealsLog.find((l) => l.date === dk && l.meal_id === mealId);
    const payload = {
      user_id: session.user.id,
      date: dk,
      meal_id: mealId,
      completed: existing?.completed ?? true,
      calories: fields.calories !== undefined ? fields.calories : existing?.calories ?? null,
      protein:  fields.protein  !== undefined ? fields.protein  : existing?.protein  ?? null
    };
    if (existing) {
      const i = this.mealsLog.findIndex((l) => l.id === existing.id);
      if (i >= 0) this.mealsLog[i] = { ...existing, ...payload };
    } else {
      this.mealsLog = [...this.mealsLog, {
        id: 'tmp_' + crypto.randomUUID(),
        ...payload
      } as MealLog];
    }
    const { data, error } = await supabase
      .from('meals_log')
      .upsert(payload, { onConflict: 'user_id,date,meal_id' })
      .select().single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.mealsLog.findIndex((l) => l.date === dk && l.meal_id === mealId);
      if (i >= 0) this.mealsLog[i] = data as MealLog;
    }
    this.syncState = 'ok';
  }

  supplementAmount(dk: string, suppId: string): number {
    const row = this.supplementsLog.find((s) => s.date === dk && s.supplement_id === suppId);
    return row ? Number(row.amount) : 0;
  }

  // ─── diet — mutations ──────────────────────────────────────────────────────
  async toggleMeal(dk: string, mealId: string, completed: boolean): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const payload = { user_id: session.user.id, date: dk, meal_id: mealId, completed };
    const existing = this.mealsLog.find((m) => m.date === dk && m.meal_id === mealId);
    if (existing) {
      const i = this.mealsLog.findIndex((m) => m.id === existing.id);
      if (i >= 0) this.mealsLog[i] = { ...existing, completed };
    } else {
      this.mealsLog = [...this.mealsLog, {
        id: 'tmp_' + crypto.randomUUID(),
        user_id: session.user.id, date: dk, meal_id: mealId, completed,
        calories: null, protein: null
      }];
    }
    const { data, error } = await supabase
      .from('meals_log')
      .upsert(payload, { onConflict: 'user_id,date,meal_id' })
      .select().single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.mealsLog.findIndex((m) => m.date === dk && m.meal_id === mealId);
      if (i >= 0) this.mealsLog[i] = data as MealLog;
    }
    this.syncState = 'ok';
  }

  async setSupplementAmount(dk: string, suppId: string, amount: number): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const safe = Math.max(0, amount);
    const existing = this.supplementsLog.find((s) => s.date === dk && s.supplement_id === suppId);
    if (existing) {
      const i = this.supplementsLog.findIndex((s) => s.id === existing.id);
      if (i >= 0) this.supplementsLog[i] = { ...existing, amount: safe };
    } else {
      this.supplementsLog = [...this.supplementsLog, {
        id: 'tmp_' + crypto.randomUUID(),
        user_id: session.user.id, date: dk, supplement_id: suppId, amount: safe
      }];
    }
    const { data, error } = await supabase
      .from('supplements_log')
      .upsert(
        { user_id: session.user.id, date: dk, supplement_id: suppId, amount: safe },
        { onConflict: 'user_id,date,supplement_id' }
      )
      .select().single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.supplementsLog.findIndex((s) => s.date === dk && s.supplement_id === suppId);
      if (i >= 0) this.supplementsLog[i] = data as SupplementLog;
    }
    this.syncState = 'ok';
  }

  async setWater(dk: string, ml: number): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const safe = Math.max(0, Math.round(ml));
    const existing = this.waterLog.find((w) => w.date === dk);
    if (existing) {
      const i = this.waterLog.findIndex((w) => w.id === existing.id);
      if (i >= 0) this.waterLog[i] = { ...existing, amount_ml: safe };
    } else {
      this.waterLog = [...this.waterLog, {
        id: 'tmp_' + crypto.randomUUID(),
        user_id: session.user.id, date: dk, amount_ml: safe
      }];
    }
    const { data, error } = await supabase
      .from('water_log')
      .upsert(
        { user_id: session.user.id, date: dk, amount_ml: safe },
        { onConflict: 'user_id,date' }
      )
      .select().single();
    if (error) { this.syncState = 'error'; return; }
    if (data) {
      const i = this.waterLog.findIndex((w) => w.date === dk);
      if (i >= 0) this.waterLog[i] = data as WaterLog;
    }
    this.syncState = 'ok';
  }

  async updateDietSettings(fields: Partial<Omit<DietSettings, 'user_id'>>): Promise<void> {
    if (!session.user) return;
    this.syncState = 'pending';
    const merged = {
      user_id: session.user.id,
      calorie_target: fields.calorie_target ?? this.dietSettings?.calorie_target ?? null,
      protein_target: fields.protein_target ?? this.dietSettings?.protein_target ?? null,
      water_target_ml: fields.water_target_ml ?? this.dietSettings?.water_target_ml ?? 3000
    };
    const { data, error } = await supabase
      .from('diet_settings')
      .upsert(merged, { onConflict: 'user_id' })
      .select().single();
    if (error) { this.syncState = 'error'; return; }
    this.dietSettings = data as DietSettings;
    this.syncState = 'ok';
  }

  async createMeal(name: string, calories: number | null, protein: number | null): Promise<Meal | null> {
    if (!session.user) return null;
    const pos = this.meals.filter((m) => m.user_id === session.user!.id).length;
    const { data, error } = await supabase
      .from('meals')
      .insert({ user_id: session.user.id, name, calories, protein, position: pos })
      .select().single();
    if (error || !data) { this.syncState = 'error'; return null; }
    this.meals = [...this.meals, data as Meal];
    return data as Meal;
  }

  async updateMeal(id: string, fields: Partial<Meal>): Promise<void> {
    const { data, error } = await supabase.from('meals').update(fields).eq('id', id).select().single();
    if (error || !data) { this.syncState = 'error'; return; }
    const i = this.meals.findIndex((m) => m.id === id);
    if (i >= 0) this.meals[i] = data as Meal;
  }

  async deleteMeal(id: string): Promise<void> {
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) { this.syncState = 'error'; return; }
    this.meals    = this.meals.filter((m) => m.id !== id);
    this.mealsLog = this.mealsLog.filter((m) => m.meal_id !== id);
  }

  async createSupplement(s: Omit<Supplement, 'id' | 'user_id' | 'position'>): Promise<Supplement | null> {
    if (!session.user) return null;
    const pos = this.supplements.filter((x) => x.user_id === session.user!.id).length;
    const { data, error } = await supabase
      .from('supplements')
      .insert({ ...s, user_id: session.user.id, position: pos })
      .select().single();
    if (error || !data) { this.syncState = 'error'; return null; }
    this.supplements = [...this.supplements, data as Supplement];
    return data as Supplement;
  }

  async updateSupplement(id: string, fields: Partial<Supplement>): Promise<void> {
    const { data, error } = await supabase.from('supplements').update(fields).eq('id', id).select().single();
    if (error || !data) { this.syncState = 'error'; return; }
    const i = this.supplements.findIndex((x) => x.id === id);
    if (i >= 0) this.supplements[i] = data as Supplement;
  }

  async deleteSupplement(id: string): Promise<void> {
    const { error } = await supabase.from('supplements').delete().eq('id', id);
    if (error) { this.syncState = 'error'; return; }
    this.supplements    = this.supplements.filter((s) => s.id !== id);
    this.supplementsLog = this.supplementsLog.filter((s) => s.supplement_id !== id);
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
