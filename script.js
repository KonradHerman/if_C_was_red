import { noteToColorMap, keyboardToNoteMap } from './mappings.js';

let firstNotePlayed = false;
const audioContext = new AudioContext();
const audioBuffers = {};
const activeAudioNodes = {};

// Function to hide text
function hideText() {
  if (!firstNotePlayed) {
    document.getElementById("heading").style.display = "none";
    document.getElementById("subheading").style.display = "none";
    firstNotePlayed = true;
  }
}

// Function to handle MIDI message
function handleMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  console.log(`MIDI Command: ${command}, Note: ${note}`);  // Debug statement
  
  if (command === 144) { // Note on
    hideText();
    changeBackgroundColor(note);
    playSample(note);
  } 
}

// Function to play sample
function playSample(note) {
  if (audioBuffers[note]) {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[note];
    source.connect(audioContext.destination);
    source.start(0);
    activeAudioNodes[note] = source;
  }
}

// Function to change background color
function changeBackgroundColor(note) {
  const color = noteToColorMap[note % 12];
  document.body.style.backgroundColor = color;
  console.log(`Changed background color to ${color}`);  // Debug statement
}

// Initialize MIDI
navigator.requestMIDIAccess()
  .then(onMIDISuccess, onMIDIFailure);

function onMIDISuccess(midiAccess) {
  for (const input of midiAccess.inputs.values()) {
    input.onmidimessage = handleMIDIMessage;
  }
}

function onMIDIFailure() {
  console.log('Could not access your MIDI devices.');
}

// Load audio samples
for (let note = 35; note <= 93; note++) {
  fetch(`samples/${note}.mp3`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      return response.arrayBuffer();
    })
    .then(data => audioContext.decodeAudioData(data))
    .then(audioBuffer => {
      audioBuffers[note] = audioBuffer;
    })
    .catch(err => console.log(`Error loading note ${note}: ${err}`));
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
  const note = keyboardToNoteMap[event.key];
  if (note !== undefined) {
    hideText();
    changeBackgroundColor(note);
    playSample(note);
  }
});
