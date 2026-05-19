<script lang="ts">
  let { children } = $props();
</script>

<div class="min-h-full flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="text-xl font-semibold tracking-tight">Posture Tracker</div>
      <div class="text-xs text-text3 mt-1">Evidence-based corrective protocol</div>
    </div>
    {@render children()}
  </div>
</div>
