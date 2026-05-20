<script lang="ts">
  import Sheet from './Sheet.svelte';
  import { data } from '$lib/stores/data.svelte';
  import type { Meal, Supplement, SupplementUnit } from '$lib/types';

  interface Props { open: boolean; onClose: () => void; }
  let { open, onClose }: Props = $props();

  const meals       = $derived([...data.meals].sort((a, b) => a.position - b.position));
  const supplements = $derived([...data.supplements].sort((a, b) => a.position - b.position));
  const settings    = $derived(data.dietSettings);

  let calTarget   = $state<string>('');
  let protTarget  = $state<string>('');
  let waterTarget = $state<string>('');
  $effect(() => {
    calTarget   = settings?.calorie_target  != null ? String(settings.calorie_target)  : '';
    protTarget  = settings?.protein_target  != null ? String(settings.protein_target)  : '';
    waterTarget = settings?.water_target_ml != null ? String(settings.water_target_ml) : '3000';
  });

  let targetsTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleTargetsSave() {
    if (targetsTimer) clearTimeout(targetsTimer);
    targetsTimer = setTimeout(() => {
      data.updateDietSettings({
        calorie_target:  calTarget   === '' ? null : Number(calTarget),
        protein_target:  protTarget  === '' ? null : Number(protTarget),
        water_target_ml: waterTarget === '' ? 3000 : Number(waterTarget)
      });
    }, 500);
  }

  // ─── meals add form ────────────────────────────────────────────────────────
  let mealName     = $state('');
  let mealCalories = $state('');
  let mealProtein  = $state('');

  async function addMeal() {
    if (!mealName.trim()) return;
    await data.createMeal(
      mealName.trim(),
      mealCalories === '' ? null : Number(mealCalories),
      mealProtein  === '' ? null : Number(mealProtein)
    );
    mealName = ''; mealCalories = ''; mealProtein = '';
  }

  async function deleteMeal(id: string) {
    if (!confirm('Remove this meal? Logged history stays.')) return;
    await data.deleteMeal(id);
  }

  // inline meal edit
  function patchMeal(m: Meal, field: 'name' | 'calories' | 'protein', val: string) {
    const next: Partial<Meal> = {};
    if (field === 'name') next.name = val;
    else if (field === 'calories') next.calories = val === '' ? null : Number(val);
    else if (field === 'protein')  next.protein  = val === '' ? null : Number(val);
    data.updateMeal(m.id, next);
  }

  // ─── supplements add form ──────────────────────────────────────────────────
  let supName    = $state('');
  let supUnit    = $state<SupplementUnit>('pill');
  let supProtein = $state('');
  let supCal     = $state('');
  let supAmount  = $state('');
  let supLabel   = $state('');
  let supTarget  = $state('1');

  const unitOptions: SupplementUnit[] = ['pill','capsule','scoop','tablet','gummy','ml','g'];

  async function addSupplement() {
    if (!supName.trim()) return;
    await data.createSupplement({
      name: supName.trim(),
      unit: supUnit,
      per_unit_protein:  Number(supProtein) || 0,
      per_unit_calories: Number(supCal) || 0,
      per_unit_amount:   supAmount === '' ? null : Number(supAmount),
      per_unit_label:    supLabel.trim() || null,
      daily_target:      Number(supTarget) || 0
    });
    supName = ''; supProtein = ''; supCal = ''; supAmount = ''; supLabel = ''; supTarget = '1';
    supUnit = 'pill';
  }

  async function deleteSupplement(id: string) {
    if (!confirm('Remove this supplement? Logged history stays.')) return;
    await data.deleteSupplement(id);
  }

  function patchSupplement<K extends keyof Supplement>(s: Supplement, field: K, raw: string) {
    const numeric = ['per_unit_protein','per_unit_calories','per_unit_amount','daily_target'] as const;
    type NumericKey = typeof numeric[number];
    const next: Partial<Supplement> = {};
    if ((numeric as readonly string[]).includes(field as string)) {
      (next as Record<NumericKey, number | null>)[field as NumericKey] = raw === '' ? null : Number(raw);
    } else {
      (next as Record<string, string>)[field as string] = raw;
    }
    data.updateSupplement(s.id, next);
  }
</script>

