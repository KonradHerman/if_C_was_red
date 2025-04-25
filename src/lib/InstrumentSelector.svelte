<script lang="ts">
  import { selectedInstrumentName, instrumentOptions, type InstrumentOption } from './stores';
  // Tone import might not be needed here anymore if types aren't used directly
  // import * as Tone from 'tone'; 

  // Instrument definitions are now imported from stores.ts

  // Subscribe to the store for two-way binding
  // $: console.log('Instrument Selector: selectedInstrumentName store value is', $selectedInstrumentName);

</script>

<div>
  <label for="instrument-select">Choose an instrument:</label>
  <select id="instrument-select" bind:value={$selectedInstrumentName}>
    {#each instrumentOptions as option (option.name)}
      <option value={option.name}>{option.name}</option>
    {/each}
  </select>
</div>

<style>
  div {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 20;
    background-color: rgba(40, 40, 40, 0.8);
    padding: 8px 12px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  label {
    font-size: 0.9em;
    color: #ccc;
    margin-right: 0;
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