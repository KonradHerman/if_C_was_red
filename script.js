let firstNotePlayed = false;

function handleMIDIMessage(message) {
    const command = message.data[0];
    const note = message.data[1];
    const velocity = message.data.length > 2 ? message.data[2] : 0;

    if (!firstNotePlayed && velocity > 0) {
        // Hide the headings when the first note is played
        document.getElementById('main-title').style.display = 'none';
        document.getElementById('sub-title').style.display = 'none';
        firstNotePlayed = true;
    }

    if (velocity > 0) {
        let baseNote = note % 12;
        let octave = Math.floor(note / 12);

        if (noteToColorMap.hasOwnProperty(baseNote)) {
            let baseColor = noteToColorMap[baseNote];

            // Convert the base color to HSL
            let hsl = rgbToHsl(baseColor);
            
            // Adjust the lightness based on the octave
            let newLightness = hsl[2] + (octave - 4) * 10;
            newLightness = Math.max(0, Math.min(100, newLightness));
            
            // Create the new color
            let newColor = `hsl(${hsl[0]}, ${hsl[1]}%, ${newLightness}%)`;

            document.body.style.backgroundColor = newColor;
        }
    } else {
        // Reset the background color when the note is released, if you want
        // document.body.style.backgroundColor = 'initial';
    }
}

function rgbToHsl(color) {
    let r = parseInt(color.substring(1, 3), 16) / 255,
        g = parseInt(color.substring(3, 5), 16) / 255,
        b = parseInt(color.substring(5, 7), 16) / 255;

    let max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return [h, s, l];
}
