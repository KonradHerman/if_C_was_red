<script context="module" lang="ts">
  // Define and export the interface from the module context
  export interface ActiveNote {
    id: string | number; // Unique ID (string for keyboard key+note, number for MIDI note)
    noteNumber: number;
    velocity: number; // Normalized 0.0 - 1.0
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { noteToColorMap, keyboardToNoteMap } from './lib/mappings';
  import * as Tone from 'tone'; // Import Tone.js
  import Visualizer from './lib/Visualizer.svelte';
  // Remove the redundant import - ActiveNote is available from the module script above
  // import type { ActiveNote } from './App.svelte';

  // --- Instrument Options ---
  interface InstrumentOption {
    name: string;
    // Update synthType to include Sampler
    synthType: typeof Tone.Synth | typeof Tone.FMSynth | typeof Tone.AMSynth | typeof Tone.Sampler;
    // Update config type to include SamplerOptions
    config: Partial<Tone.SynthOptions> | Partial<Tone.FMSynthOptions> | Partial<Tone.AMSynthOptions> | Partial<Tone.SamplerOptions>;
  }

  // Define the Casio Sampler configuration - Using ONLY AVAILABLE samples
  const casioSamplerConfig: Partial<Tone.SamplerOptions> = {
      urls: {
          // Only include samples known to exist at the baseUrl
          A1: "A1.mp3",
          A2: "A2.mp3",
          // Removed C1, D#1, E1, F#1, G#1, B1, C2, D2, F2 etc. as they 404'd
      },
      baseUrl: "https://tonejs.github.io/audio/casio/",
      // No release override needed here
  };

  // --- NEW: Salamander Grand Piano Sampler Configuration ---
  const salamanderSamplerConfig: Partial<Tone.SamplerOptions> = {
      urls: {
          // Map notes to .ogg files from A0 (MIDI 21) to F#7 (MIDI 102)
          // Example subset - you would ideally map all available notes A0-F#7
          A0: "A0.ogg", C1: "C1.ogg", "D#1": "Ds1.ogg", "F#1": "Fs1.ogg", A1: "A1.ogg",
          C2: "C2.ogg", "D#2": "Ds2.ogg", "F#2": "Fs2.ogg", A2: "A2.ogg", C3: "C3.ogg",
          "D#3": "Ds3.ogg", "F#3": "Fs3.ogg", A3: "A3.ogg", C4: "C4.ogg", "D#4": "Ds4.ogg",
          "F#4": "Fs4.ogg", A4: "A4.ogg", C5: "C5.ogg", "D#5": "Ds5.ogg", "F#5": "Fs5.ogg",
          A5: "A5.ogg", C6: "C6.ogg", "D#6": "Ds6.ogg", "F#6": "Fs6.ogg", A6: "A6.ogg",
          C7: "C7.ogg", "D#7": "Ds7.ogg", "F#7": "Fs7.ogg"
          // Note: Tone.js will automatically fill in sharps/flats based on these if not explicitly provided
          // e.g., If only C4 and D4 are provided, it can derive C#4. Providing sharps explicitly is better.
          // Providing ALL notes A0-F#7 gives the best quality.
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      // Add a release for piano sustain
      release: 0.8,
  };

  const instrumentOptions: InstrumentOption[] = [
    { name: 'Triangle Wave', synthType: Tone.Synth, config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 } } },
    { name: 'Square Wave', synthType: Tone.Synth, config: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.8 } } },
    { name: 'Sawtooth Wave', synthType: Tone.Synth, config: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 1.2 } } },
    { name: 'Simple FM', synthType: Tone.FMSynth, config: { harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.8 }, modulationEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.8 } } },
    // Using the corrected Casio config
    { name: 'Casio Keyboard', synthType: Tone.Sampler, config: casioSamplerConfig },
    // Using the NEW Salamander Config
    { name: 'Salamander Piano', synthType: Tone.Sampler, config: salamanderSamplerConfig },
  ];

  let selectedInstrumentName: string = instrumentOptions[5].name; // Default to Salamander
  let selectedInstrumentConfig: InstrumentOption = instrumentOptions.find(opt => opt.name === selectedInstrumentName)!;

  let firstNotePlayed = false;
  // UPDATE: Allow synth to be PolySynth OR Sampler
  let synth: Tone.PolySynth<any> | Tone.Sampler | null = null;
  let isAudioReady = false;

  // Reactive map to store currently active notes (for visualizer)
  let activeNotes: Map<string | number, ActiveNote> = new Map();
  // Map to track currently pressed keyboard keys and their Tone.js note name
  const pressedKeyboardKeys: Map<string, { noteName: string, noteId: string }> = new Map();

  // Helper to trigger reactivity when the map changes
  function updateActiveNotes() {
      console.log('App.svelte: Updating activeNotes', new Map(activeNotes)); // Log the map state
      activeNotes = activeNotes; // Assign map to itself to trigger Svelte update
  }

  // Map to store keyboard note timeout IDs
  const keyboardTimeouts: Map<string, number> = new Map();

  // Function to hide text
  function hideText() {
    if (!firstNotePlayed) {
      firstNotePlayed = true; // Svelte's reactivity will hide the text elements
    }
  }

  // --- Synth Creation/Update ---
  async function setupSynth(option: InstrumentOption) {
    // Dispose previous synth if it exists
    if (synth) {
      // releaseAll exists on both PolySynth and Sampler
      synth.releaseAll();
      synth.dispose();
      console.log("Previous synth disposed.");
      synth = null; // Ensure it's nullified before creating new one
    }

    // --- No Tone.start() here initially ---
    // We will call Tone.start() explicitly on the first user interaction within initAudio

    console.log(`Setting up ${option.name}... Config:`, option.config);

    // --- CONDITIONAL CREATION ---
    if (option.synthType === Tone.Sampler) {
       // Create Sampler directly
       synth = new Tone.Sampler(option.config as Partial<Tone.SamplerOptions>).toDestination();
       console.log(`Sampler created: ${option.name}. Waiting for samples...`);
       // Sampler loads asynchronously, wait for it
       await Tone.loaded(); // Ensure samples are loaded
       console.log(`Sampler ready: ${option.name}`);
    } else {
       // Create PolySynth for other types
       synth = new Tone.PolySynth(option.synthType as any, option.config).toDestination();
       console.log(`PolySynth created: ${option.name}`);
       await Tone.loaded(); // Still good practice
       console.log(`PolySynth ready: ${option.name}`);
    }
    // --- END CONDITIONAL CREATION ---

     // Don't set isAudioReady here yet, wait for Tone.start()
  }

  // Reactive statement to update synth when selection changes
  $: {
    const newOption = instrumentOptions.find(opt => opt.name === selectedInstrumentName);
    if (newOption && newOption !== selectedInstrumentConfig) {
      console.log("Instrument selection changed:", selectedInstrumentName);
      selectedInstrumentConfig = newOption;
      // Just set up the synth definition, don't try to start audio context yet
      // The next interaction will call initAudio which handles Tone.start()
      setupSynth(selectedInstrumentConfig); // Re-setup synth structure
      // Reset isAudioReady flag as the synth needs setup (though context might persist)
      // We rely on initAudio to confirm readiness including Tone.start()
      isAudioReady = false;
    }
  }

  // Function to initialize AudioContext and ensure synth is ready
  let isInitializing = false; // Prevent race conditions
  async function initAudio() {
     // Prevent multiple initializations running concurrently
     if (isAudioReady || isInitializing) return;

     isInitializing = true;
     try {
        // Start Tone.js Audio Context - THIS requires user gesture
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("Audio context started by user interaction.");
        }

        // Ensure synth is created if it hasn't been already
        if (!synth) {
            console.log("Synth was null, setting up initial synth in initAudio.");
            await setupSynth(selectedInstrumentConfig); // Await synth setup
        } else if (synth instanceof Tone.Sampler && !synth.loaded) {
             console.log("Sampler existed but wasn't loaded, awaiting Tone.loaded() in initAudio.");
             await Tone.loaded(); // Ensure sampler is loaded if it already exists
        } else if (!(synth instanceof Tone.Sampler) && !synth.volume) {
            // PolySynth might exist but needs confirmation it's ready (e.g., after selection change)
            console.log("PolySynth existed, ensuring readiness in initAudio.");
            await Tone.loaded(); // Await potential internal setup
        }

        // Check if synth is now valid and ready
        if (synth && ( (synth instanceof Tone.Sampler && synth.loaded) || !(synth instanceof Tone.Sampler) ) ) {
             isAudioReady = true;
             console.log("Audio and Synth are ready.");
        } else {
             console.error("Synth initialization failed within initAudio.");
             isAudioReady = false; // Explicitly set to false
        }

     } catch (e) {
        console.error("Error during audio initialization:", e);
        isAudioReady = false; // Ensure flag is false on error
     } finally {
         isInitializing = false; // Allow future attempts if needed
     }
  }

  // Function to handle MIDI message
  async function handleMIDIMessage(message: WebMidi.MIDIMessageEvent) { // Make async
    // Try to initialize audio if a message comes before interaction
    if (!isAudioReady) {
        // Await initialization *before* processing the MIDI event
        await initAudio();
        // Check again if it succeeded
        if (!isAudioReady || !synth) {
             console.warn("Audio initialization failed or synth not ready after MIDI attempt.");
             return; // Don't process if still not ready
        }
        // If initAudio succeeded, fall through to processMidiEvent
    }
    // At this point, isAudioReady should be true if initialization worked
    processMidiEvent(message);
  }

  // processMidiEvent remains synchronous, called only after audio is ready
  function processMidiEvent(message: WebMidi.MIDIMessageEvent) {
     // Check synth readiness
     if (!synth || (synth instanceof Tone.Sampler && !synth.loaded)) {
         console.warn("processMidiEvent called but synth not ready or sampler not loaded yet.");
         return;
     }

     const command = message.data[0];
     const noteNumber = message.data[1];
     const velocity = message.data.length > 2 ? message.data[2] : 0;
     const noteName = Tone.Frequency(noteNumber, "midi").toNote();
     const normalizedVelocity = velocity / 127;

     console.log(`MIDI: Cmd=${command}, Note=${noteNumber}(${noteName}), Vel=${velocity}(${normalizedVelocity.toFixed(2)})`);

     if (command === 144 && velocity > 0) { // Note on
        hideText(); // Hide text on first successful trigger
        synth.triggerAttack(noteName, Tone.now(), normalizedVelocity);
        activeNotes.set(noteNumber, { id: noteNumber, noteNumber, velocity: normalizedVelocity });
        updateActiveNotes();
     } else if (command === 128 || (command === 144 && velocity === 0)) { // Note off
        synth.triggerRelease(noteName, Tone.now());
        activeNotes.delete(noteNumber);
        updateActiveNotes();
     }
  }

  // --- UPDATED Keyboard Handling ---

  async function handleKeyDown(event: KeyboardEvent) { // Make async
    // Ignore repeats and keys not in our map
    if (event.repeat || pressedKeyboardKeys.has(event.key)) return;
    const noteNumber = keyboardToNoteMap[event.key];
    if (noteNumber === undefined) return;

    // Ensure audio context is started by user gesture first
    if (!isAudioReady) {
        // Await initialization *before* triggering the note
        await initAudio();
        // Check again if it succeeded before playing
        if (isAudioReady && synth) {
            triggerKeyboardAttack(noteNumber, event.key);
        } else {
            console.warn("Audio initialization failed or synth not ready after keydown attempt.");
        }
    } else if (synth) {
        // Audio already ready, proceed to trigger note
        triggerKeyboardAttack(noteNumber, event.key);
    }
  }

  // triggerKeyboardAttack remains synchronous, called only after audio is ready
  function triggerKeyboardAttack(noteNumber: number, key: string) {
      // Double-check synth readiness (belt and braces)
      if (!synth || (synth instanceof Tone.Sampler && !synth.loaded)) {
         console.warn("triggerKeyboardAttack called but synth not ready.");
         return;
      }

      const noteName = Tone.Frequency(noteNumber, "midi").toNote();
      const defaultVelocity = 0.7;
      const noteId = `key-${key}-${noteNumber}`;

      hideText(); // Hide text on first successful trigger
      synth.triggerAttack(noteName, Tone.now(), defaultVelocity);
      console.log(`Keyboard Down: Key=${key}, Note=${noteNumber}(${noteName}), Vel=${defaultVelocity}`);

      pressedKeyboardKeys.set(key, { noteName, noteId });
      activeNotes.set(noteId, { id: noteId, noteNumber, velocity: defaultVelocity });
      updateActiveNotes();
  }

  function handleKeyUp(event: KeyboardEvent) {
      // Find the note associated with the released key
      const pressedInfo = pressedKeyboardKeys.get(event.key);

      if (synth && pressedInfo) {
          // This works for both PolySynth and Sampler
          synth.triggerRelease(pressedInfo.noteName, Tone.now());
          console.log(`Keyboard Up: Key=${event.key}, Note=${pressedInfo.noteName}`);

          // Remove from visualizer state
          activeNotes.delete(pressedInfo.noteId);
          updateActiveNotes();

          // Remove from pressed keys map
          pressedKeyboardKeys.delete(event.key);
      }
  }

  // Lifecycle function: Runs after the component mounts
  onMount(() => {
    // Add keyup listener
    window.addEventListener('keyup', handleKeyUp);

    // --- REMOVED initAudio() call from here ---

    // Set up the initial synth structure *without* starting audio context
    // This prepares the synth object based on the default selection.
    // The actual Tone.start() and Tone.loaded() checks happen in initAudio on first interaction.
    setupSynth(selectedInstrumentConfig).catch(e => {
       console.error("Error during initial synth setup in onMount:", e);
       // Handle potential errors in initial setup if necessary
    });

    // Initialize MIDI
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess()
        .then(onMIDISuccess, onMIDIFailure);
    } else {
      console.warn('Web MIDI API not supported in this browser.');
    }

    function onMIDISuccess(midiAccess: WebMidi.MIDIAccess) {
      console.log("MIDI Ready!");
      for (const input of midiAccess.inputs.values()) {
        console.log(`Attaching MIDI listener to input: ${input.name}`);
        input.onmidimessage = handleMIDIMessage;
      }
       // Listen for new devices connecting
      midiAccess.onstatechange = (event: WebMidi.MIDIConnectionEvent) => { // Added type for event
        console.log(`MIDI device state change: ${event.port.name}, State: ${event.port.state}`);
        // Ensure the port is an input before assigning the handler
        if (event.port.type === "input" && event.port.state === "connected") {
           // Check if port has onmidimessage - it should for inputs
           if ('onmidimessage' in event.port) {
               event.port.onmidimessage = handleMIDIMessage;
               console.log(`Attached MIDI listener to newly connected input: ${event.port.name}`);
           }
        }
         // Optional: handle disconnection - remove listener if needed
         if (event.port.type === "input" && event.port.state === "disconnected") {
            if ('onmidimessage' in event.port) {
                event.port.onmidimessage = null;
                console.log(`Removed MIDI listener from disconnected input: ${event.port.name}`);
            }
         }
      };
    }

    function onMIDIFailure(msg: string) {
      console.error(`Failed to get MIDI access - ${msg}`);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      // Cleanup MIDI listeners
      navigator.requestMIDIAccess?.().then(midiAccess => {
         midiAccess.onstatechange = null; // Remove state change listener first
         for (const input of midiAccess.inputs.values()) {
            // Check if port is still available before removing listener
           if (input && 'onmidimessage' in input) {
               input.onmidimessage = null; // Remove listener
           }
         }
      }).catch(e => console.warn("Error cleaning up MIDI access:", e)); // Add catch

      // Dispose of the synth and potentially close context if Tone doesn't handle it fully
      if (synth) {
          synth.dispose();
          console.log("Synth disposed on unmount.");
          synth = null;
      }
       // Tone.context might still be running. Usually okay, but can force close if needed:
       // if (Tone.context.state === 'running') {
       //    Tone.context.close().then(() => console.log("AudioContext closed."));
       // }
      isAudioReady = false;

      // Clear any pending keyboard timeouts
      keyboardTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      keyboardTimeouts.clear();
      activeNotes.clear(); // Clear visualizer state on cleanup
      updateActiveNotes();
    };
  });

