<script lang="ts">
  import type { Habit } from '$lib/types';
  import { data } from '$lib/stores/data.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import TagPill from './TagPill.svelte';

  interface Props { habit: Habit; date: string; }
  let { habit, date }: Props = $props();

  let expanded = $state(false);
  const done = $derived(data.habitDone(date, habit.id));

  async function toggle() {
    await data.toggleHabit(date, habit.id, !done);
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
    >
      {#if done}
        <span class="block w-[5px] h-[9px] border-2 border-white border-t-0 border-l-0 rotate-45 -translate-x-[1px] -translate-y-[1px]"></span>
      {/if}
    </button>
    <button class="flex-1 min-w-0 text-left" onclick={() => (expanded = !expanded)}>
      <div class="text-sm font-medium truncate">{habit.name}</div>
      <div class="text-xs text-text3 truncate">{habit.dose}</div>
    </button>
    <TagPill focus={habit.focus} />
    <button
      class="w-[22px] h-[22px] rounded-full border border-border2 flex items-center justify-center flex-shrink-0 text-text3 text-base leading-none transition-colors
             {expanded ? 'bg-surface3 text-text' : ''}"
      onclick={() => (expanded = !expanded)}
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >{expanded ? '−' : '+'}</button>
  </div>

  {#if expanded}
    <div class="border-t border-border px-3.5 pb-3">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-text3 mt-2.5 mb-1">How to do it</div>
      <div class="text-[13px] text-text2 leading-relaxed">{habit.cue}</div>
      {#if habit.source}
        <div class="text-[11px] text-text3 mt-2 leading-relaxed p-2 bg-surface2 rounded italic">
          📄 {habit.source}
        </div>
      {/if}
    </div>
  {/if}
</div>
