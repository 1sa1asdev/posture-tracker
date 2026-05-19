<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { supabase } from '$lib/supabase';

  let email     = $state('');
  let username  = $state('');
  let password  = $state('');
  let loading   = $state(false);
  let error     = $state<string | null>(null);

  function validateUsername(u: string): string | null {
    const norm = u.trim().toLowerCase();
    if (norm.length < 2 || norm.length > 32) return 'Username must be 2–32 characters.';
    if (!/^[a-z0-9_]+$/.test(norm)) return 'Username can only contain lowercase letters, digits, and underscores.';
    return null;
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    const uname = username.trim().toLowerCase();
    const uerr = validateUsername(uname);
    if (uerr) { error = uerr; return; }
    if (password.length < 8) { error = 'Password must be at least 8 characters.'; return; }

    loading = true;

    // Pre-check uniqueness via security-definer RPC (RLS would otherwise hide all rows for anon).
    const { data: avail, error: rpcErr } = await supabase.rpc('username_available', { p: uname });
    if (rpcErr) {
      loading = false;
      error = rpcErr.message;
      return;
    }
    if (avail === false) {
      loading = false;
      error = 'That username is taken.';
      return;
    }

    const emailRedirectTo = `${window.location.origin}${base}/auth/callback`;
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: uname }, emailRedirectTo }
    });
    loading = false;
    if (err) { error = err.message; return; }
    goto(`${base}/auth/check-email`);
  }
</script>

<form class="card-xl p-5 flex flex-col gap-3" onsubmit={submit}>
  <h1 class="text-base font-semibold mb-1">Create account</h1>

  <label class="block">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Email</span>
    <input type="email" required autocomplete="email" class="input-base w-full"
           bind:value={email} disabled={loading} />
  </label>

  <label class="block">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Username</span>
    <input type="text" required minlength="2" maxlength="32" autocomplete="username"
           pattern="[a-zA-Z0-9_]+"
           placeholder="lowercase, no spaces"
           class="input-base w-full"
           bind:value={username} disabled={loading} />
  </label>

  <label class="block">
    <span class="block text-[11px] text-text3 mb-1 uppercase tracking-wider">Password</span>
    <input type="password" required autocomplete="new-password" minlength="8" class="input-base w-full"
           bind:value={password} disabled={loading} />
    <span class="block text-[10px] text-text3 mt-1">8+ characters.</span>
  </label>

  {#if error}
    <div class="text-[13px] text-red bg-red-bg border border-red rounded p-2">{error}</div>
  {/if}

  <button class="btn-primary mt-1" disabled={loading} type="submit">
    {loading ? 'Creating…' : 'Create account'}
  </button>

  <div class="text-[12px] text-text3 text-center mt-2">
    Already have one? <a class="text-teal hover:underline" href="{base}/auth/signin">Sign in</a>
  </div>
</form>