<Sheet open={open} title="Edit standard diet" onClose={onClose}>
  <!-- ─── targets ──────────────────────────────────────────────────────── -->
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Daily targets</div>
  <div class="grid grid-cols-3 gap-2 mb-5">
    <label class="block">
      <span class="block text-[10px] text-text3 mb-1">Calories</span>
      <input type="number" inputmode="numeric" min="0" class="input-base w-full"
             bind:value={calTarget} oninput={scheduleTargetsSave} />
    </label>
    <label class="block">
      <span class="block text-[10px] text-text3 mb-1">Protein (g)</span>
      <input type="number" inputmode="numeric" min="0" class="input-base w-full"
             bind:value={protTarget} oninput={scheduleTargetsSave} />
    </label>
    <label class="block">
      <span class="block text-[10px] text-text3 mb-1">Water (ml)</span>
      <input type="number" inputmode="numeric" min="0" step="100" class="input-base w-full"
             bind:value={waterTarget} oninput={scheduleTargetsSave} />
    </label>
  </div>

  <!-- ─── meals ────────────────────────────────────────────────────────── -->
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Meals</div>
  <div class="flex flex-col gap-1.5 mb-3">
    {#each meals as m (m.id)}
      <div class="card p-2.5 flex items-center gap-2">
        <input class="input-base flex-1 min-w-0" value={m.name}
               oninput={(e) => patchMeal(m, 'name', (e.target as HTMLInputElement).value)} />
        <input type="number" min="0" class="input-base w-20" placeholder="kcal"
               value={m.calories ?? ''}
               oninput={(e) => patchMeal(m, 'calories', (e.target as HTMLInputElement).value)} />
        <input type="number" min="0" step="0.5" class="input-base w-16" placeholder="prot"
               value={m.protein ?? ''}
               oninput={(e) => patchMeal(m, 'protein', (e.target as HTMLInputElement).value)} />
        <button class="text-text3 hover:text-red text-sm" onclick={() => deleteMeal(m.id)} aria-label="Delete">×</button>
      </div>
    {/each}
    {#if meals.length === 0}
      <div class="text-[12px] text-text3 text-center py-1">No meals yet.</div>
    {/if}
  </div>
  <div class="card p-2.5 flex items-center gap-2 mb-5">
    <input class="input-base flex-1 min-w-0" placeholder="Meal name" bind:value={mealName} />
    <input type="number" min="0" class="input-base w-20" placeholder="kcal" bind:value={mealCalories} />
    <input type="number" min="0" step="0.5" class="input-base w-16" placeholder="prot" bind:value={mealProtein} />
    <button class="btn-primary px-3 py-1.5 text-xs" onclick={addMeal}>Add</button>
  </div>

  <!-- ─── supplements ──────────────────────────────────────────────────── -->
  <div class="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Supplements</div>
  <div class="flex flex-col gap-2 mb-3">
    {#each supplements as s (s.id)}
      <div class="card p-2.5">
        <div class="flex items-center gap-2 mb-1.5">
          <input class="input-base flex-1 min-w-0" value={s.name}
                 oninput={(e) => patchSupplement(s, 'name', (e.target as HTMLInputElement).value)} />
          <select class="input-base w-24"
                  value={s.unit}
                  onchange={(e) => patchSupplement(s, 'unit', (e.target as HTMLSelectElement).value)}>
            {#each unitOptions as u}<option value={u}>{u}</option>{/each}
          </select>
          <button class="text-text3 hover:text-red text-sm" onclick={() => deleteSupplement(s.id)} aria-label="Delete">×</button>
        </div>
        <div class="grid grid-cols-5 gap-1.5">
          <label class="block">
            <span class="block text-[10px] text-text3 mb-0.5">Target /day</span>
            <input type="number" min="0" step="0.5" class="input-base w-full" value={s.daily_target}
                   oninput={(e) => patchSupplement(s, 'daily_target', (e.target as HTMLInputElement).value)} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-0.5">Protein/u</span>
            <input type="number" min="0" step="0.5" class="input-base w-full" value={s.per_unit_protein}
                   oninput={(e) => patchSupplement(s, 'per_unit_protein', (e.target as HTMLInputElement).value)} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-0.5">kcal/u</span>
            <input type="number" min="0" class="input-base w-full" value={s.per_unit_calories}
                   oninput={(e) => patchSupplement(s, 'per_unit_calories', (e.target as HTMLInputElement).value)} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-0.5">Amount/u</span>
            <input type="number" min="0" step="any" class="input-base w-full" value={s.per_unit_amount ?? ''}
                   oninput={(e) => patchSupplement(s, 'per_unit_amount', (e.target as HTMLInputElement).value)} />
          </label>
          <label class="block">
            <span class="block text-[10px] text-text3 mb-0.5">Label</span>
            <input class="input-base w-full" placeholder="IU/mg/g" value={s.per_unit_label ?? ''}
                   oninput={(e) => patchSupplement(s, 'per_unit_label', (e.target as HTMLInputElement).value)} />
          </label>
        </div>
      </div>
    {/each}
    {#if supplements.length === 0}
      <div class="text-[12px] text-text3 text-center py-1">No supplements yet.</div>
    {/if}
  </div>

  <div class="card p-2.5 mb-3">
    <div class="flex items-center gap-2 mb-1.5">
      <input class="input-base flex-1 min-w-0" placeholder="Supplement name (e.g. Whey, Vit D3)" bind:value={supName} />
      <select class="input-base w-24" bind:value={supUnit}>
        {#each unitOptions as u}<option value={u}>{u}</option>{/each}
      </select>
    </div>
    <div class="grid grid-cols-5 gap-1.5">
      <label class="block">
        <span class="block text-[10px] text-text3 mb-0.5">Target /day</span>
        <input type="number" min="0" step="0.5" class="input-base w-full" bind:value={supTarget} />
      </label>
      <label class="block">
        <span class="block text-[10px] text-text3 mb-0.5">Protein/u</span>
        <input type="number" min="0" step="0.5" class="input-base w-full" bind:value={supProtein} />
      </label>
      <label class="block">
        <span class="block text-[10px] text-text3 mb-0.5">kcal/u</span>
        <input type="number" min="0" class="input-base w-full" bind:value={supCal} />
      </label>
      <label class="block">
        <span class="block text-[10px] text-text3 mb-0.5">Amount/u</span>
        <input type="number" min="0" step="any" class="input-base w-full" bind:value={supAmount} />
      </label>
      <label class="block">
        <span class="block text-[10px] text-text3 mb-0.5">Label</span>
        <input class="input-base w-full" placeholder="IU/mg/g" bind:value={supLabel} />
      </label>
    </div>
    <button class="btn-primary w-full mt-2 py-1.5 text-xs" onclick={addSupplement}>Add supplement</button>
  </div>

  <button class="btn-ghost w-full" onclick={onClose}>Done</button>
</Sheet>
