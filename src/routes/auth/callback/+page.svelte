<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { supabase } from '$lib/supabase';
  import { session } from '$lib/stores/session.svelte';
  import { data } from '$lib/stores/data.svelte';

  let status = $state<'pending' | 'ok' | 'error'>('pending');
  let message = $state('Finishing sign in…');

  onMount(async () => {
    try {
      // Supabase auth-helpers will pick up tokens from the URL via detectSessionInUrl.
      // Give it a tick to settle, then read.
      await new Promise((r) => setTimeout(r, 250));
      const { data: s } = await supabase.auth.getSession();
      if (s.session) {
        await session.init();
        await data.loadAll();
        status = 'ok';
        message = 'Signed in. Redirecting…';
        setTimeout(() => goto(`${base}/app/today`), 600);
      } else {
        status = 'error';
        message = 'Could not complete sign in.';
      }
    } catch (e: unknown) {
      status = 'error';
      message = e instanceof Error ? e.message : 'Unknown error.';
    }
  });
</script>

<div class="card-xl p-6 text-center flex flex-col gap-3">
  <div class="text-3xl">
    {#if status === 'pending'}⏳{:else if status === 'ok'}✅{:else}⚠️{/if}
  </div>
  <p class="text-[13px] text-text2">{message}</p>
  {#if status === 'error'}
    <a href="{base}/auth/signin" class="btn-ghost mt-2">Back to sign in</a>
  {/if}
</div>
