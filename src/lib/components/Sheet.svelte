<script lang="ts">
  import { fly, fade } from 'svelte/transition';

  interface Props {
    open: boolean;
    title?: string;
    onClose: () => void;
    children: import('svelte').Snippet;
  }

  let { open, title, onClose, children }: Props = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
       transition:fade={{ duration: 150 }}
       role="dialog" aria-modal="true">
    <div class="absolute inset-0 bg-black/60" onclick={onClose} aria-hidden="true"></div>
    <div class="relative bg-surface border-t border-border sm:border sm:rounded-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-xl"
         transition:fly={{ y: 30, duration: 220 }}>
      {#if title}
        <div class="sticky top-0 bg-surface border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold">{title}</h2>
          <button class="text-text3 hover:text-text text-xl leading-none" onclick={onClose} aria-label="Close">×</button>
        </div>
      {/if}
      <div class="p-5">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