</script>

<!-- Add keyup listener -->
<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp}/>

<!-- REMOVED style binding -->
<div id="app">

  <!-- Instrument Selector Dropdown -->
  <div class="instrument-selector">
    <label for="instrument-select">Sound:</label>
    <select id="instrument-select" bind:value={selectedInstrumentName}>
      {#each instrumentOptions as option (option.name)}
        <option value={option.name}>{option.name}</option>
      {/each}
    </select>
  </div>

  <!-- Conditionally render the initial text -->
  {#if !firstNotePlayed}
    <div class="initial-text">
      <h1 id="heading">If C Is Red</h1>
      <h2 id="subheading">
        Press any note on your keyboard or MIDI controller and see it in color.
      </h2>
    </div>
  {/if}

  <!-- Render the Visualizer component, passing the active notes -->
  <Visualizer {activeNotes} />

</div>

<style>
  /* Style for the instrument selector */
  .instrument-selector {
    position: absolute; /* Position relative to the nearest positioned ancestor (#app maybe?) */
    top: 15px;
    left: 15px;
    z-index: 20; /* Ensure it's above visualizer and text */
    background-color: rgba(50, 50, 50, 0.7); /* Semi-transparent background */
    padding: 8px 12px;
    border-radius: 5px;
    color: white; /* Text color */
    font-family: sans-serif;
  }

  .instrument-selector label {
    margin-right: 8px;
  }

  .instrument-selector select {
     /* Style the select dropdown */
     padding: 4px;
     border-radius: 3px;
     border: 1px solid #ccc;
  }

  /* Position text above the fixed-position visualizer */
  .initial-text {
    position: relative; /* Needed for z-index */
    z-index: 10; /* Ensure it's above the visualizer but below selector */
    /* Add other text styling as needed (centering, color, etc.) */
    text-align: center; /* Example */
    padding-top: 20vh; /* Example */
    color: #eee; /* Example text color */
  }

  /* Ensure #app doesn't interfere if it has styles */
  #app {
     /* background-color: transparent !important; /* Might be needed if app.css sets a background */
     /* Make #app positioned so absolute positioning works relative to it */
     position: relative;
     width: 100%;
     height: 100vh; /* Ensure it spans the full viewport */
     overflow: hidden; /* Prevent scrollbars if content overflows slightly */
  }

  /* You might need to adjust styles in app.css as well */
</style>

