<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { session } from '$lib/stores/session.svelte';
  import RoutineEditor from '$lib/components/RoutineEditor.svelte';
  import type { Routine } from '$lib/types';

  const userGym = $derived(
    data.routines.filter((r) => !r.is_preset && r.category === 'gym' && r.user_id === session.user?.id)
  );

  let editing  = $state<Routine | null>(null);
  let creating = $state(false);
  let newName  = $state('');
  let newTime  = $state('');

  async function createGym() {
    if (!newName.trim()) return;
    const r = await data.createRoutine(newName.trim(), 'gym', newTime.trim() || undefined);
    newName = ''; newTime = ''; creating = false;
    if (r) editing = r;
  }
</script>

<div class="flex items-center justify-between mb-3">
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Gym routines</div>
  <button class="text-[12px] text-teal hover:underline" onclick={() => (creating = !creating)}>
    {creating ? 'Cancel' : '+ New'}
  </button>
</div>

<p class="text-[12px] text-text3 leading-relaxed mb-3 max-w-2xl">
  Build your own routines. Schedule them in the calendar alongside rehab. Load / reps / RPE history feeds the stats tab.
</p>

{#if creating}
  <div class="card p-3 mb-3 flex flex-col gap-2 max-w-md">
    <input class="input-base w-full" placeholder="Routine name (e.g. Push, Pull, Legs)" bind:value={newName} />
    <input class="input-base w-full" placeholder="Time estimate (optional)" bind:value={newTime} />
    <button class="btn-primary" onclick={createGym}>Create</button>
  </div>
{/if}

<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
  {#each userGym as r (r.id)}
    {@const exs = data.exercisesByRoutine.get(r.id) ?? []}
    <button class="card flex items-center gap-3 px-3.5 py-3 text-left" onclick={() => (editing = r)}>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{r.name}</div>
        <div class="text-[11px] text-text3 truncate">{exs.length} exercises · {r.time_estimate ?? ''}</div>
      </div>
      <div class="text-text3 text-sm">›</div>
    </button>
  {/each}
  {#if userGym.length === 0 && !creating}
    <div class="text-[12px] text-text3 py-6 text-center sm:col-span-2 lg:col-span-3">
      <div class="text-2xl mb-2">🏋️</div>
      No gym routines yet. Tap “+ New” to start.
    </div>
  {/if}
</div>

{#if editing}
  <RoutineEditor routine={editing} open={editing !== null} onClose={() => (editing = null)} />
{/if}
