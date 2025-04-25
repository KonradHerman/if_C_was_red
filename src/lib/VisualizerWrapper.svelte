<script lang="ts">
  // Import stores needed for dynamic selection
  import { activeNotes as activeNotesStore, selectedVisualizerName } from './stores';

  // Import all possible visualizer components
  // Use dynamic imports to potentially improve initial load time if there were many visualizers
  // However, for only two, direct imports are simpler and fine.
  import BallVisualizer from './visualizers/BallVisualizer.svelte';
  import BarsVisualizer from './visualizers/BarsVisualizer.svelte';

  // Map visualizer names (from store) to the imported components
  // Add index signature to satisfy TypeScript
  const visualizerComponents: { [key: string]: typeof BallVisualizer | typeof BarsVisualizer } = {
    Ball: BallVisualizer,
    Bars: BarsVisualizer,
    // Add other visualizers here as they are created
  };

  // Derive the current component based on the selected name
  $: currentVisualizerComponent = visualizerComponents[$selectedVisualizerName];

  // The ActiveNote type definition is likely needed by Visualizer.svelte internally,
  // but this wrapper doesn't need to explicitly import it unless it uses the type.
  // import type { ActiveNote } from './stores'; 

  // Subscribe to the activeNotes store
  // The store holds a Map<string | number, ActiveNote>
  // $: console.log('VisualizerWrapper: Active notes count:', $activeNotesStore.size);

</script>

<!-- Use svelte:component to dynamically render the selected visualizer -->
{#if currentVisualizerComponent}
  <svelte:component this={currentVisualizerComponent} activeNotes={$activeNotesStore} />
{:else}
  <!-- Optional: Fallback if the selected visualizer name is invalid -->
  <p>Error: Visualizer '{$selectedVisualizerName}' not found.</p>
{/if}

<!-- No style needed unless wrapping element requires it --> 