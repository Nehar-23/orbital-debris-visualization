// Non-reactive shared simulation state, written by DebrisField each frame and
// read by Selection / EarthLayers. Kept out of React state to avoid re-renders.
export const sim = {
  // Current simulation time in ms (advances with play state + time multiplier)
  timeMs: Date.now(),
  // Live scene-space positions of every object, laid out [x,y,z, x,y,z, ...]
  positions: null as Float32Array | null,
  count: 0,
};
