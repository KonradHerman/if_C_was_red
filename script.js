let firstNotePlayed = false;

function handleMIDIMessage(message) {
  const command = message.data[0];
  const note = message.data[1];
  const velocity = message.data.length > 2 ? message.data[2] : 0;

  if (!firstNotePlayed && velocity > 0) {
    // Hide the headings when the first note is played
    document.getElementById("main-title").style.display = "none";
    document.getElementById("sub-title").style.display = "none";
    firstNotePlayed = true;
  }

  if (velocity > 0) {
    if (noteToColorMap.hasOwnProperty(note)) {
      document.body.style.backgroundColor = noteToColorMap[note];
    }
  } else {
    // Reset the background color when the note is released, if you want
    // document.body.style.backgroundColor = 'initial';
  }
}
