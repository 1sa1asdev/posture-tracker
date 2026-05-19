<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { supabase } from '$lib/supabase';
  import { session } from '$lib/stores/session.svelte';
  import { data } from '$lib/stores/data.svelte';

  let email    = $state('');
  let password = $state('');
  let loading  = $state(false);
  let error    = $state<string | null>(null);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    loading = true;
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    loading = false;
    if (err) { error = err.message; return; }
    await session.init();
    await data.loadAll();
    goto(`${base}/app/today`);
  }
</script>

<form class="card-xl p-5 flex flex-col gap-3" onsubmit={submit}>
  <h1 class="text-base font-semibold mb-1">Sign in</h1>

  <label class="block">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Email</span>
    <input type="email" required autocomplete="email" class="input-base w-full"
           bind:value={email} disabled={loading} />
  </label>

  <label class="block">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Password</span>
    <input type="password" required autocomplete="current-password" minlength="8" class="input-base w-full"
           bind:value={password} disabled={loading} />
  </label>

  {#if error}
    <div class="text-[13px] text-red bg-red-bg border border-red rounded p-2">{error}</div>
  {/if}

  <button class="btn-primary mt-1" disabled={loading} type="submit">
    {loading ? 'Signing in…' : 'Sign in'}
  </button>

  <div class="text-[12px] text-text3 text-center mt-2">
    No account? <a class="text-teal hover:underline" href="{base}/auth/signup">Create one</a>
  </div>
</form>
