# ORBITAL DEBRIS FIELD — Ultra Plan
## A real-time 3D visualization of every tracked object in Earth orbit

> **Aesthetic reference:** monochromatic white-on-black, scientific instrument HUD, particle-density data art. Every UI element should feel like a NORAD command terminal crossed with a generative art installation.

---

## 1. PROJECT VISION

A web app that fetches live TLE data from CelesTrak for ~27,000 tracked Earth-orbiting objects, propagates their orbits in real-time using SGP4, and renders them as a glowing particle shell around a rotating Earth — with HUD overlays showing live statistics, object classifications, and altitude distributions.

**The hero moment:** when the page loads, the user sees Earth fade in as a particle sphere, then 27,000 white points materialize in their orbital shells over 3 seconds, and the camera slowly orbits while debris rains across the screen. HUD panels stream in numbers like a Bloomberg terminal.

**Three feelings to evoke:**
1. **Awe** — the sheer scale of human presence in orbit
2. **Unease** — the Kessler-syndrome density visible at 800–900 km
3. **Precision** — every number, every position is real telemetry

---

## 2. TECH STACK (LOCKED)

```
Framework:        Vite + React 18 + TypeScript
3D Engine:        Three.js (^0.160) + React Three Fiber (^8.15)
3D Helpers:       @react-three/drei (^9.92) — OrbitControls, Stats, Effects
Post-processing:  @react-three/postprocessing — Bloom, ChromaticAberration
Orbital math:     satellite.js (^5.0.0) — SGP4 propagation
Animation:        framer-motion (^11) for HUD panel transitions
State:            zustand (^4.4) — global app state
Styling:          TailwindCSS (^3.4) + CSS modules for HUD
Fonts:            JetBrains Mono (all numbers/labels) + Inter (titles)
Data fetch:       native fetch + SWR for caching
Workers:          Comlink for Web Worker SGP4 propagation
Earth textures:   public-domain NASA Blue Marble + custom dot mask
Icons:            Lucide React (minimal, line-only)
```

Install command (one shot):
```bash
npm create vite@latest orbital-debris -- --template react-ts
cd orbital-debris
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing satellite.js zustand framer-motion swr comlink
npm i -D @types/three tailwindcss postcss autoprefixer
```

---

## 3. COLOR PALETTE (EXACT HEX FROM REFERENCE IMAGE)

```css
/* Background — pure void */
--bg-void:         #000000;
--bg-deep:         #050505;   /* panel backgrounds */
--bg-panel:        rgba(8, 8, 8, 0.72);   /* glassmorphic HUD panels with backdrop-blur */

/* Particles — white/gray ramp */
--particle-bright:  #FFFFFF;   /* active satellites, hover state */
--particle-mid:     #C8C8C8;   /* rocket bodies */
--particle-dim:     #707070;   /* debris (the majority) */
--particle-fade:    #3A3A3A;   /* fading edge particles */

/* Starlink — special class, slightly cooler white */
--starlink-glow:   #F0F4FF;   /* off-white with a hint of blue, very subtle */

/* HUD borders & dividers — barely-there */
--hud-border:      #1A1A1A;   /* primary borders */
--hud-divider:     #0E0E0E;   /* subtle dividers */
--hud-accent:      #2A2A2A;   /* hover/focus state */

/* Text — strict 3-tier hierarchy */
--text-primary:    #FFFFFF;   /* live numbers, key data */
--text-secondary:  #909090;   /* labels, axes */
--text-tertiary:   #505050;   /* hints, units */
--text-mono-num:   #D0D0D0;   /* mono-font readouts */

/* Earth wireframe */
--earth-line:      rgba(255, 255, 255, 0.08);
--earth-dot:       rgba(255, 255, 255, 0.55);
--earth-elevation: rgba(255, 255, 255, 0.3);

/* Atmospheric glow */
--atmosphere:      rgba(180, 200, 230, 0.15);

/* Selection ring */
--select-ring:     #FFFFFF;
```

