import { noteToColorMap, keyboardToNoteMap } from './mappings.js';

let firstNotePlayed = false;

function hideText() {
  if (!firstNotePlayed) {
    document.getElementById("heading").style.display = "none";
    document.getElementById("subheading").style.display = "none";
    firstNotePlayed = true;
  }
}

function handleMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  const velocity = message.data[2];
  
  console.log(`MIDI Message received. Command: ${command}, Note: ${note}, Velocity: ${velocity}`);

  if (command === 144) { // Note on
    hideText();
    changeBackgroundColor(note);
  } else if (command === 128) { // Note off
    // Do something for note off if you like
  }
}

function changeBackgroundColor(note) {
  const color = noteToColorMap[note % 12];
  console.log(`Changing background color to ${color}`);
  document.body.style.backgroundColor = color;
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

// Handle keyboard input
document.addEventListener('keydown', (event) => {
  const note = keyboardToNoteMap[event.key];
  
  console.log(`Keyboard key pressed: ${event.key}, Mapped Note: ${note}`);

  if (note !== undefined) {
    hideText();
    changeBackgroundColor(note);
  }
});
