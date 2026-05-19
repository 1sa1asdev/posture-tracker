<script lang="ts">
  import { toast } from '$lib/stores/toast.svelte';
</script>

{#if toast.visible}
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface3 border border-border2 rounded-full px-4 py-1.5 text-sm text-text z-50 whitespace-nowrap pointer-events-none">
    {toast.message}
  </div>
{/if}
