import { noteToColorMap, keyboardToNoteMap } from './mappings.js';

let firstNotePlayed = false;

document.addEventListener('keydown', function(event) {
    const key = event.key.toLowerCase();
    if (keyboardToNoteMap.hasOwnProperty(key)) {
      const note = keyboardToNoteMap[key];
      console.log(`Key down: ${key}, mapped to note: ${note}`); // Debug statement
      handleMIDIMessage({ data: [0x90, note, 127] });
    }
  });
  
  document.addEventListener('keyup', function(event) {
    const key = event.key.toLowerCase();
    if (keyboardToNoteMap.hasOwnProperty(key)) {
      const note = keyboardToNoteMap[key];
      console.log(`Key up: ${key}, mapped to note: ${note}`); // Debug statement
      handleMIDIMessage({ data: [0x80, note, 0] });
    }
  });

function handleMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  const velocity = message.data.length > 2 ? message.data[2] : 0;

  if (!firstNotePlayed && velocity > 0) {
    document.getElementById("main-title").style.display = "none";
    document.getElementById("sub-title").style.display = "none";
    firstNotePlayed = true;
  }

  if (velocity > 0) {
    let baseNote = note % 12;
    let octave = Math.floor(note / 12);

    if (noteToColorMap.hasOwnProperty(baseNote)) {
      let baseColor = noteToColorMap[baseNote];
      let hsl = rgbToHsl(baseColor);
      let newLightness = hsl[2] + (octave - 4) * 10;
      newLightness = Math.max(0, Math.min(100, newLightness));
      let newColor = `hsl(${hsl[0]}, ${hsl[1]}%, ${newLightness}%)`;
      document.body.style.backgroundColor = newColor;
    }
  }
}

function rgbToHsl(color) {
  let r = parseInt(color.substring(1, 3), 16) / 255,
    g = parseInt(color.substring(3, 5), 16) / 255,
    b = parseInt(color.substring(5, 7), 16) / 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = g - b;
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Optional: Initialize MIDI if you still want that functionality
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

function onMIDISuccess(midiAccess) {
  for (let input of midiAccess.inputs.values()) {
    input.onmidimessage = handleMIDIMessage;
  }
}

function onMIDIFailure() {
  console.log("Could not access your MIDI devices.");
}
