<script lang="ts">
  import { onMount, onDestroy, beforeUpdate } from 'svelte';
  import type { ActiveNote } from '../../App.svelte'; // Use definition from App
  import { noteToColorMap } from '../mappings'; // Import color map

  // Prop to receive active notes
  export let activeNotes: Map<string | number, ActiveNote>;

  // --- Configuration ---
  // Total time window displayed (ms)
  const timeWindowMs = 5000; 
  // How long note takes to fade after ending (ms)
  const fadeOutDurationMs = 500; 
  // Total pixel width of the SVG coordinate system
  const viewBoxTotalWidth = 1000; 
  // Scale factor: pixels per second
  const pixelsPerSecond = viewBoxTotalWidth / (timeWindowMs / 1000); 
  // Height config
  const viewBoxHeight = 200; // Increased height for octaves
  const middleOctave = 4; // C4 = MIDI note 60
  const octaveCount = 7; // How many octave slots to visualize
  const barHeight = viewBoxHeight / octaveCount; // Height per octave slot (approx 28.5)

  // --- State ---
  interface RenderedBar {
    id: string | number;
    noteNumber: number;
    velocity: number; // Store velocity for opacity
    color: string;
    startTime: number;
    endTime: number | null; // null if still active
  }

  let renderedBars: RenderedBar[] = [];
  let now = performance.now();
  let animationFrameId: number;
  let prevActiveNotes: Map<string | number, ActiveNote> = new Map();

  // --- Helper Functions ---
  function getNoteColor(noteNumber: number): string {
    return noteToColorMap[noteNumber % 12] || '#888888'; // Default grey
  }

  // Adapted from BallVisualizer
  function getNoteYPosition(noteNumber: number): number {
    const octave = Math.floor(noteNumber / 12) - 1; // C0=12, C1=24... C4=60
    const octaveDiff = octave - middleOctave;
    // Center Y position for the middle octave slot
    const middleY = viewBoxHeight / 2 - barHeight / 2; // Center the *bar*, not the line
    // Calculate Y based on octave difference (higher notes = lower Y in SVG)
    return middleY - octaveDiff * barHeight; // Move up/down by full bar heights
  }

  // --- Lifecycle & Animation ---
  onMount(() => {
    prevActiveNotes = new Map(activeNotes); // Initialize previous state

    const animate = (timestamp: number) => {
      now = timestamp; // Use RAF timestamp for smooth animation timing & calculations
      // Filtering is now handled in beforeUpdate
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  });

  // --- Reactivity: Detect Note Changes ---
  beforeUpdate(() => {
    const updateTime = performance.now(); // Timestamp for note start/end events

    // Use 'now' from the last animation frame for filtering consistency with rendering
    const windowStartTime = now - timeWindowMs / 2; // Adjusted window center calculation
    const windowEndTime = now + timeWindowMs / 2;

    // 1. Filter out old bars whose visible duration (including fade) is entirely outside the window
    const initialLength = renderedBars.length;
    let barsToKeep = renderedBars.filter(bar => {
        const effectiveEndTime = bar.endTime ? bar.endTime + fadeOutDurationMs : Infinity;
        // Keep if the bar's visible interval [startTime, effectiveEndTime] overlaps
        // with the view window [windowStartTime, windowEndTime]
        return bar.startTime < windowEndTime && effectiveEndTime > windowStartTime;
    });

    let changed = false;
    const currentIds = new Set(activeNotes.keys());
    const previousIds = new Set(prevActiveNotes.keys());

    // 2. Update existing bars (from the filtered list) that just stopped
    let processedBars = barsToKeep.map(bar => {
       if (bar.endTime === null && previousIds.has(bar.id) && !currentIds.has(bar.id)) {
           changed = true;
           // Use the more precise updateTime for the event itself
           return { ...bar, endTime: updateTime };
       }
       return bar;
    });

    // 3. Add new bars for notes that just started
    currentIds.forEach(id => {
      // This condition ensures we only add truly *new* notes in this cycle
      if (!previousIds.has(id)) {
        const note = activeNotes.get(id);
        if (note) {
          const newBar: RenderedBar = {
            id: note.id,
            noteNumber: note.noteNumber,
            velocity: note.velocity,
            color: getNoteColor(note.noteNumber),
            startTime: updateTime, // Use event time
            endTime: null,
          };
          processedBars.push(newBar); // Add to the list being built
          changed = true;
        }
      }
    });

    prevActiveNotes = new Map(activeNotes);

    // 4. Update the main state if notes started/stopped OR if filtering removed items
    if (changed || processedBars.length !== initialLength) {
       renderedBars = processedBars;
    }
  });

  // --- SVG Coordinate Calculation (Stationary Origin, Symmetric Expansion) ---
  function calculateBarMetrics(bar: RenderedBar, currentTime: number): { 
      halfWidth: number; y: number; opacity: number; isVisible: boolean 
  } {
    const y = getNoteYPosition(bar.noteNumber);
    
    let noteDurationMs = 0;
    if (bar.endTime !== null) {
      noteDurationMs = bar.endTime - bar.startTime;
    } else {
      noteDurationMs = currentTime - bar.startTime;
    }
    
    noteDurationMs = Math.max(0, noteDurationMs); 

    const halfWidth = Math.min(
        (noteDurationMs / 1000 * pixelsPerSecond) / 2, 
        viewBoxTotalWidth / 2
    ); 

    let opacity = bar.velocity;

    if (bar.endTime !== null) {
        const timeSinceEnd = currentTime - bar.endTime;
        if (timeSinceEnd > 0) {
            const fadeProgress = Math.min(1, timeSinceEnd / fadeOutDurationMs);
            opacity *= (1 - fadeProgress); 
        }
    }

    const isVisible = halfWidth > 0.1 && opacity > 0.01; 

    return { halfWidth, y, opacity, isVisible };
  }

</script>

<div class="bars-visualizer-container">
  <svg
    width="100%"
    height="100%"
    viewBox="{-viewBoxTotalWidth / 2} 0 {viewBoxTotalWidth} {viewBoxHeight}"
    preserveAspectRatio="xMidYMid meet"
  >
    <g class="bars-group">
      {#each renderedBars as bar (bar.id)}
        {@const metrics = calculateBarMetrics(bar, now)}
        {#if metrics.isVisible}
          <!-- Left Rectangle -->
          <rect
            x={-metrics.halfWidth} 
            y={metrics.y}
            width={metrics.halfWidth}
            height={barHeight}
            fill={bar.color}
            opacity={metrics.opacity}
            shape-rendering="crispEdges" 
          />
          <!-- Right Rectangle -->
           <rect
            x={0}
            y={metrics.y}
            width={metrics.halfWidth}
            height={barHeight}
            fill={bar.color}
            opacity={metrics.opacity}
            shape-rendering="crispEdges" 
          />
        {/if}
      {/each}
    </g>
    
    <!-- Center Line -->
    <line x1=0 y1=0 x2=0 y2={viewBoxHeight} stroke="rgba(255, 255, 255, 0.5)" stroke-width="1" />

  </svg>
  {#if activeNotes}
    <p>Active Notes: {activeNotes.size}</p>
  {/if}
</div>

<style>
  .bars-visualizer-container {
    width: 100vw; /* Full viewport width */
    height: 100vh; /* Full viewport height */
    position: fixed; /* Position relative to viewport */
    top: 0;
    left: 0;
    overflow: hidden;
  }

  svg {
    display: block;
    background-color: transparent; /* Let container handle bg */
  }

  .bars-group rect {
    /* No transitions needed here, attributes recalculated each frame */
  }
</style> 