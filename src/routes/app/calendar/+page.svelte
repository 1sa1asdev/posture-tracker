<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { dateKey, addDays, DOW_SHORT } from '$lib/date';
  import Sheet from '$lib/components/Sheet.svelte';
  import RoutinePicker from '$lib/components/RoutinePicker.svelte';

  let cursor = $state(new Date());

  const monthStart = $derived(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const gridStart  = $derived(addDays(monthStart, -((monthStart.getDay() + 6) % 7)));

  const cells = $derived.by(() => {
    const arr: { dk: string; date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      arr.push({ dk: dateKey(d), date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return arr;
  });

  const monthLabel = $derived(
    cursor.toLocaleString('default', { month: 'long', year: 'numeric' })
  );

  function shiftMonth(n: number) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
  }

  let editingDate = $state<string | null>(null);
  let editorSelection = $state<string[]>([]);

  function openEditor(dk: string) {
    editingDate = dk;
    editorSelection = data.routinesForDate(dk).map((r) => r.id);
  }
  async function saveEditor() {
    if (!editingDate) return;
    await data.scheduleSet(editingDate, editorSelection);
    editingDate = null;
  }

  let recurringEditorDow = $state<number | null>(null);
  let recurringSelection = $state<string[]>([]);
  function openRecurring(dow: number) {
    recurringEditorDow = dow;
    recurringSelection = data.recurring
      .filter((r) => r.day_of_week === dow)
      .sort((a, b) => a.position - b.position)
      .map((r) => r.routine_id);
  }
  async function saveRecurring() {
    if (recurringEditorDow == null) return;
    await data.recurringSet(recurringEditorDow, recurringSelection);
    recurringEditorDow = null;
  }
</script>

<div class="grid lg:grid-cols-[1fr_280px] gap-6">
  <div>
    <div class="flex items-center justify-between mb-3">
      <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftMonth(-1)} aria-label="Previous month">←</button>
      <div class="text-sm font-semibold">{monthLabel}</div>
      <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftMonth(1)} aria-label="Next month">→</button>
    </div>

    <div class="grid grid-cols-7 text-center text-[10px] text-text3 uppercase tracking-wider mb-1">
      {#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as d}
        <div>{d}</div>
      {/each}
    </div>

    <div class="grid grid-cols-7 gap-1">
      {#each cells as c (c.dk)}
        {@const routines = data.routinesForDate(c.dk)}
        {@const exs = routines.flatMap((r) => data.exercisesByRoutine.get(r.id) ?? [])}
        {@const done = exs.filter((e) => data.logFor(c.dk, e.id)?.completed).length}
        {@const pct = exs.length > 0 ? done / exs.length : 0}
        {@const isToday = c.dk === dateKey(new Date())}
        {@const override = data.hasOverride(c.dk)}
        <button
          class="aspect-square card text-left p-1 md:p-1.5 flex flex-col {c.inMonth ? '' : 'opacity-30'}
                 {isToday ? 'border-teal' : ''}"
          onclick={() => openEditor(c.dk)}
        >
          <div class="flex items-center justify-between">
            <div class="text-[11px] md:text-[12px] font-semibold {isToday ? 'text-teal' : 'text-text2'}">{c.date.getDate()}</div>
            {#if override}<div class="w-1 h-1 rounded-full bg-amber" title="Override"></div>{/if}
          </div>
          <div class="mt-auto flex flex-col gap-0.5">
            {#each routines.slice(0, 2) as r (r.id)}
              <div class="text-[8px] md:text-[10px] truncate {r.category === 'rehab' ? 'text-teal' : 'text-violet'}">{r.name}</div>
            {/each}
            {#if routines.length > 2}
              <div class="text-[8px] md:text-[10px] text-text3">+{routines.length - 2}</div>
            {/if}
          </div>
          {#if exs.length > 0}
            <div class="mt-1 h-0.5 bg-border2 rounded-full overflow-hidden">
              <div class="h-full bg-teal" style="width: {pct * 100}%"></div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Weekly defaults</div>
      <div class="text-[10px] text-text3">tap to edit</div>
    </div>
    <div class="flex flex-col gap-1.5">
      {#each [1,2,3,4,5,6,0] as dow}
        {@const rows = data.recurring.filter((r) => r.day_of_week === dow).sort((a,b) => a.position - b.position)}
        {@const routines = rows.map((r) => data.routineById.get(r.routine_id)).filter((r) => r)}
        <button class="card flex items-center justify-between px-3 py-2.5 text-left" onclick={() => openRecurring(dow)}>
          <div class="text-sm font-medium w-20">{DOW_SHORT[dow]}</div>
          <div class="flex-1 text-[12px] text-text2 text-right truncate">
            {routines.length === 0 ? 'Rest' : routines.map((r) => r!.name).join(' · ')}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<Sheet open={editingDate !== null} title={editingDate ? `Schedule — ${editingDate}` : ''} onClose={() => (editingDate = null)}>
  <p class="text-[12px] text-text3 mb-3">
    Select which routines to do on this date. Overrides the weekly default for this day only.
  </p>
  <RoutinePicker selected={editorSelection} onChange={(ids) => (editorSelection = ids)} />
  <div class="flex gap-2 mt-4">
    <button class="btn-ghost flex-1" onclick={() => (editingDate = null)}>Cancel</button>
    <button class="btn-primary flex-1" onclick={saveEditor}>Save</button>
  </div>
</Sheet>

<Sheet open={recurringEditorDow !== null} title={recurringEditorDow !== null ? `Default for ${['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'][recurringEditorDow]}` : ''} onClose={() => (recurringEditorDow = null)}>
  <p class="text-[12px] text-text3 mb-3">
    These routines auto-fill every week. Per-date overrides take priority.
  </p>
  <RoutinePicker selected={recurringSelection} onChange={(ids) => (recurringSelection = ids)} />
  <div class="flex gap-2 mt-4">
    <button class="btn-ghost flex-1" onclick={() => (recurringEditorDow = null)}>Cancel</button>
    <button class="btn-primary flex-1" onclick={saveRecurring}>Save</button>
  </div>
</Sheet>
