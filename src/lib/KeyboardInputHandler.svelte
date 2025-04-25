<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    activeNotes as activeNotesStore, 
    synthInstance, 
    isAudioReady as isAudioReadyStore,
    audioControls
  } from './stores';
  import { keyboardToNoteMap } from './mappings'; // Import the keyboard map
  import * as Tone from 'tone'; // Needed for Tone.Frequency
  import type { ActiveNote } from '../App.svelte'; // Import ActiveNote type from App's module context

  // State moved from App.svelte
  const pressedKeyboardKeys: Map<string, { noteName: string, noteId: string }> = new Map();
  const keyboardTimeouts: Map<string, number> = new Map(); // Keep for potential future use, though delay removed
  let currentAudioControls: { initAudio: () => Promise<void> } | null = null;
  let isAudioReady = false;

  const unsubscribeAudioControls = audioControls.subscribe(value => {
    currentAudioControls = value;
  });

  const unsubscribeIsAudioReady = isAudioReadyStore.subscribe(value => {
      isAudioReady = value;
  });

  // --- Keyboard Handling ---
  async function handleKeyDown(event: KeyboardEvent) {
    if (event.repeat || pressedKeyboardKeys.has(event.key)) return;
    const noteNumber = keyboardToNoteMap[event.key];
    if (noteNumber === undefined) return;

    if (!isAudioReady && currentAudioControls?.initAudio) {
        try {
            await currentAudioControls.initAudio();
            // Re-check isAudioReady directly from the store after await, as the subscription might not have fired yet.
            if (!$isAudioReadyStore) { 
                console.warn("KeyboardInputHandler: Audio init successful but store not updated in time?"); 
                return; 
            } 
        } catch (e) {
             console.error("KeyboardInputHandler: Error calling initAudio:", e);
             return;
        }
    } else if (!isAudioReady) { // Check local flag if initAudio wasn't called
        return;
    }

    const noteName = Tone.Frequency(noteNumber, "midi").toNote();
    const noteId = `key-${event.key}-${noteNumber}`;
    const velocity = 0.7;

    pressedKeyboardKeys.set(event.key, { noteName, noteId });

    const currentSynth = $synthInstance;
    if (currentSynth) {
        currentSynth.triggerAttack(noteName, Tone.now(), velocity);
        activeNotesStore.update(map => {
            map.set(noteId, { id: noteId, noteNumber, velocity: velocity });
            return map;
        });
        // REMOVED: activeNotesStore.set($activeNotesStore);
    }

    // Clear any potential lingering timeout from a previous rapid key press/release cycle
    const existingTimeout = keyboardTimeouts.get(event.key);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
        keyboardTimeouts.delete(event.key);
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    const pressedInfo = pressedKeyboardKeys.get(event.key);
    if (!pressedInfo) return;

    const { noteName, noteId } = pressedInfo;
    pressedKeyboardKeys.delete(event.key);

    // Clear any timeout associated with this key in case keydown added one recently
    const existingTimeout = keyboardTimeouts.get(event.key);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
        keyboardTimeouts.delete(event.key);
    }

    const currentSynth = $synthInstance;
    if (currentSynth) {
        // REMOVED setTimeout wrapper
        currentSynth.triggerRelease(noteName, Tone.now());
        activeNotesStore.update(map => {
            map.delete(noteId);
            return map;
        });
        // REMOVED: activeNotesStore.set($activeNotesStore);
    } else {
        // Still need to update visualizer state even if synth disappeared
        activeNotesStore.update(map => {
            map.delete(noteId);
            return map;
        });
       // REMOVED: activeNotesStore.set($activeNotesStore);
    }
  }

  onMount(() => {
    console.log("KeyboardInputHandler Mounted");
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log("KeyboardInputHandler Unmounting");
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Unsubscribe from stores
      unsubscribeAudioControls();
      unsubscribeIsAudioReady();

      // Clear any pending timeouts
      keyboardTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      keyboardTimeouts.clear();
      // Optionally: Release any stuck notes if component unmounts unexpectedly?
      // Requires access to synthInstance.releaseAll() or similar.
    };
  });

</script>

<!-- This is a script-only component, no HTML output --> 