<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import type { Routine, Category } from '$lib/types';

  interface Props {
    selected: string[];
    onChange: (ids: string[]) => void;
    filter?: Category | 'all';
  }

  let { selected, onChange, filter = 'all' }: Props = $props();

  const visible = $derived(
    data.routines
      .filter((r) => filter === 'all' || r.category === filter)
      .sort((a, b) => {
        if (a.is_preset !== b.is_preset) return a.is_preset ? -1 : 1;
        return a.position - b.position;
      })
  );

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next);
  }
</script>

<div class="flex flex-col gap-1.5">
  {#each visible as r (r.id)}
    {@const checked = selected.includes(r.id)}
    <button
      class="card flex items-center gap-3 px-3 py-2.5 text-left transition-colors
             {checked ? 'border-teal bg-teal-bg/30' : ''}"
      onclick={() => toggle(r.id)}
    >
      <div class="w-[18px] h-[18px] rounded border-[1.5px] flex items-center justify-center flex-shrink-0
                  {checked ? 'bg-teal border-teal' : 'border-border2'}">
        {#if checked}
          <span class="block w-[4px] h-[8px] border-2 border-white border-t-0 border-l-0 rotate-45 -translate-x-[1px] -translate-y-[1px]"></span>
        {/if}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{r.name}</div>
        <div class="text-[11px] text-text3 truncate">
          {r.is_preset ? 'Preset' : 'Custom'} · {r.category} · {r.time_estimate ?? ''}
        </div>
      </div>
    </button>
  {/each}
  {#if visible.length === 0}
    <div class="text-sm text-text3 py-4 text-center">No routines.</div>
  {/if}
</div>
