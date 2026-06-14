# Orbital Debris Field

A real-time, interactive 3D visualization of objects orbiting Earth — active satellites, spent rocket bodies, debris fragments, and the Starlink constellation — rendered as a glowing particle field around a stylized violet Earth, framed by a NORAD-style command terminal HUD.

Positions are propagated live from real orbital element sets (SGP4 / WGS84) for roughly nineteen thousand tracked objects.

## Features

- **Live propagation** — every object is propagated with SGP4 in the true ECI frame; Earth is oriented by real Greenwich Mean Sidereal Time so continents line up with the catalog.
- **Interactive camera** — click to select, double-click (or double-tap) to fly to an object, and a follow mode that keeps a chosen object centered as it orbits.
- **Camera presets** — one-tap framings for the whole globe, low Earth orbit, the Starlink shell, and the geostationary ring, plus on-screen nav pad and keyboard control.
- **Unified search** — jump to a city or country, raw latitude/longitude, or any catalog object by name or NORAD ID.
- **Object inspector** — full orbital parameters, live ECI state vector, sub-satellite point, and TLE epoch; collapsible so it stays out of the way while tracking.
- **Collapsible HUD** — system status, classification breakdown, filters, time control, and a live animated altitude distribution can each be minimized.
- **Time control** — pause, scrub plus or minus twelve hours, and accelerate the simulation up to ten-thousand times real time.

## Tech stack

- Vite, React 18, TypeScript
- React Three Fiber, drei, postprocessing (Three.js)
- satellite.js (SGP4 propagation)
- Zustand (state), Framer Motion (HUD animation), Tailwind CSS

## Getting started

```bash
cd orbital-debris
npm install
npm run dev
```

Then open the local URL Vite prints (default http://localhost:5173).

To create a production build:

```bash
npm run build
npm run preview
```

## Controls

| Action | Input |
| --- | --- |
| Orbit / rotate | Mouse drag, on-screen pad, or arrow keys |
| Zoom | Mouse wheel, on-screen pad, or `+` / `-` |
| Select object | Single click |
| Fly to object | Double-click / double-tap |
| Reset view | `R`, or the RESET button |
| Play / pause time | Spacebar |

## Data

Orbital element sets are sourced from CelesTrak and served through a cached endpoint, with a bundled offline fallback so the visualization always has data to display.

## Project structure

```
orbital-debris/
  src/
    scene/    3D scene: Earth layers, debris field, camera, selection
    hud/      Command-terminal HUD panels and components
    store/    Zustand stores (data + scene state)
    data/     Catalog loading, classification, locations
    shaders/  GLSL for the debris points and atmosphere
    utils/    Coordinate math, formatting, constants
```