**Rules:**
- No saturated colors anywhere. Pure monochrome.
- Starlink may use the faintest blue tint to differentiate (`#F0F4FF`)
- All particle colors get a Bloom post-process pass for the glow effect
- Background is hard black — no gradients

---

## 4. FILE STRUCTURE

```
orbital-debris/
├── public/
│   ├── textures/
│   │   ├── earth-dots.png          (continent dot mask, 2048×1024)
│   │   ├── earth-elevation.png     (heightmap, 2048×1024 grayscale)
│   │   ├── starfield.png           (background star noise)
│   │   └── particle-sprite.png     (4×4 white circle with alpha)
│   └── fonts/
│       ├── JetBrainsMono-Regular.woff2
│       └── Inter-Regular.woff2
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                     (root layout — globe + HUD overlay)
│   ├── styles/
│   │   ├── globals.css             (CSS vars from §3, font imports)
│   │   └── hud.module.css          (HUD panel styles)
│   │
│   ├── scene/
│   │   ├── Scene.tsx               (R3F <Canvas> root)
│   │   ├── Camera.tsx              (cinematic intro + OrbitControls)
│   │   ├── Lighting.tsx            (minimal — just for atmosphere shader)
│   │   ├── Stars.tsx               (background star field)
│   │   ├── Atmosphere.tsx          (Earth atmospheric glow shader)
│   │   │
│   │   ├── earth/
│   │   │   ├── EarthLayers.tsx     (wraps all 3 Earth representations)
│   │   │   ├── WireframeEarth.tsx  (lat/lon grid lines)
│   │   │   ├── DottedEarth.tsx     (continent dot points)
│   │   │   └── TopographicEarth.tsx (elevation height map as points)
│   │   │
│   │   └── orbital/
│   │       ├── DebrisField.tsx     (InstancedMesh for all objects)
│   │       ├── StarlinkLayer.tsx   (separate render for Starlink)
│   │       ├── OrbitalTrails.tsx   (optional path lines for selected objs)
│   │       └── SelectionRing.tsx   (animated ring around hovered object)
│   │
│   ├── hud/
│   │   ├── HUD.tsx                 (root HUD overlay, fixed positioning)
│   │   ├── panels/
│   │   │   ├── SystemStatus.tsx    (top-left: epoch, fps, object count)
│   │   │   ├── Classification.tsx  (top-right: type breakdown bars)
│   │   │   ├── AltitudeChart.tsx   (bottom-left: altitude histogram)
│   │   │   ├── TimelineScrubber.tsx (bottom-center: time control)
│   │   │   ├── FilterPanel.tsx     (right: layer toggles, filters)
│   │   │   ├── ObjectInspector.tsx (modal on click — full detail)
│   │   │   └── Crosshair.tsx       (center reticle on hover)
│   │   ├── components/
│   │   │   ├── Readout.tsx         (animated number ticker)
│   │   │   ├── ProgressBar.tsx     (horizontal bar with markers)
│   │   │   ├── SparkChart.tsx      (tiny inline trend chart)
│   │   │   ├── ToggleSwitch.tsx    (minimalist toggle)
│   │   │   └── Cornerframe.tsx     (the L-shaped HUD corner brackets)
│   │   └── effects/
│   │       ├── ScanlineOverlay.tsx (subtle CRT scanlines)
│   │       └── TerminalGlitch.tsx  (occasional text glitch effect)
│   │
│   ├── data/
│   │   ├── tleService.ts           (CelesTrak fetcher + cache)
│   │   ├── propagator.worker.ts    (Web Worker for SGP4)
│   │   ├── propagator.client.ts    (Comlink wrapper)
│   │   ├── classification.ts       (object type lookup)
│   │   └── groups.ts               (CelesTrak group endpoints)
│   │
│   ├── store/
│   │   ├── useSceneStore.ts        (camera, rotation, time multiplier)
│   │   ├── useDataStore.ts         (objects, filters, selected)
│   │   └── useHUDStore.ts          (panel visibility, layer toggles)
│   │
│   ├── shaders/
│   │   ├── debris.vert.glsl        (instanced point vertex shader)
│   │   ├── debris.frag.glsl        (soft circular point fragment)
│   │   ├── earth-dots.vert.glsl
│   │   ├── earth-dots.frag.glsl
│   │   ├── atmosphere.vert.glsl
│   │   └── atmosphere.frag.glsl
│   │
│   └── utils/
│       ├── math.ts                 (geodetic ↔ ECI ↔ scene coords)
│       ├── constants.ts            (Earth radius, scale, etc.)
│       └── format.ts               (number formatters for HUD)
│
├── index.html
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 5. DATA SOURCES (LIVE APIs — NO KEYS NEEDED)

All endpoints return JSON. CelesTrak is free, no auth.

```typescript
const ENDPOINTS = {
  active:        'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
  debris:        'https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-1408-debris&FORMAT=json',
  allDebris:     'https://celestrak.org/NORAD/elements/gp.php?GROUP=debris&FORMAT=json',
  rocketBodies:  'https://celestrak.org/NORAD/elements/gp.php?GROUP=rocket-bodies&FORMAT=json',
  starlink:      'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json',
  oneweb:        'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=json',
  iss:           'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json',
  hubble:        'https://celestrak.org/NORAD/elements/gp.php?CATNR=20580&FORMAT=json',
  // Last-resort full catalog (use only if individual groups fail)
  catalogAll:    'https://celestrak.org/NORAD/elements/gp.php?GROUP=cos&FORMAT=json',
};
```

**Strategy:**
- Fetch each group in parallel on app mount
- Cache in `localStorage` with 6-hour TTL (TLEs update every few hours)
- Show "Loading orbital catalog…" with progress (`x of 5 groups loaded`)
- Each TLE entry has `OBJECT_NAME`, `OBJECT_ID`, `EPOCH`, `MEAN_MOTION`, `ECCENTRICITY`, `INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `NORAD_CAT_ID`

