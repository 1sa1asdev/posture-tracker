<script lang="ts">
  import type { Meal } from '$lib/types';
  import { data } from '$lib/stores/data.svelte';
  import { toast } from '$lib/stores/toast.svelte';

  interface Props { meal: Meal; date: string; }
  let { meal, date }: Props = $props();

  let expanded = $state(false);

  const done = $derived(data.mealCompleted(date, meal.id));
  const eff  = $derived(data.effectiveMealMacros(date, meal.id));
  const log  = $derived(data.mealsLog.find((l) => l.date === date && l.meal_id === meal.id));

  // Pending = checked but no macros available anywhere → auto-expand to prompt.
  const pending = $derived(done && eff.calories == null && eff.protein == null);
  $effect(() => { if (pending) expanded = true; });

  let calField  = $state('');
  let protField = $state('');
  $effect(() => {
    // Display log overrides if set; otherwise leave blank (placeholder shows template).
    calField  = log?.calories != null ? String(log.calories) : '';
    protField = log?.protein  != null ? String(log.protein)  : '';
  });

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave(field: 'calories' | 'protein') {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const payload = {
        [field]: (field === 'calories' ? calField : protField) === ''
          ? null
          : Number(field === 'calories' ? calField : protField)
      } as { calories?: number | null; protein?: number | null };
      data.setMealMacros(date, meal.id, payload);
    }, 500);
  }

  async function toggle() {
    await data.toggleMeal(date, meal.id, !done);
    if (!done) toast.show('✓');
  }

  function resetOverride(field: 'calories' | 'protein') {
    if (field === 'calories') calField = '';
    else protField = '';
    data.setMealMacros(date, meal.id, { [field]: null });
  }

  function fmt(n: number | null): string {
    if (n == null) return '—';
    return String(Math.round(n));
  }
</script>

<div class="card-xl overflow-hidden transition-opacity {done && !pending ? 'opacity-60' : ''}">
  <div class="flex items-center gap-3 px-3.5 py-3">
    <button
      class="w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors
             {done ? 'bg-teal border-teal' : 'border-border2'}"
      onclick={toggle}
      aria-label={done ? 'Mark not eaten' : 'Mark eaten'}
    >
      {#if done}
        <span class="block w-[5px] h-[9px] border-2 border-white border-t-0 border-l-0 rotate-45 -translate-x-[1px] -translate-y-[1px]"></span>
      {/if}
    </button>

    <button class="flex-1 min-w-0 text-left" onclick={() => (expanded = !expanded)}>
      <div class="text-sm font-medium truncate flex items-center gap-2">
        {meal.name}
        {#if pending}<span class="text-[10px] text-amber font-semibold uppercase tracking-wider">set macros</span>{/if}
      </div>
      <div class="text-[11px] text-text3 truncate">
        {fmt(eff.calories)} kcal · {fmt(eff.protein)}g protein
        {#if log && (log.calories != null || log.protein != null)}
          <span class="text-teal/80 ml-1">· custom</span>
        {/if}
      </div>
    </button>

    <button
      class="w-[22px] h-[22px] rounded-full border border-border2 flex items-center justify-center flex-shrink-0 text-text3 text-base leading-none transition-colors
             {expanded ? 'bg-surface3 text-text' : ''}"
      onclick={() => (expanded = !expanded)}
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >{expanded ? '−' : '+'}</button>
  </div>

  {#if expanded}
    <div class="border-t border-border px-3.5 py-3">
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] text-text3 uppercase tracking-wider">Calories</span>
            {#if log?.calories != null}
              <button class="text-[10px] text-text3 hover:text-text" onclick={() => resetOverride('calories')}>reset</button>
            {/if}
          </div>
          <input type="number" inputmode="numeric" min="0" class="input-base w-full"
                 placeholder={meal.calories != null ? String(meal.calories) : 'kcal'}
                 bind:value={calField}
                 oninput={() => scheduleSave('calories')} />
          <div class="text-[10px] text-text3 mt-0.5">
            {#if log?.calories != null}custom value{:else if meal.calories != null}using template{:else}none set{/if}
          </div>
        </label>

        <label class="block">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] text-text3 uppercase tracking-wider">Protein (g)</span>
            {#if log?.protein != null}
              <button class="text-[10px] text-text3 hover:text-text" onclick={() => resetOverride('protein')}>reset</button>
            {/if}
          </div>
          <input type="number" inputmode="decimal" step="0.5" min="0" class="input-base w-full"
                 placeholder={meal.protein != null ? String(meal.protein) : 'g'}
                 bind:value={protField}
                 oninput={() => scheduleSave('protein')} />
          <div class="text-[10px] text-text3 mt-0.5">
            {#if log?.protein != null}custom value{:else if meal.protein != null}using template{:else}none set{/if}
          </div>
        </label>
      </div>
    </div>
  {/if}
</div>
