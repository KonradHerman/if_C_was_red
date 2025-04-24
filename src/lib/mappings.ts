export const noteToColorMap: { [key: number]: string } = {
  0: '#db3132', // C
  1: '#d54bfa', // C#
  2: '#9f70f9', // D
  3: '#819afe', // D#
  4: '#61acd7', // E
  5: '#7bd8bc', // F
  6: '#7bd559', // F#
  7: '#8fd833', // G
  8: '#afbc2e', // G#
  9: '#d4a426', // A
  10: '#e88e20', // A#
  11: '#e3936e' // B
};

export const keyboardToNoteMap: { [key: string]: number } = {
  // Bottom Row (Notes below Middle C / C4)
  'z': 53,  // F3
  'x': 54,  // F#3
  'c': 55,  // G3
  'v': 56,  // G#3
  'b': 57,  // A3
  'n': 58,  // A#3
  'm': 59,  // B3

  // Middle Row (Starting Middle C / C4)
  'a': 60,  // C4
  's': 61,  // C#4
  'd': 62,  // D4
  'f': 63,  // D#4
  'g': 64,  // E4
  'h': 65,  // F4
  'j': 66,  // F#4
  'k': 67,  // G4
  'l': 68,  // G#4

  // Top Row (Notes above middle row)
  'q': 69,  // A4
  'w': 70,  // A#4
  'e': 71,  // B4
  'r': 72,  // C5
  't': 73,  // C#5
  'y': 74,  // D5
  'u': 75,  // D#5
  'i': 76,  // E5
  'o': 77,  // F5
  'p': 78   // F#5
}; 