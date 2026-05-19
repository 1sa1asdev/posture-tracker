<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  onMount(() => goto(`${base}/app/today`));
</script>

<div class="flex h-full items-center justify-center text-text3 text-sm">Loading…</div>
