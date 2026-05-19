<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { dateKey, addDays, DOW_LONG } from '$lib/date';
  import { HABITS } from '$lib/data/habits';
  import ExerciseRow from '$lib/components/ExerciseRow.svelte';
  import HabitRow from '$lib/components/HabitRow.svelte';

  let cursor = $state(new Date());
  const dk = $derived(dateKey(cursor));
  const dayLabel = $derived(DOW_LONG[cursor.getDay()]);

  const routines = $derived(data.routinesForDate(dk));

  const dayStats = $derived.by(() => {
    let total = 0, done = 0;
    for (const r of routines) {
      const exs = data.exercisesByRoutine.get(r.id) ?? [];
      total += exs.length;
      for (const ex of exs) if (data.logFor(dk, ex.id)?.completed) done++;
    }
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const habitStats = $derived.by(() => {
    const done = HABITS.filter((h) => data.habitDone(dk, h.id)).length;
    return { done, total: HABITS.length, pct: Math.round((done / HABITS.length) * 100) };
  });

  const ringColor = $derived(
    dayStats.pct === 100 ? '#1D9E75' : dayStats.pct > 50 ? '#BA7517' : '#D85A30'
  );
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = $derived(circ - (dayStats.pct / 100) * circ);

  function shiftDay(n: number) { cursor = addDays(cursor, n); }
  function resetToToday() { cursor = new Date(); }
  const isToday = $derived(dateKey(new Date()) === dk);
</script>

<div class="flex items-center justify-between mb-3">
  <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftDay(-1)} aria-label="Previous day">←</button>
  <button class="text-[12px] text-text3 hover:text-text" onclick={resetToToday}>
    {isToday ? 'Today' : new Date(dk + 'T12:00:00').toLocaleDateString()}
  </button>
  <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftDay(1)} aria-label="Next day">→</button>
</div>

<div class="card-xl p-4 mb-4">
  <div class="text-[12px] uppercase tracking-wider text-text3 mb-0.5 font-medium">{dayLabel}</div>
  {#if routines.length === 0}
    <div class="text-base font-semibold mb-2.5">Recovery day</div>
    <div class="text-center py-5">
      <div class="text-3xl mb-2">🌿</div>
      <div class="text-sm text-text2">Focus on daily habits only</div>
    </div>
  {:else}
    <div class="text-base font-semibold mb-2.5">{routines.map((r) => r.name).join(' · ')}</div>
    <div class="flex items-center gap-3.5">
      <svg viewBox="0 0 56 56" class="w-14 h-14 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r="{r}" fill="none" stroke="#333" stroke-width="5" />
        <circle cx="28" cy="28" r="{r}" fill="none" stroke={ringColor} stroke-width="5"
                stroke-linecap="round"
                stroke-dasharray={circ.toFixed(1)}
                stroke-dashoffset={offset.toFixed(1)}
                style="transition: stroke-dashoffset .5s ease" />
        <text x="28" y="28" text-anchor="middle" dominant-baseline="central"
              transform="rotate(90,28,28)"
              style="font-size:12px;font-weight:700;fill:#f0f0f0">{dayStats.pct}%</text>
      </svg>
      <div class="text-[13px] text-text2 leading-relaxed">
        <div><span class="font-semibold text-text">{dayStats.done}/{dayStats.total}</span> exercises</div>
        <div><span class="font-semibold text-text">{habitStats.done}/{habitStats.total}</span> daily habits</div>
        <div>{routines.length} routine{routines.length === 1 ? '' : 's'}</div>
      </div>
    </div>
  {/if}
</div>

<div class="grid lg:grid-cols-[1fr_320px] gap-6">
  <div>
    {#each routines as routine (routine.id)}
      {@const exs = data.exercisesByRoutine.get(routine.id) ?? []}
      <div class="flex items-center justify-between mt-4 mb-2 first:mt-0">
        <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">{routine.name}</div>
        <div class="text-[12px] text-text3">
          {exs.filter((e) => data.logFor(dk, e.id)?.completed).length}/{exs.length}
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        {#each exs as ex (ex.id)}
          <ExerciseRow exercise={ex} date={dk} />
        {/each}
      </div>
    {/each}

    {#if routines.length === 0}
      <div class="text-[12px] text-text3 text-center py-3">No scheduled routines today.</div>
    {/if}
  </div>

  <div>
    <div class="flex items-center justify-between mb-2 mt-4 lg:mt-0">
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Daily habits</div>
      <div class="text-[12px] text-text3">{habitStats.done}/{habitStats.total}</div>
    </div>
    <div class="flex flex-col gap-1.5">
      {#each HABITS as h (h.id)}
        <HabitRow habit={h} date={dk} />
      {/each}
    </div>
  </div>
</div>
