<script lang="ts">
  import { data } from '$lib/stores/data.svelte';
  import { dateKey, addDays, DOW_LONG } from '$lib/date';
  import DietEditor from '$lib/components/DietEditor.svelte';
  import MealRow from '$lib/components/MealRow.svelte';
  import { toast } from '$lib/stores/toast.svelte';

  let cursor = $state(new Date());
  const dk = $derived(dateKey(cursor));
  const dayLabel = $derived(DOW_LONG[cursor.getDay()]);

  const meals       = $derived([...data.meals].sort((a, b) => a.position - b.position));
  const supplements = $derived([...data.supplements].sort((a, b) => a.position - b.position));
  const settings    = $derived(data.dietSettings);

  const totals = $derived(data.dayDietTotals(dk));
  const calPct   = $derived(pctOf(totals.calories, settings?.calorie_target ?? null));
  const protPct  = $derived(pctOf(totals.protein,  settings?.protein_target ?? null));
  const waterPct = $derived(pctOf(totals.water_ml, settings?.water_target_ml ?? 3000));

  function shiftDay(n: number) { cursor = addDays(cursor, n); }
  function resetToToday() { cursor = new Date(); }
  const isToday = $derived(dateKey(new Date()) === dk);

  let editing = $state(false);

  function pctOf(num: number, denom: number | null | undefined): number {
    if (!denom || denom <= 0) return 0;
    return Math.min(100, Math.round((num / denom) * 100));
  }

  function pctColor(p: number): string {
    if (p === 0) return 'text-text3';
    if (p >= 100) return 'text-teal';
    if (p >= 60) return 'text-amber';
    return 'text-coral';
  }

  function fmtAmount(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  async function bumpSupplement(suppId: string, delta: number) {
    const current = data.supplementAmount(dk, suppId);
    await data.setSupplementAmount(dk, suppId, current + delta);
  }

  async function addWater(ml: number) {
    const current = totals.water_ml;
    await data.setWater(dk, current + ml);
  }
  async function clearWater() { await data.setWater(dk, 0); }
</script>

<div class="flex items-center justify-between mb-3">
  <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftDay(-1)} aria-label="Previous day">←</button>
  <button class="text-[12px] text-text3 hover:text-text" onclick={resetToToday}>
    {isToday ? 'Today' : new Date(dk + 'T12:00:00').toLocaleDateString()}
  </button>
  <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => shiftDay(1)} aria-label="Next day">→</button>
</div>

