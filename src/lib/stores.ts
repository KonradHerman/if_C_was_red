import { writable } from 'svelte/store';
import * as Tone from 'tone';

// Define the ActiveNote interface
export interface ActiveNote {
  id: string | number;
  noteNumber: number;
  velocity: number;
}

// --- Instrument Definitions (Moved here from InstrumentSelector/App) ---
export interface InstrumentOption {
  name: string;
  synthType: typeof Tone.Synth | typeof Tone.FMSynth | typeof Tone.AMSynth | typeof Tone.Sampler;
  config: Partial<Tone.SynthOptions> | Partial<Tone.FMSynthOptions> | Partial<Tone.AMSynthOptions> | Partial<Tone.SamplerOptions>;
}

const casioSamplerConfig: Partial<Tone.SamplerOptions> = {
    urls: { A1: "A1.mp3", A2: "A2.mp3" },
    baseUrl: "https://tonejs.github.io/audio/casio/",
};

const salamanderSamplerConfig: Partial<Tone.SamplerOptions> = {
    urls: {
        A0: "A0.ogg", C1: "C1.ogg", "D#1": "Ds1.ogg", "F#1": "Fs1.ogg", A1: "A1.ogg",
        C2: "C2.ogg", "D#2": "Ds2.ogg", "F#2": "Fs2.ogg", A2: "A2.ogg", C3: "C3.ogg",
        "D#3": "Ds3.ogg", "F#3": "Fs3.ogg", A3: "A3.ogg", C4: "C4.ogg", "D#4": "Ds4.ogg",
        "F#4": "Fs4.ogg", A4: "A4.ogg", C5: "C5.ogg", "D#5": "Ds5.ogg", "F#5": "Fs5.ogg",
        A5: "A5.ogg", C6: "C6.ogg", "D#6": "Ds6.ogg", "F#6": "Fs6.ogg", A6: "A6.ogg",
        C7: "C7.ogg", "D#7": "Ds7.ogg", "F#7": "Fs7.ogg"
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    release: 0.8,
};

// Export the options array
export const instrumentOptions: InstrumentOption[] = [
  // Use 'as any' casts for nested oscillator/envelope to maintain original behavior
  { name: 'Triangle Wave', synthType: Tone.Synth, config: { oscillator: { type: 'triangle' } as any, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 } as any } },
  { name: 'Square Wave', synthType: Tone.Synth, config: { oscillator: { type: 'square' } as any, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.8 } as any } },
  { name: 'Sawtooth Wave', synthType: Tone.Synth, config: { oscillator: { type: 'sawtooth' } as any, envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 1.2 } as any } },
  { name: 'Simple FM', synthType: Tone.FMSynth, config: { harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.8 } as any, modulationEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.8 } as any } },
  { name: 'Casio Keyboard', synthType: Tone.Sampler, config: casioSamplerConfig },
  { name: 'Salamander Piano', synthType: Tone.Sampler, config: salamanderSamplerConfig },
];

// Find the default instrument name
const defaultInstrumentName = instrumentOptions.find((opt: InstrumentOption) => opt.name === 'Salamander Piano')?.name || instrumentOptions[0].name;

// --- Visualizer Definitions ---

// Define the structure for a visualizer option
export interface VisualizerOption {
  name: string;
  // Maybe add component reference later if needed, for now just name
  // component: any; 
}

// Export the available visualizer options
// NOTE: The names here MUST match the component filenames (without .svelte) for dynamic import later
export const visualizerOptions: VisualizerOption[] = [
  { name: 'Ball' }, // Corresponds to BallVisualizer.svelte
  { name: 'Bars' }, // Corresponds to BarsVisualizer.svelte
];

// Default visualizer
const defaultVisualizerName = visualizerOptions[0].name; // Default to the first one

// --- Stores ---

// Store for currently active notes
export const activeNotes = writable<Map<string | number, ActiveNote>>(new Map());

// Store for the name of the selected instrument
export const selectedInstrumentName = writable<string>(defaultInstrumentName);

// Store for the name of the selected visualizer
export const selectedVisualizerName = writable<string>(defaultVisualizerName);

// Store for the audio readiness state
export const isAudioReady = writable<boolean>(false);

// Store to hold the synth instance
export const synthInstance = writable<Tone.PolySynth<any> | Tone.Sampler | null>(null);

// Store for Audio Interaction Control
interface AudioControls {
  initAudio: () => Promise<void>;
}
export const audioControls = writable<AudioControls | null>(null);
