<script lang="ts">
  import type { Routine, RoutineExercise, Focus, Unit } from '$lib/types';
  import { data } from '$lib/stores/data.svelte';
  import Sheet from './Sheet.svelte';
  import TagPill from './TagPill.svelte';

  interface Props {
    routine: Routine;
    open: boolean;
    onClose: () => void;
  }

  let { routine, open, onClose }: Props = $props();

  const exs = $derived(data.exercisesByRoutine.get(routine.id) ?? []);

  // ─── name edit ─────────────────────────────────────────────────────────────
  let nameField = $state('');
  let timeField = $state('');
  $effect(() => { nameField = routine.name; timeField = routine.time_estimate ?? ''; });

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleRoutineSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      // updateRoutine: minimal — directly mutate via supabase
      const { supabase } = await import('$lib/supabase');
      await supabase.from('routines').update({
        name: nameField,
        time_estimate: timeField || null
      }).eq('id', routine.id);
      const idx = data.routines.findIndex((r) => r.id === routine.id);
      if (idx >= 0) data.routines[idx] = { ...data.routines[idx], name: nameField, time_estimate: timeField || null };
    }, 500);
  }

  // ─── add exercise ──────────────────────────────────────────────────────────
  let showAdd = $state(false);
  let exName  = $state('');
  let exDose  = $state('');
  let exFocus = $state<Focus>('strength');
  let exUnit  = $state<Unit>('kg');
  let exTrackable = $state(true);
  let exSets  = $state<string>('3');
  let exReps  = $state<string>('8');
  let exLoad  = $state<string>('');

  async function addExercise() {
    if (!exName.trim()) return;
    await data.addExercise(routine.id, {
      name: exName.trim(),
      dose: exDose.trim() || null,
      focus: exFocus,
      cue: null,
      source: null,
      trackable: exTrackable,
      default_sets: exSets === '' ? null : Number(exSets),
      default_reps: exReps === '' ? null : Number(exReps),
      default_load: exLoad === '' ? null : Number(exLoad),
      unit: exUnit
    });
    exName = ''; exDose = ''; exLoad = '';
    showAdd = false;
  }

  async function removeExercise(id: string) {
    if (!confirm('Remove this exercise?')) return;
    await data.deleteExercise(id);
  }

  async function deleteRoutine() {
    if (!confirm(`Delete "${routine.name}"? This removes all logged data for it.`)) return;
    await data.deleteRoutine(routine.id);
    onClose();
  }

  const focusOptions: Focus[] = ['strength','mobility','gait','ucs','apt','both'];
  const unitOptions: Unit[]   = ['kg','lb','reps','s','bw'];
</script>

<Sheet open={open} title={routine.name} onClose={onClose}>
  <label class="block mb-3">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Name</span>
    <input class="input-base w-full" bind:value={nameField} oninput={scheduleRoutineSave} />
  </label>

  <label class="block mb-4">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Time estimate</span>
    <input class="input-base w-full" placeholder="e.g. 45 min"
           bind:value={timeField} oninput={scheduleRoutineSave} />
  </label>

  <div class="flex items-center justify-between mb-2">
    <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Exercises</div>
    <button class="text-[12px] text-teal hover:underline" onclick={() => (showAdd = !showAdd)}>
      {showAdd ? 'Cancel' : '+ Add'}
    </button>
  </div>

  {#if showAdd}
    <div class="card p-3 mb-3 flex flex-col gap-2">
      <input class="input-base w-full" placeholder="Exercise name" bind:value={exName} />
      <input class="input-base w-full" placeholder="Dose (e.g. 4 × 8)" bind:value={exDose} />
      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="block text-[10px] text-text3 mb-1">Focus</span>
          <select class="input-base w-full" bind:value={exFocus}>
            {#each focusOptions as f}<option value={f}>{f}</option>{/each}
          </select>
        </label>
        <label class="block">
          <span class="block text-[10px] text-text3 mb-1">Unit</span>
          <select class="input-base w-full" bind:value={exUnit}>
            {#each unitOptions as u}<option value={u}>{u}</option>{/each}
          </select>
        </label>
      </div>
      <label class="flex items-center gap-2 text-[12px] text-text2">
        <input type="checkbox" bind:checked={exTrackable} class="rounded border-border2 bg-surface2 text-teal" />
        Track sets/reps/load
      </label>
      {#if exTrackable}
        <div class="grid grid-cols-3 gap-2">
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Sets</span>
            <input type="number" class="input-base w-full" bind:value={exSets} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Reps</span>
            <input type="number" class="input-base w-full" bind:value={exReps} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Load</span>
            <input type="number" class="input-base w-full" bind:value={exLoad} />
          </label>
        </div>
      {/if}
      <button class="btn-primary mt-1" onclick={addExercise}>Add exercise</button>
    </div>
  {/if}

  <div class="flex flex-col gap-1.5 mb-4">
    {#each exs as ex (ex.id)}
      <div class="card px-3 py-2 flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate">{ex.name}</div>
          <div class="text-[11px] text-text3 truncate">{ex.dose ?? ''}</div>
        </div>
        <TagPill focus={ex.focus} />
        <button class="text-text3 hover:text-red text-sm" onclick={() => removeExercise(ex.id)} aria-label="Remove">×</button>
      </div>
    {/each}
    {#if exs.length === 0}
      <div class="text-[12px] text-text3 py-2 text-center">No exercises yet.</div>
    {/if}
  </div>

  <button class="btn-danger w-full" onclick={deleteRoutine}>Delete routine</button>
</Sheet>