**Propagation:** Use `satellite.js` `propagate()` in a Web Worker every animation frame (throttled to 100ms intervals). Returns ECI coordinates → convert to scene XYZ.

---

## 6. COMPONENT BUILD PLAN — ULTRA DETAILED

### 6.1 Scene root (`Scene.tsx`)

```tsx
<Canvas
  gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
  camera={{ position: [0, 0, 18], fov: 50, near: 0.01, far: 1000 }}
  dpr={[1, 2]}
  style={{ background: '#000' }}
>
  <Suspense fallback={null}>
    <Stars />
    <EarthLayers />
    <Atmosphere />
    <DebrisField />
    <StarlinkLayer />
    <SelectionRing />
    <Camera />
    <EffectComposer>
      <Bloom intensity={0.6} luminanceThreshold={0.4} luminanceSmoothing={0.9} />
      <ChromaticAberration offset={[0.0008, 0.0008]} />
    </EffectComposer>
  </Suspense>
</Canvas>
```

**Scale convention:** 1 unit = 1000 km. Earth radius = 6.371 units. LEO debris sits between ~6.5 and ~7.4 units. GEO at ~42 units.

### 6.2 Earth — three layered representations

**Layer A: `WireframeEarth.tsx`** (always rendered, dimmest)
- `<sphereGeometry args={[6.371, 64, 32]} />` with `<meshBasicMaterial wireframe color="#FFFFFF" transparent opacity={0.06} />`
- Latitude lines every 15°, longitude every 15°
- Pole-to-pole meridians slightly brighter (opacity 0.12)

**Layer B: `DottedEarth.tsx`** (continents as point cloud)
- Pre-process `public/textures/earth-dots.png` (a NASA Blue Marble made into a binary land/sea mask, then dithered to dots)
- For each white pixel, emit a `Point` at the corresponding lat/lon on sphere
- ~12,000 points, white at opacity 0.55, point size 1.2px
- Use `THREE.Points` with custom shader for crisp circular dots
- Subtle vertex displacement so the dot field shimmers very slightly

