<script lang="ts">
  import type { RoutineExercise } from '$lib/types';
  import { data } from '$lib/stores/data.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import TagPill from './TagPill.svelte';

  interface Props {
    exercise: RoutineExercise;
    date: string;
    readonly?: boolean;
  }

  let { exercise, date, readonly = false }: Props = $props();

  let expanded = $state(false);

  const log     = $derived(data.logFor(date, exercise.id));
  const done    = $derived(!!log?.completed);

  let setsField  = $state<string>('');
  let repsField  = $state<string>('');
  let loadField  = $state<string>('');
  let rpeField   = $state<string>('');
  let notesField = $state<string>('');

  $effect(() => {
    setsField  = log?.sets  != null ? String(log.sets)  : (exercise.default_sets != null ? String(exercise.default_sets) : '');
    repsField  = log?.reps  != null ? String(log.reps)  : (exercise.default_reps != null ? String(exercise.default_reps) : '');
    loadField  = log?.load  != null ? String(log.load)  : (exercise.default_load != null ? String(exercise.default_load) : '');
    rpeField   = log?.rpe   != null ? String(log.rpe)   : '';
    notesField = log?.notes ?? '';
  });

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      data.updateLog(date, exercise.id, {
        sets:  setsField  === '' ? null : Number(setsField),
        reps:  repsField  === '' ? null : Number(repsField),
        load:  loadField  === '' ? null : Number(loadField),
        rpe:   rpeField   === '' ? null : Number(rpeField),
        notes: notesField === '' ? null : notesField
      });
    }, 500);
  }

  async function toggle() {
    if (readonly) return;
    await data.toggleExercise(date, exercise.id, !done);
    if (!done) toast.show('✓');
  }
</script>

<div class="card-xl overflow-hidden transition-opacity {done ? 'opacity-60' : ''}">
  <div class="flex items-center gap-3 px-3.5 py-3">
    <button
      class="w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors
             {done ? 'bg-teal border-teal' : 'border-border2'}"
      onclick={toggle}
      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      disabled={readonly}
    >
      {#if done}
        <span class="block w-[5px] h-[9px] border-2 border-white border-t-0 border-l-0 rotate-45 -translate-x-[1px] -translate-y-[1px]"></span>
      {/if}
    </button>
    <button class="flex-1 min-w-0 text-left" onclick={() => (expanded = !expanded)}>
      <div class="text-sm font-medium truncate">{exercise.name}</div>
      <div class="text-xs text-text3 truncate">{exercise.dose ?? ''}</div>
    </button>
    <TagPill focus={exercise.focus} />
    <button
      class="w-[22px] h-[22px] rounded-full border border-border2 flex items-center justify-center flex-shrink-0 text-text3 text-base leading-none transition-colors
             {expanded ? 'bg-surface3 text-text' : ''}"
      onclick={() => (expanded = !expanded)}
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >{expanded ? '−' : '+'}</button>
  </div>

  {#if expanded}
    <div class="border-t border-border px-3.5 pb-3">
      {#if exercise.cue}
        <div class="text-[10px] font-semibold uppercase tracking-wider text-text3 mt-2.5 mb-1">How to do it</div>
        <div class="text-[13px] text-text2 leading-relaxed">{exercise.cue}</div>
      {/if}

      {#if exercise.trackable}
        <div class="text-[10px] font-semibold uppercase tracking-wider text-text3 mt-3 mb-1.5">Log</div>
        <div class="grid grid-cols-4 gap-2">
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Sets</span>
            <input type="number" inputmode="numeric" min="0" class="input-base w-full"
                   bind:value={setsField} oninput={scheduleSave} disabled={readonly} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Reps</span>
            <input type="number" inputmode="numeric" min="0" class="input-base w-full"
                   bind:value={repsField} oninput={scheduleSave} disabled={readonly} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">Load ({exercise.unit})</span>
            <input type="number" inputmode="decimal" step="0.5" min="0" class="input-base w-full"
                   bind:value={loadField} oninput={scheduleSave} disabled={readonly} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-1">RPE</span>
            <input type="number" inputmode="decimal" step="0.5" min="0" max="10" class="input-base w-full"
                   bind:value={rpeField} oninput={scheduleSave} disabled={readonly} />
          </label>
        </div>
      {/if}

      <div class="text-[10px] font-semibold uppercase tracking-wider text-text3 mt-3 mb-1">Notes</div>
      <textarea class="input-base w-full text-[13px] leading-relaxed min-h-[60px]"
                placeholder="How did it feel?" rows="2"
                bind:value={notesField} oninput={scheduleSave} disabled={readonly}></textarea>

      {#if exercise.source}
        <div class="text-[11px] text-text3 mt-2 leading-relaxed p-2 bg-surface2 rounded italic">
          📄 {exercise.source}
        </div>
      {/if}
    </div>
  {/if}
</div>
