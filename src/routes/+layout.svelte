<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { session } from '$lib/stores/session.svelte';
  import { data } from '$lib/stores/data.svelte';

  let { children } = $props();

  onMount(async () => {
    await session.init();
    const path = $page.url.pathname.replace(base, '');
    const isAuthRoute = path.startsWith('/auth');
    if (session.user) {
      await data.loadAll();
      if (isAuthRoute || path === '/' || path === '') goto(`${base}/app/today`);
    } else {
      if (!isAuthRoute) goto(`${base}/auth/signin`);
    }
  });
</script>

{#if session.ready}
  {@render children()}
{:else}
  <div class="flex h-full items-center justify-center text-text3 text-sm">Loading…</div>
{/if}
