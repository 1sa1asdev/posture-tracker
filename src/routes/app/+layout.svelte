<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { session } from '$lib/stores/session.svelte';
  import { data } from '$lib/stores/data.svelte';
  import { dateKey, weekStart, addDays } from '$lib/date';
  import Toast from '$lib/components/Toast.svelte';

  const tabs = [
    { href: '/app/today',    label: 'Today',    short: 'Today',    icon: '◐' },
    { href: '/app/calendar', label: 'Calendar', short: 'Cal',      icon: '◰' },
    { href: '/app/rehab',    label: 'Rehab',    short: 'Rehab',    icon: '✚' },
    { href: '/app/gym',      label: 'Gym',      short: 'Gym',      icon: '◆' },
    { href: '/app/stats',    label: 'Stats',    short: 'Stats',    icon: '◢' }
  ];

  const path = $derived($page.url.pathname.replace(base, ''));

  const weekRange = $derived.by(() => {
    const start = weekStart(new Date());
    const end = addDays(start, 6);
    const f = (x: Date) => `${x.getDate()} ${x.toLocaleString('default', { month: 'short' })}`;
    return `Week of ${f(start)} – ${f(end)}`;
  });

  const streak = $derived.by(() => {
    const weeks: { start: string; pct: number }[] = [];
    for (let i = 1; i <= 26; i++) {
      const wStart = addDays(weekStart(new Date()), -7 * i);
      const wDays = Array.from({ length: 7 }, (_, k) => dateKey(addDays(wStart, k)));
      let total = 0, done = 0;
      for (const dk of wDays) {
        const routines = data.routinesForDate(dk);
        for (const r of routines) {
          const exs = data.exercisesByRoutine.get(r.id) ?? [];
          total += exs.length;
          for (const ex of exs) if (data.logFor(dk, ex.id)?.completed) done++;
        }
      }
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      weeks.push({ start: dateKey(wStart), pct });
    }
    let s = 0;
    for (const w of weeks) { if (w.pct >= 70) s++; else break; }
    return s;
  });

  function syncDotClass(state: string): string {
    if (state === 'ok') return 'bg-teal';
    if (state === 'pending') return 'bg-amber pulse-soft';
    if (state === 'error') return 'bg-red';
    return 'bg-border2';
  }
  function syncLabel(state: string): string {
    if (state === 'ok') return 'Synced';
    if (state === 'pending') return 'Syncing…';
    if (state === 'error') return 'Sync failed';
    return 'Idle';
  }

  async function signOut() {
    await session.signOut();
    data.reset();
    goto(`${base}/auth/signin`);
  }

  let { children } = $props();
</script>

<div class="flex flex-col md:flex-row h-full">
  <!-- ── Sidebar (md+) ──────────────────────────────────────────────────── -->
  <aside class="hidden md:flex md:w-56 lg:w-64 flex-col border-r border-border flex-shrink-0">
    <div class="px-5 pt-6 pb-4">
      <div class="text-base font-semibold tracking-tight">Posture Tracker</div>
      <div class="text-[11px] text-text3 mt-0.5">{weekRange}</div>
    </div>

    <div class="mx-5 mb-3 flex items-center gap-1.5 bg-amber-bg border border-amber rounded-full px-2.5 py-1 text-[12px] font-semibold text-amber w-fit">
      🔥 <span>{streak}</span> <span class="text-[10px] font-normal opacity-80">week streak</span>
    </div>

    <nav class="flex flex-col gap-0.5 px-2 mt-2">
      {#each tabs as t (t.href)}
        {@const active = path === t.href || path.startsWith(t.href + '/')}
        <a href="{base}{t.href}"
           class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  {active ? 'bg-surface text-text' : 'text-text2 hover:bg-surface/60 hover:text-text'}">
          <span class="text-[14px] {active ? 'text-teal' : 'text-text3'}">{t.icon}</span>
          <span>{t.label}</span>
        </a>
      {/each}
    </nav>

    <div class="mt-auto px-5 py-4 border-t border-border">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-1.5 h-1.5 rounded-full {syncDotClass(data.syncState)}"></div>
        <div class="text-[11px] text-text3">{syncLabel(data.syncState)}</div>
      </div>
      <div class="text-[12px] text-text2 truncate">
        {session.profile?.username ? `@${session.profile.username}` : session.user?.email ?? ''}
      </div>
      <button class="text-[11px] text-text3 hover:text-text mt-1.5" onclick={signOut}>Sign out</button>
    </div>
  </aside>

  <!-- ── Mobile header (< md) ───────────────────────────────────────────── -->
  <header class="md:hidden px-5 pt-[max(env(safe-area-inset-top),16px)] pb-2.5 flex-shrink-0 max-w-[520px] mx-auto w-full">
    <div class="flex items-center justify-between mb-0.5">
      <div class="text-lg font-semibold tracking-tight">Posture Tracker</div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-amber-bg border border-amber rounded-full px-2 py-0.5 text-[12px] font-semibold text-amber">
          🔥 <span>{streak}</span>
        </div>
        <button class="text-[11px] text-text3 hover:text-text" onclick={signOut} title="Sign out">⎋</button>
      </div>
    </div>
    <div class="text-[12px] text-text3 tracking-wide">{weekRange}</div>
    <div class="flex items-center gap-1.5 mt-0.5">
      <div class="w-1.5 h-1.5 rounded-full {syncDotClass(data.syncState)}"></div>
      <div class="text-[11px] text-text3">
        {session.profile?.username ? `@${session.profile.username} · ` : ''}{syncLabel(data.syncState)}
      </div>
    </div>
  </header>

  <!-- ── Mobile tab bar (< md) ──────────────────────────────────────────── -->
  <nav class="md:hidden grid grid-cols-5 border-b border-border flex-shrink-0 max-w-[520px] mx-auto w-full">
    {#each tabs as t (t.href)}
      {@const active = path === t.href || path.startsWith(t.href + '/')}
      <a href="{base}{t.href}"
         class="text-center py-3 text-[12px] font-medium tracking-wider uppercase border-b-2
                {active ? 'text-teal border-teal' : 'text-text3 border-transparent'}">
        {t.short}
      </a>
    {/each}
  </nav>

  <!-- ── Main content ───────────────────────────────────────────────────── -->
  <main class="flex-1 overflow-y-auto px-5 md:px-10 py-4 md:py-8 pb-[max(32px,env(safe-area-inset-bottom))]">
    <div class="mx-auto w-full max-w-[520px] md:max-w-3xl">
      {@render children()}
    </div>
  </main>
</div>

<Toast />
