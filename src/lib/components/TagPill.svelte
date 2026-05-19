<script lang="ts">
  import type { Focus } from '$lib/types';
  interface Props { focus: Focus; }
  let { focus }: Props = $props();

  const label: Record<Focus, string> = {
    ucs: 'Chest',
    apt: 'Pelvis',
    gait: 'Gait',
    strength: 'Strength',
    mobility: 'Mobility',
    both: 'Both'
  };
</script>

<span class="tag tag-{focus}">{label[focus]}</span>
