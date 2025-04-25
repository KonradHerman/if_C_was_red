<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    activeNotes as activeNotesStore,
    synthInstance,
    isAudioReady as isAudioReadyStore,
    audioControls
  } from './stores';
  import * as Tone from 'tone'; // Needed for Tone.Frequency
  import type { ActiveNote } from '../App.svelte'; // Import ActiveNote type

  let currentAudioControls: { initAudio: () => Promise<void> } | null = null;
  let isAudioReady = false;
  let midiAccess: WebMidi.MIDIAccess | null = null;

  const unsubscribeAudioControls = audioControls.subscribe(value => {
    currentAudioControls = value;
  });

  const unsubscribeIsAudioReady = isAudioReadyStore.subscribe(value => {
      isAudioReady = value;
  });

  // --- MIDI Handling ---
  async function handleMIDIMessage(message: WebMidi.MIDIMessageEvent) {
    if (!isAudioReady && currentAudioControls?.initAudio) {
        try {
            await currentAudioControls.initAudio();
            if (!isAudioReady) return;
        } catch (e) {
             console.error("MidiInputHandler: Error calling initAudio:", e);
             return;
        }
    } else if (!isAudioReady) {
        return;
    }

    processMidiEvent(message);
  }

  function processMidiEvent(message: WebMidi.MIDIMessageEvent) {
     const currentSynth = $synthInstance; // Get synth from store
     if (!currentSynth || (currentSynth instanceof Tone.Sampler && !currentSynth.loaded)) {
         return;
     }

     const command = message.data[0];
     const noteNumber = message.data[1];
     const velocity = message.data.length > 2 ? message.data[2] : 0;
     const noteName = Tone.Frequency(noteNumber, "midi").toNote();
     const normalizedVelocity = velocity / 127;

     // console.log(`MidiInputHandler: Cmd=${command}, Note=${noteNumber}(${noteName}), Vel=${velocity}`);

     if (command === 144 && velocity > 0) { // Note on
        currentSynth.triggerAttack(noteName, Tone.now(), normalizedVelocity);
        activeNotesStore.update(map => {
          map.set(noteNumber, { id: noteNumber, noteNumber, velocity: normalizedVelocity });
          return map;
        });
        activeNotesStore.set($activeNotesStore);
     } else if (command === 128 || (command === 144 && velocity === 0)) { // Note off
        currentSynth.triggerRelease(noteName, Tone.now());
        activeNotesStore.update(map => {
          map.delete(noteNumber);
          return map;
        });
        activeNotesStore.set($activeNotesStore);
     }
  }

  // --- MIDI Setup Logic (Moved from App.svelte onMount) ---
  function onMIDISuccess(access: WebMidi.MIDIAccess) {
      console.log("MidiInputHandler: MIDI Ready!");
      midiAccess = access; // Store access object for cleanup
      
      // Clear existing listeners first in case of re-init
      for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      
      // Add listeners to current inputs
      for (const input of midiAccess.inputs.values()) {
        console.log(`MidiInputHandler: Attaching MIDI listener to input: ${input.name}`);
        input.onmidimessage = handleMIDIMessage;
      }

      // Listen for new devices connecting/disconnecting
      midiAccess.onstatechange = (event: WebMidi.MIDIConnectionEvent) => {
        console.log(`MidiInputHandler: MIDI state change - ${event.port.name}, State: ${event.port.state}`);
        if (event.port.type === "input") {
           if (event.port.state === "connected" && 'onmidimessage' in event.port) {
               event.port.onmidimessage = handleMIDIMessage;
               console.log(`MidiInputHandler: Attached listener to new input: ${event.port.name}`);
           } else if (event.port.state === "disconnected" && 'onmidimessage' in event.port) {
               event.port.onmidimessage = null; // Clean up listener
               console.log(`MidiInputHandler: Removed listener from disconnected input: ${event.port.name}`);
           }
        }
      };
  }

  function onMIDIFailure(msg: string) {
      console.error(`MidiInputHandler: Failed to get MIDI access - ${msg}`);
  }

  onMount(() => {
    console.log("MidiInputHandler Mounted");
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
          .then(onMIDISuccess, onMIDIFailure)
          .catch(err => console.error("MidiInputHandler: Error requesting MIDI access:", err));
    } else {
        console.warn('MidiInputHandler: Web MIDI API not supported.');
    }

    return () => {
      console.log("MidiInputHandler Unmounting");
      // Cleanup MIDI listeners and state change handler
      if (midiAccess) {
          midiAccess.onstatechange = null;
          for (const input of midiAccess.inputs.values()) {
              if (input && 'onmidimessage' in input) {
                  input.onmidimessage = null;
              }
          }
          console.log("MidiInputHandler: Cleaned up MIDI listeners.");
          midiAccess = null;
      }
      // Unsubscribe from stores
      unsubscribeAudioControls();
      unsubscribeIsAudioReady();
    };
  });

</script>

<!-- Script-only component --> 