<div class="card-xl p-4 mb-4">
  <div class="flex items-center justify-between mb-2.5">
    <div>
      <div class="text-[12px] uppercase tracking-wider text-text3 mb-0.5 font-medium">{dayLabel}</div>
      <div class="text-base font-semibold">Diet</div>
    </div>
    <button class="btn-ghost px-3 py-1.5 text-xs" onclick={() => (editing = true)}>Edit standard diet</button>
  </div>

  <div class="grid grid-cols-3 gap-2">
    <div class="bg-surface2 rounded-lg p-2.5">
      <div class="flex items-center justify-between mb-1">
        <div class="text-[10px] uppercase tracking-wider text-text3">kcal</div>
        {#if totals.pendingMeals > 0}
          <div class="text-[9px] text-amber font-semibold uppercase tracking-wider" title="{totals.pendingMeals} meal(s) without macros">{totals.pendingMeals}!</div>
        {/if}
      </div>
      <div class="text-xl font-bold leading-none {pctColor(calPct)}">{Math.round(totals.calories)}</div>
      <div class="text-[11px] text-text3 mt-1">/ {settings?.calorie_target ?? '–'}</div>
      <div class="h-[3px] bg-border2 rounded-full overflow-hidden mt-1.5">
        <div class="h-full bg-teal" style="width: {calPct}%"></div>
      </div>
    </div>
    <div class="bg-surface2 rounded-lg p-2.5">
      <div class="text-[10px] uppercase tracking-wider text-text3 mb-1">protein</div>
      <div class="text-xl font-bold leading-none {pctColor(protPct)}">{Math.round(totals.protein)}g</div>
      <div class="text-[11px] text-text3 mt-1">/ {settings?.protein_target ?? '–'}g</div>
      <div class="h-[3px] bg-border2 rounded-full overflow-hidden mt-1.5">
        <div class="h-full bg-coral" style="width: {protPct}%"></div>
      </div>
    </div>
    <div class="bg-surface2 rounded-lg p-2.5">
      <div class="text-[10px] uppercase tracking-wider text-text3 mb-1">water</div>
      <div class="text-xl font-bold leading-none {pctColor(waterPct)}">{(totals.water_ml / 1000).toFixed(1)}L</div>
      <div class="text-[11px] text-text3 mt-1">/ {((settings?.water_target_ml ?? 3000) / 1000).toFixed(1)}L</div>
      <div class="h-[3px] bg-border2 rounded-full overflow-hidden mt-1.5">
        <div class="h-full" style="background:#3a9ad9;width: {waterPct}%"></div>
      </div>
    </div>
  </div>
</div>

<div class="grid lg:grid-cols-2 gap-6">
  <!-- ─── meals ─────────────────────────────────────────────────────────── -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Meals</div>
      <div class="text-[12px] text-text3">
        {meals.filter((m) => data.mealCompleted(dk, m.id)).length}/{meals.length}
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      {#each meals as m (m.id)}
        <MealRow meal={m} date={dk} />
      {/each}

      {#if meals.length === 0}
        <div class="card p-4 text-center text-text3 text-[13px]">
          No meals defined. Tap “Edit standard diet” to add some.
        </div>
      {/if}
    </div>
  </div>

  <!-- ─── supplements ───────────────────────────────────────────────────── -->
  <div>
    <div class="flex items-center justify-between mb-2 mt-4 lg:mt-0">
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Supplements</div>
      <div class="text-[12px] text-text3">{supplements.length} tracked</div>
    </div>

    <div class="flex flex-col gap-1.5">
      {#each supplements as s (s.id)}
        {@const amt = data.supplementAmount(dk, s.id)}
        {@const targetMet = s.daily_target > 0 && amt >= s.daily_target}
        <div class="card-xl px-3.5 py-3">
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate flex items-center gap-2">
                {s.name}
                {#if targetMet}<span class="text-teal text-xs">✓</span>{/if}
              </div>
              <div class="text-[11px] text-text3 truncate">
                {#if s.per_unit_amount != null && s.per_unit_label}
                  1 {s.unit} = {s.per_unit_amount}{s.per_unit_label}
                {/if}
                {#if s.per_unit_protein > 0}
                  {s.per_unit_amount != null ? ' · ' : ''}{s.per_unit_protein}g protein/{s.unit}
                {/if}
                {#if s.per_unit_calories > 0}
                  {(s.per_unit_protein > 0 || s.per_unit_amount != null) ? ' · ' : ''}{Math.round(s.per_unit_calories)} kcal/{s.unit}
                {/if}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold {targetMet ? 'text-teal' : 'text-text'}">
                {fmtAmount(amt)}<span class="text-text3 text-[12px]"> / {fmtAmount(s.daily_target)}</span>
              </div>
              <div class="text-[10px] text-text3">{s.unit}{amt === 1 ? '' : 's'}</div>
            </div>
          </div>
          <div class="flex gap-1.5 mt-2">
            <button class="btn-ghost flex-1 py-1 text-xs" onclick={() => bumpSupplement(s.id, -1)} disabled={amt <= 0}>−1</button>
            <button class="btn-ghost flex-1 py-1 text-xs" onclick={() => bumpSupplement(s.id, -0.5)} disabled={amt <= 0}>−½</button>
            <button class="btn-ghost flex-1 py-1 text-xs" onclick={() => bumpSupplement(s.id, 0.5)}>+½</button>
            <button class="btn-primary flex-1 py-1 text-xs" onclick={() => bumpSupplement(s.id, 1)}>+1</button>
          </div>
        </div>
      {/each}

      {#if supplements.length === 0}
        <div class="card p-4 text-center text-text3 text-[13px]">
          No supplements defined. Tap “Edit standard diet” to add protein powder, vitamins, creatine, etc.
        </div>
      {/if}
    </div>

    <!-- ─── water ──────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-2 mt-5">
      <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider">Water</div>
      <button class="text-[11px] text-text3 hover:text-text" onclick={clearWater}>Reset</button>
    </div>
    <div class="card-xl p-3.5">
      <div class="flex items-baseline justify-between mb-2.5">
        <div class="text-2xl font-bold leading-none" style="color:#3a9ad9">{totals.water_ml} <span class="text-base text-text2">ml</span></div>
        <div class="text-[12px] text-text3">/ {settings?.water_target_ml ?? 3000} ml</div>
      </div>
      <div class="grid grid-cols-4 gap-1.5">
        <button class="btn-ghost py-1.5 text-xs" onclick={() => addWater(250)}>+250</button>
        <button class="btn-ghost py-1.5 text-xs" onclick={() => addWater(500)}>+500</button>
        <button class="btn-ghost py-1.5 text-xs" onclick={() => addWater(750)}>+750</button>
        <button class="btn-primary py-1.5 text-xs" onclick={() => addWater(1000)}>+1L</button>
      </div>
    </div>
  </div>
</div>

<DietEditor open={editing} onClose={() => (editing = false)} />