**Layer C: `TopographicEarth.tsx`** (elevation as point heights)
- Sample `public/textures/earth-elevation.png` (NASA SRTM heightmap)
- Generate ~40,000 points; displace each radially by `elevation * 0.015 units`
- Brighter at peaks (white) fading to dim gray at sea level
- This produces the "particle terrain" effect from the reference image

**Toggle UI (top-right HUD):**
```
LAYERS
[●] Wireframe grid       [W]
[●] Continent dots       [C]
[ ] Topographic terrain  [T]
```
Hotkeys `W`, `C`, `T` to toggle each layer.

All three Earth layers rotate together — slow rotation (0.05 rad/sec, real Earth is 7.27e-5 rad/sec but we exaggerate for visual feedback).

### 6.3 The 27,000-point debris field (`DebrisField.tsx`)

**This is the hero component. Must be GPU-instanced for performance.**

Use `THREE.Points` with `BufferGeometry` (not InstancedMesh — Points is faster for >10k objects):

```typescript
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('classification', new THREE.Float32BufferAttribute(classes, 1));
geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
```

**Custom shader (`debris.vert.glsl` + `debris.frag.glsl`):**

```glsl
// debris.vert.glsl
attribute float classification;  // 0=debris, 1=active, 2=rocket body, 3=Starlink
attribute float size;
varying float vClass;
varying float vDist;

void main() {
  vClass = classification;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  // Size attenuation by distance — closer objects are bigger
  gl_PointSize = size * (300.0 / vDist);
}
```

```glsl
// debris.frag.glsl
varying float vClass;
varying float vDist;

void main() {
  // Circular point with soft edge
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.35, d);

  vec3 color;
  if (vClass < 0.5)       color = vec3(0.44);                    // debris #707070
  else if (vClass < 1.5)  color = vec3(1.0);                     // active satellite
  else if (vClass < 2.5)  color = vec3(0.78);                    // rocket body #C8C8C8
  else                    color = vec3(0.94, 0.957, 1.0);        // Starlink #F0F4FF

  // Distance fade — far objects are slightly dimmer
  alpha *= clamp(1.0 - vDist / 60.0, 0.2, 1.0);

  gl_FragColor = vec4(color, alpha);
}
```

**Propagation loop:**
```typescript
useFrame((state) => {
  const now = new Date(Date.now() + timeOffset * timeMultiplier);
  // Web Worker returns batch of positions every 100ms
  for (let i = 0; i < count; i++) {
    const eci = propagateBatch[i];  // updated by worker
    positions[i*3]     = eci.x / 1000;  // km → units
    positions[i*3 + 1] = eci.z / 1000;  // Z up in Three.js
    positions[i*3 + 2] = -eci.y / 1000;
  }
  geometry.attributes.position.needsUpdate = true;
});
```

**Web Worker (`propagator.worker.ts`):**
- Receives array of `satrec` objects
- Every 100ms, calls `satellite.propagate(satrec, currentTime)` for all
- Posts back Float32Array of ECI positions
- Uses Comlink for clean async interface

### 6.4 Starlink — special treatment (`StarlinkLayer.tsx`)

