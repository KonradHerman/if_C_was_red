import { noteToColorMap, keyboardToNoteMap } from "./mappings.js";

let firstNotePlayed = false;

document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();
    if (keyboardToNoteMap.hasOwnProperty(key)) {
      const note = keyboardToNoteMap[key];
      console.log(`Key down: ${key}, mapped to note: ${note}`); // Debug statement
      handleMIDIMessage({ data: [0x90, note, 127] });
    }
  });

  document.addEventListener("keyup", function (event) {
    const key = event.key.toLowerCase();
    if (keyboardToNoteMap.hasOwnProperty(key)) {
      const note = keyboardToNoteMap[key];
      console.log(`Key up: ${key}, mapped to note: ${note}`); // Debug statement
      handleMIDIMessage({ data: [0x80, note, 0] });
    }
  });
});

function handleMIDIMessage(event) {
  let cmd = event.data[0] >> 4;
  let channel = event.data[0] & 0xf;
  let noteNumber = event.data[1];
  let velocity = event.data[2];

  if (cmd === 9 && velocity > 0) {
    // note on
    if (!firstNotePlayed) {
      document.getElementById("heading").style.display = "none";
      document.getElementById("subheading").style.display = "none";
      firstNotePlayed = true;
    }

    let noteBase = noteNumber % 12;
    if (noteToColorMap.hasOwnProperty(noteBase)) {
      let color = noteToColorMap[noteBase];
      console.log(`Note on: ${noteNumber}, Color: ${color}`); // Debug statement
      document.body.style.backgroundColor = color;
    }
  } else if (cmd === 8 || (cmd === 9 && velocity === 0)) {
    // note off
    document.body.style.backgroundColor = "#ffffff";
  }
}
