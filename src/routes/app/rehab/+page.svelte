<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { session } from '$lib/stores/session.svelte';
  import RoutineEditor from '$lib/components/RoutineEditor.svelte';
  import ExerciseRow from '$lib/components/ExerciseRow.svelte';
  import { dateKey } from '$lib/date';
  import type { Routine } from '$lib/types';

  const today = $derived(dateKey());
  const presets = $derived(
    data.routines.filter((r) => r.is_preset && r.category === 'rehab').sort((a, b) => a.position - b.position)
  );
  const userRehab = $derived(
    data.routines.filter((r) => !r.is_preset && r.category === 'rehab' && r.user_id === session.user?.id)
  );

  let openRoutine = $state<string | null>(null);
  let editing     = $state<Routine | null>(null);

  let creating  = $state(false);
  let newName   = $state('');
  let newTime   = $state('');

  async function createRehab() {
    if (!newName.trim()) return;
    const r = await data.createRoutine(newName.trim(), 'rehab', newTime.trim() || undefined);
    newName = ''; newTime = ''; creating = false;
    if (r) editing = r;
  }
</script>

<div class="flex items-center justify-between mb-3">
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Preset protocols</div>
  <div class="text-[10px] text-text3">Locked — research-backed</div>
</div>

<div class="flex flex-col gap-1.5 mb-5">
  {#each presets as r (r.id)}
    {@const exs = data.exercisesByRoutine.get(r.id) ?? []}
    <div class="card-xl overflow-hidden">
      <button class="w-full flex items-center gap-3 px-3.5 py-3 text-left" onclick={() => (openRoutine = openRoutine === r.id ? null : r.id)}>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{r.name}</div>
          <div class="text-[11px] text-text3 truncate">{exs.length} exercises · {r.time_estimate ?? ''}</div>
        </div>
        <div class="text-text3 text-base">{openRoutine === r.id ? '−' : '+'}</div>
      </button>
      {#if openRoutine === r.id}
        <div class="border-t border-border px-3.5 py-3 flex flex-col gap-1.5">
          {#each exs as ex (ex.id)}
            <ExerciseRow exercise={ex} date={today} />
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<div class="flex items-center justify-between mb-3">
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Custom rehab routines</div>
  <button class="text-[12px] text-teal hover:underline" onclick={() => (creating = !creating)}>
    {creating ? 'Cancel' : '+ New'}
  </button>
</div>

{#if creating}
  <div class="card p-3 mb-3 flex flex-col gap-2">
    <input class="input-base w-full" placeholder="Routine name" bind:value={newName} />
    <input class="input-base w-full" placeholder="Time estimate (optional)" bind:value={newTime} />
    <button class="btn-primary" onclick={createRehab}>Create</button>
  </div>
{/if}

<div class="flex flex-col gap-1.5">
  {#each userRehab as r (r.id)}
    {@const exs = data.exercisesByRoutine.get(r.id) ?? []}
    <button class="card flex items-center gap-3 px-3.5 py-3 text-left" onclick={() => (editing = r)}>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{r.name}</div>
        <div class="text-[11px] text-text3 truncate">{exs.length} exercises · {r.time_estimate ?? ''}</div>
      </div>
      <div class="text-text3 text-sm">›</div>
    </button>
  {/each}
  {#if userRehab.length === 0 && !creating}
    <div class="text-[12px] text-text3 py-2 text-center">None yet.</div>
  {/if}
</div>

{#if editing}
  <RoutineEditor routine={editing} open={editing !== null} onClose={() => (editing = null)} />
{/if}