Separate `THREE.Points` instance just for Starlink (~6,000 objects):
- Slightly brighter (`#F0F4FF`)
- Subtle pulse animation: `opacity = 0.85 + 0.15 * sin(time * 2 + offset)`
- Per-object phase offset so they don't pulse in sync — creates a "shimmer" effect
- Optional: when zoomed in, show their orbital plane lines (a few hundred faint white lines forming the constellation's lattice)

### 6.5 Atmosphere (`Atmosphere.tsx`)

Fresnel-based glow shader on a slightly larger sphere (radius 6.55):

```glsl
// atmosphere.frag.glsl
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float rim = 1.0 - dot(normalize(vNormal), normalize(vViewDir));
  rim = pow(rim, 2.5);
  vec3 color = vec3(0.71, 0.78, 0.90);  // #B5C6E6 ish
  gl_FragColor = vec4(color, rim * 0.4);
}
```

Renders behind everything, additive blending, gives Earth a faint blue rim that bleeds into Bloom.

### 6.6 Stars (`Stars.tsx`)

Use `drei`'s `<Stars radius={300} depth={50} count={5000} factor={4} fade speed={0.5} />` — or roll a custom static `THREE.Points` field with varying brightness.

### 6.7 Camera (`Camera.tsx`)

**Intro animation (first 4 seconds):**
- Frame 0: position `[0, 0, 60]`, looking at origin, FOV 70
- Frame 1.5s: ease to `[0, 0, 30]`, FOV 55
- Frame 3s: ease to `[12, 4, 18]`, FOV 50
- After 4s: hand off to `OrbitControls`

**Idle auto-rotation:**
- After 8s of no user interaction, slowly rotate camera around Y axis (0.05 rad/s)
- Resume on any drag/scroll, fade back in after idle

**Hotkeys:**
- `R` — reset camera
- `+/-` — zoom
- Click object → smooth cinematic zoom to that position (Three.js `useSpring`)

---

## 7. HUD OVERLAY — PIXEL-PERFECT SPECS

The HUD lives in absolute-positioned `<div>`s over the Canvas. Uses `pointer-events: none` on container, `pointer-events: auto` on interactive panels.

**Global HUD typography:**
- Headers: `JetBrains Mono` 9px, letter-spacing 0.08em, ALL CAPS, color `#909090`
- Live numbers: `JetBrains Mono` 24px, weight 400, color `#FFFFFF`
- Labels: `JetBrains Mono` 11px, color `#909090`
- Body: `Inter` 12px, color `#C0C0C0`

**Panel chrome (the L-shaped corner brackets from the reference image):**

```tsx
function Cornerframe({ children, w, h }) {
  return (
    <div className="relative" style={{ width: w, height: h }}>
      {/* Four L-brackets in each corner */}
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/40" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/40" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/40" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/40" />
      <div className="p-4">{children}</div>
    </div>
  );
}
```

### 7.1 Top-left: `SystemStatus.tsx`

```
┐                                ┌
│  ORBITAL TRACKING SYSTEM v2.4  │
│  ───────────────────────────   │
│                                │
│  EPOCH       2026-06-13T14:22Z │
│  CATALOG      27,841 objects   │
│  PROPAGATOR   SGP4 / WGS84     │
│  FRAME        ECI J2000        │
│  FPS          60.0             │
│                                │
│  STATUS  ▮ TRACKING NOMINAL    │
┘                                └
```
- 280px wide
- The FPS and timestamp tick in real-time
- Status pill: `▮` becomes red `▮` if WebGL stalls or TLE fetch fails

### 7.2 Top-right: `Classification.tsx`

```
┐                                  ┌
│  OBJECT CLASSIFICATION           │
│  ─────────────────────────       │
│                                  │
│  Active satellites               │
│  ████████░░░░░░░░░░░░  9,247     │
│                                  │
│  Debris fragments                │
│  ████████████████████  21,683    │
│                                  │
│  Rocket bodies                   │
│  ███░░░░░░░░░░░░░░░░░  2,156     │
│                                  │
│  Starlink constellation          │
│  ██████░░░░░░░░░░░░░░  5,891     │
│                                  │
│  TOTAL TRACKED      38,977       │
┘                                  └
```
- 320px wide
- Bars are pure-white solid fill, dim-gray for unfilled
- Numbers count up from 0 on load (1.2s ease-out)

### 7.3 Bottom-left: `AltitudeChart.tsx`

A live-updating histogram showing **count of objects per 50 km altitude bin from 200 km to 2,000 km** (LEO range). This is the chart that reveals the Starlink shell at 550 km and the dense debris band at 800–900 km.

- 360 × 140 px
- Y axis: log scale, count
- X axis: altitude in km
- Drawn as small vertical bars (`<rect>` SVG, 4px wide)
- White bars, gray axis lines
- Hover over a bar shows `"850 km: 3,421 objects"` in a tooltip
- Annotated dashed lines at notable altitudes:
  - `ISS — 408 km`
  - `Hubble — 540 km`
  - `Starlink shell — 550 km`
  - `Sun-synchronous — 800 km`

### 7.4 Bottom-center: `TimelineScrubber.tsx`

```
┐                                                          ┌
│  ◀◀   ◀   ⏸   ▶   ▶▶          T+ 00:14:23 (×100)         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  T-12h                  NOW                       T+12h  │
┘                                                          └
```
- 600px wide
- Speed multipliers: ×0.1, ×1, ×10, ×100, ×1000, ×10000
- At ×10000, you can watch an entire 90-minute LEO orbit in ~0.5 sec — extremely satisfying
- Scrub the dot to jump to any time

### 7.5 Right side: `FilterPanel.tsx`

```
┐                          ┌
│  FILTERS                 │
│  ──────────────────      │
│                          │
│  CLASS                   │
│  [●] Active   9,247      │
│  [●] Debris   21,683     │
│  [●] Rockets  2,156      │
│  [●] Starlink 5,891      │
│                          │
│  ALTITUDE BAND           │
│  ├─●━━━━━━━━━━┤          │
│   LEO  MEO   GEO         │
│                          │
│  LAYERS                  │
│  [●] Wireframe   [W]     │
│  [●] Continents  [C]     │
│  [ ] Terrain     [T]     │
│  [●] Atmosphere          │
│  [●] Star field          │
│  [ ] Orbit trails        │
│                          │
│  EFFECTS                 │
│  [●] Bloom               │
│  [●] Chromatic aberration│
│  [●] Scanlines           │
└                          ┘
```
- 240px wide
- Toggles are minimalist `[●]` / `[ ]` characters in mono font
- Hover row highlights with `bg-white/4`
- All toggles affect scene in real-time (no apply button)

### 7.6 Center reticle: `Crosshair.tsx`

When the user hovers an object in 3D space, a small crosshair appears with a leader line and a label:

```
        │
   ─────┼─────
        │
        │
        └──── DELTA-2 R/B
              NORAD 12345 · 803 km · 98.4° incl
```
- Crosshair is a 14px `+` made of two 1px lines
- Leader line uses 0.5px stroke, dashed
- Label panel is a glassmorphic mini Cornerframe
- Animates in with `framer-motion` (200ms)

### 7.7 Click-to-inspect: `ObjectInspector.tsx`

Right-side slide-in panel (400px wide) on object click:

```
┐                                    ┌
│  OBJECT DETAIL              [×]    │
│  ──────────────────────────        │
│                                    │
│  STARLINK-1037                     │
│  NORAD 44742 · USA 2019-074K       │
│                                    │
│  ORBITAL PARAMETERS                │
│  Apogee          553.2 km          │
│  Perigee         547.8 km          │
│  Inclination     53.05°            │
│  Period          95.6 min          │
│  Velocity        7.59 km/s         │
│                                    │
│  STATE VECTOR (ECI)                │
│  X    +4,328.21 km                 │
│  Y    -3,917.55 km                 │
│  Z    +2,104.88 km                 │
│                                    │
│  TLE EPOCH                         │
│  2026-06-13T08:14:22.443Z          │
│                                    │
│  [ TRACK ]  [ ORBIT PATH ]         │
┘                                    └
```
- `TRACK` locks camera onto the object
- `ORBIT PATH` draws a full orbit ellipse from the propagated path

### 7.8 Decorative HUD elements

Scattered throughout the screen edges (purely decorative, but they sell the "command terminal" vibe):
- Tiny scrolling text streams (faint, opacity 0.2)
- Random floating numbers that tick (e.g. `LAT +28.91°  LON -95.34°` with the camera's sub-point)
- Small dotted grid markers in corners
- Faint scanline overlay (`background: repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.015) 3px)`)

---

## 8. ANIMATIONS & MOTION DESIGN

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Initial load | Black → Earth fades in → debris materializes | 3s total | cubic-bezier(0.4, 0, 0.2, 1) |
| Debris materialize | Random per-particle delay 0–1.5s, scale 0→1 | 1.5s | ease-out |
| HUD panels enter | Stagger from top-left clockwise, slide+fade | 0.6s, 80ms stagger | ease-out |
| Number counters | Count up from 0 to live value | 1.2s | ease-out |
| Earth rotation | Continuous, 0.05 rad/s | infinite | linear |
| Atmosphere shimmer | Sine wave 0.95–1.0 intensity | 4s period | sine |
| Starlink pulse | Per-object phase sin wave | 2s period | sine |
| Hover selection ring | Scale 0.8→1.2 pulse + 360° rotation | 3s | linear, infinite |
| Click-to-track | Camera spring to position | 1.2s | spring(stiffness=80, damping=20) |
| Panel open/close | Slide + fade | 0.3s | cubic-bezier |
| Time scrub | Trails ghost (objects leave fading trail at >×100) | continuous | - |
| Glitch effect | Random char swap in mono text | every 8s, 150ms | linear |

---

## 9. PERFORMANCE BUDGET

| Concern | Target | Strategy |
|---|---|---|
| Total objects | 27,000–40,000 | Single `THREE.Points` with BufferGeometry |
| Frame rate | 60fps on M1, 45fps on integrated GPU | Web Worker propagation, throttled to 10Hz |
| Load time | First paint <1.5s, full data <4s | Parallel fetch + localStorage cache |
| Memory | <250MB | Float32Array buffers, no per-object overhead |
| Position update | Every 100ms (smooth visually) | Buffer swap via SharedArrayBuffer if available |
| Earth terrain points | 40,000 max | Static buffer, no per-frame update |
| Bloom + post FX | 60fps | Half-resolution Bloom pass |

**Gotchas to handle:**
- CelesTrak occasionally rate-limits — implement exponential backoff + serve from localStorage
- Some TLEs have bad checksums — wrap `propagate()` in try/catch, skip invalid
- `MEAN_MOTION` near 0 (decayed objects) — filter them out client-side
- WebGL context loss on tab background — `gl.getExtension('WEBGL_lose_context')` recovery

---

## 10. BUILD PHASES (ORDER MATTERS)

Build incrementally. Each phase should be a working demo before moving on.

### Phase 1 — Foundation (Day 1)
1. Vite + React + TS scaffold
2. Tailwind config with CSS vars from §3
3. Fonts loaded (JetBrains Mono + Inter)
4. `App.tsx` with black canvas full-screen
5. R3F `<Canvas>` with OrbitControls and a single test sphere

### Phase 2 — Earth (Day 2)
1. Wireframe sphere working with lat/lon lines
2. Pre-generate `earth-dots.png` from a Blue Marble image (offline script in `/scripts/generate-earth-dots.js`)
3. Continent dot field rendering correctly mapped to lat/lon
4. Topographic point cloud from heightmap
5. Layer toggle UI (basic, no styling yet)
6. Atmosphere glow shader

### Phase 3 — Data pipeline (Day 3)
1. `tleService.ts` — fetch from CelesTrak with localStorage cache
2. Parse TLE JSON → `satrec` array via `satellite.twoline2satrec`
3. Web Worker setup with Comlink
4. Worker propagates a small batch (100 objects) every 100ms
5. Verify positions look correct (sanity check: ISS at ~408 km altitude)

### Phase 4 — Render the field (Day 4)
1. `DebrisField.tsx` with Points + BufferGeometry
2. Custom shader with class-based coloring
3. Scale up to full ~27k objects
4. Distance-based size attenuation
5. Verify Starlink shell visible at ~550 km
6. Add `StarlinkLayer` with pulse animation

### Phase 5 — HUD chrome (Day 5)
1. Cornerframe component
2. SystemStatus panel (top-left)
3. Classification panel (top-right) with animated bars
4. FilterPanel (right)
5. AltitudeChart histogram with bins
6. TimelineScrubber

### Phase 6 — Interactivity (Day 6)
1. Raycasting for object hover (use spatial hashing for 27k objects)
2. Crosshair + label on hover
3. ObjectInspector slide-in on click
4. Camera spring-to-object on click
5. Hotkeys (R, W, C, T, space=play/pause)

### Phase 7 — Polish (Day 7)
1. Intro camera animation
2. Particle materialization on load
3. Number counter animations
4. Bloom + Chromatic Aberration tuning
5. Scanline overlay
6. Loading screen with progress
7. Mobile responsive HUD (collapse panels on <768px)
8. Performance profiling — stay above 45fps on weaker hardware

### Phase 8 — Deploy (Day 8)
1. Build optimization
2. Deploy to Vercel/Netlify
3. Custom domain if desired
4. README with screenshots

---

## 11. STRETCH GOALS (POST-MVP)

- **Conjunction analysis** — flag any two objects with predicted close approach < 5 km in next 24h. Pulse them red. Use CelesTrak SOCRATES feed.
- **Orbit trail mode** — draw the full ellipse for the selected object, color-coded by altitude
- **Time-of-day Earth shading** — show the night side darker, sunlit side faintly visible
- **Constellation grouping** — toggle to show Starlink shells as connected lattices
- **Decay prediction** — color objects red if predicted to reenter within 30 days
- **Compare past vs present** — load TLEs from 5 years ago side-by-side to show debris growth
- **Audio** — ambient drone, click on objects = soft chime tone pitched by altitude
- **VR mode** — `@react-three/xr` for headset support

---

## 12. SPECIFIC PITFALLS TO AVOID

1. **Don't use InstancedMesh for 27k points.** `THREE.Points` with BufferGeometry is 5–10× faster and simpler.
2. **Don't propagate on the main thread.** SGP4 for 27k objects every frame will kill FPS. Web Worker is mandatory.
3. **Don't fetch all CelesTrak groups serially.** Parallel `Promise.all`.
4. **Don't trust TLE epoch blindly.** Some are weeks old. Validate `now - epoch < 14 days` and warn the user.
5. **Don't use a photo texture for Earth in the monochrome version.** It will clash with the aesthetic. Use the dot mask approach.
6. **Don't forget WGS84 ↔ Three.js axis conversion.** ECI has Z up, Three.js has Y up. Standard transform: `(x, y, z) → (x, z, -y)`.
7. **Don't render the SelectionRing as a separate mesh per object.** One persistent ring that follows the hovered object.
8. **Don't animate the FPS counter at 60Hz.** Update once per second, not per frame.
9. **Don't ship dev tooling.** Strip Stats and debug panels in production build.
10. **Don't apply Bloom to everything.** Use selective bloom (luminance threshold 0.4) so only the brightest pixels glow — preserves the crisp monochrome.

---

## 13. ENVIRONMENT CHECKLIST FOR CLAUDE CODE

When handing this to Claude Code, also provide:
- This file (`ORBITAL_DEBRIS_VISUALIZATION_PLAN.md`)
- The reference image (the monochrome HUD inspiration)
- A clear directive: **"Build this in phases. Show me Phase 1 working before starting Phase 2. Use the exact color hex values and typography from §3 and §7."**

---

## 14. FINAL VIBE CHECK

If the result doesn't make someone go "whoa, *what is this*" within the first 3 seconds — it's not done yet.

The success criteria:
- Black screen with white particles
- Visible orbital shells (you can SEE the Starlink ring at 550km)
- Smooth 60fps rotation
- HUD panels feel like a Hollywood movie's military command center
- Every number on screen is real, live, from NORAD

If those five things are true — ship it.

---

*End of plan. Total components: 38. Total files: ~52. Estimated build time: 6–8 days for a competent dev. Designed for Claude Code execution.*
