<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { HABITS } from '$lib/data/habits';
  import { dateKey, weekStart, addDays } from '$lib/date';

  const weekStats = $derived.by(() => {
    const start = weekStart(new Date());
    const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
    let total = 0, done = 0;
    for (const dk of days) {
      const routines = data.routinesForDate(dk);
      for (const r of routines) {
        const exs = data.exercisesByRoutine.get(r.id) ?? [];
        total += exs.length;
        for (const ex of exs) if (data.logFor(dk, ex.id)?.completed) done++;
      }
    }
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const tagBreakdown = $derived.by(() => {
    const start = weekStart(new Date());
    const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
    const buckets: Record<string, { total: number; done: number }> = {
      ucs: { total: 0, done: 0 },
      apt: { total: 0, done: 0 },
      gait: { total: 0, done: 0 },
      strength: { total: 0, done: 0 }
    };
    for (const dk of days) {
      const routines = data.routinesForDate(dk);
      for (const r of routines) {
        const exs = data.exercisesByRoutine.get(r.id) ?? [];
        for (const ex of exs) {
          const done = data.logFor(dk, ex.id)?.completed ? 1 : 0;
          if (ex.focus === 'ucs' || ex.focus === 'both') { buckets.ucs.total++; buckets.ucs.done += done; }
          if (ex.focus === 'apt' || ex.focus === 'both') { buckets.apt.total++; buckets.apt.done += done; }
          if (ex.focus === 'gait')                       { buckets.gait.total++; buckets.gait.done += done; }
          if (ex.focus === 'strength')                   { buckets.strength.total++; buckets.strength.done += done; }
        }
      }
    }
    return buckets;
  });

  function pct(b: { total: number; done: number }) {
    return b.total > 0 ? Math.round((b.done / b.total) * 100) : 0;
  }

  const habitAdherence = $derived.by(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(today, -i)));
    let total = 0, done = 0;
    for (const dk of days) {
      total += HABITS.length;
      for (const h of HABITS) if (data.habitDone(dk, h.id)) done++;
    }
    return { pct: Math.round((done / total) * 100), done, total };
  });

  const habitStreak = $derived.by(() => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const dk = dateKey(addDays(new Date(), -i));
      const cnt = HABITS.filter((h) => data.habitDone(dk, h.id)).length;
      if (cnt / HABITS.length >= 0.6) streak++;
      else { if (i > 0) break; }
    }
    return streak;
  });

  const weekHistory = $derived.by(() => {
    const arr: { weekStart: string; pct: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const start = addDays(weekStart(new Date()), -7 * i);
      const days = Array.from({ length: 7 }, (_, k) => dateKey(addDays(start, k)));
      let total = 0, done = 0;
      for (const dk of days) {
        const routines = data.routinesForDate(dk);
        for (const r of routines) {
          const exs = data.exercisesByRoutine.get(r.id) ?? [];
          total += exs.length;
          for (const ex of exs) if (data.logFor(dk, ex.id)?.completed) done++;
        }
      }
      arr.push({ weekStart: dateKey(start), pct: total > 0 ? Math.round((done / total) * 100) : 0 });
    }
    return arr;
  });

  const loadProgression = $derived.by(() => {
    const trackable = data.exercises.filter((e) => e.trackable);
    const out: { exercise: typeof trackable[0]; entries: { date: string; load: number; reps: number | null }[] }[] = [];
    for (const ex of trackable) {
      const entries = data.exerciseLog
        .filter((l) => l.routine_exercise_id === ex.id && l.load != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-12)
        .map((l) => ({ date: l.date, load: Number(l.load), reps: l.reps }));
      if (entries.length > 0) out.push({ exercise: ex, entries });
    }
    return out;
  });

  function weekPctColor(p: number) { return p >= 70 ? 'text-teal' : p >= 40 ? 'text-amber' : 'text-coral'; }
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">This week</div>
    <div class="text-3xl font-bold mb-1.5 leading-none {weekPctColor(weekStats.pct)}">{weekStats.pct}%</div>
    <div class="h-[3px] bg-border2 rounded-full overflow-hidden">
      <div class="h-full bg-teal" style="width: {weekStats.pct}%"></div>
    </div>
  </div>
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">Habit streak</div>
    <div class="text-3xl font-bold text-amber mb-1.5 leading-none">{habitStreak} 🔥</div>
    <div class="text-[11px] text-text3">days ≥60%</div>
  </div>
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">UCS / chest</div>
    <div class="text-3xl font-bold text-teal mb-1.5 leading-none">{pct(tagBreakdown.ucs)}%</div>
    <div class="h-[3px] bg-border2 rounded-full overflow-hidden">
      <div class="h-full bg-teal" style="width: {pct(tagBreakdown.ucs)}%"></div>
    </div>
  </div>
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">APT / pelvis</div>
    <div class="text-3xl font-bold text-coral mb-1.5 leading-none">{pct(tagBreakdown.apt)}%</div>
    <div class="h-[3px] bg-border2 rounded-full overflow-hidden">
      <div class="h-full bg-coral" style="width: {pct(tagBreakdown.apt)}%"></div>
    </div>
  </div>
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">Gait</div>
    <div class="text-3xl font-bold text-amber mb-1.5 leading-none">{pct(tagBreakdown.gait)}%</div>
    <div class="h-[3px] bg-border2 rounded-full overflow-hidden">
      <div class="h-full bg-amber" style="width: {pct(tagBreakdown.gait)}%"></div>
    </div>
  </div>
  <div class="card p-3.5">
    <div class="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1.5">Strength</div>
    <div class="text-3xl font-bold mb-1.5 leading-none" style="color:#7B5BD9">{pct(tagBreakdown.strength)}%</div>
    <div class="h-[3px] bg-border2 rounded-full overflow-hidden">
      <div class="h-full" style="background:#7B5BD9;width: {pct(tagBreakdown.strength)}%"></div>
    </div>
  </div>
