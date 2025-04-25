<script lang="ts">
  import { selectedVisualizerName, visualizerOptions } from './stores';
  import type { VisualizerOption } from './stores';

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedVisualizerName.set(target.value);
    console.log('Visualizer changed to:', target.value);
  }
</script>

<div class="visualizer-selector-container">
  <label for="visualizer-select">Visualizer:</label>
  <select id="visualizer-select" value={$selectedVisualizerName} on:change={handleChange}>
    {#each visualizerOptions as option (option.name)}
      <option value={option.name}>{option.name}</option>
    {/each}
  </select>
</div>

<style>
  .visualizer-selector-container {
    position: absolute;
    top: 55px;  /* Position below InstrumentSelector (approx height + margin) */
    left: 10px; /* Align left edge */
    z-index: 20; /* Ensure it's above visualizer but potentially below modals if any */
    background-color: rgba(40, 40, 40, 0.8);
    padding: 8px 12px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    gap: 8px; /* Space between label and select */
  }

  label {
    font-size: 0.9em;
    color: #ccc;
  }

  select {
    background-color: #555;
    color: #eee;
    border: 1px solid #777;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 0.9em;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #aaa;
  }
</style>