</div>

<div class="grid lg:grid-cols-2 gap-6">
  <div>
    <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Week history</div>
    <div class="card-xl p-3">
      {#each weekHistory as w (w.weekStart)}
        {@const d = new Date(w.weekStart + 'T12:00:00')}
        {@const lbl = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`}
        <div class="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0">
          <div class="text-[12px] text-text2 w-14">{lbl}</div>
          <div class="flex-1 h-[3px] bg-border2 rounded-full overflow-hidden">
            <div class="h-full bg-teal rounded-full" style="width: {w.pct}%"></div>
          </div>
          <div class="text-[12px] font-semibold w-9 text-right {weekPctColor(w.pct)}">{w.pct}%</div>
        </div>
      {/each}
    </div>
    <div class="text-[11px] text-text3 leading-relaxed mt-3 p-3 card">
      <strong class="text-text2">Habit adherence (last 7 days):</strong> {habitAdherence.pct}%
      ({habitAdherence.done} / {habitAdherence.total})
    </div>
  </div>

  <div>
    {#if loadProgression.length > 0}
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Load progression</div>
      <div class="flex flex-col gap-1.5">
        {#each loadProgression as p (p.exercise.id)}
          {@const max = Math.max(...p.entries.map((e) => e.load))}
          {@const min = Math.min(...p.entries.map((e) => e.load))}
          {@const range = max - min || 1}
          <div class="card p-3">
            <div class="text-[13px] font-medium mb-2">{p.exercise.name}</div>
            <div class="flex items-end gap-1 h-12">
              {#each p.entries as e (e.date)}
                {@const h = 12 + ((e.load - min) / range) * 36}
                <div class="flex-1 bg-teal rounded-sm" style="height:{h}px" title="{e.date}: {e.load}{p.exercise.unit}"></div>
              {/each}
            </div>
            <div class="flex justify-between text-[10px] text-text3 mt-1.5">
              <span>{p.entries[0]?.date}</span>
              <span>{min}–{max} {p.exercise.unit}</span>
              <span>{p.entries[p.entries.length-1]?.date}</span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Load progression</div>
      <div class="card p-6 text-center text-text3 text-[13px]">
        Log a trackable exercise (set, reps, load) and history will appear here.
      </div>
    {/if}
  </div>
</div>
