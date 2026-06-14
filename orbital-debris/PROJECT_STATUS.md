# ORBITAL DEBRIS FIELD — Project Status & Engineering Doc

> **Purpose of this file:** a complete, minute-detail snapshot of what has been built, every
> architectural decision, the data flow, the math, the known gotchas, and what remains to do.
> Feed this back to Claude in a future session to restore full context instantly.
>
> **Last updated:** 2026-06-13
> **Companion file:** `../ORBITAL_DEBRIS_VISUALIZATION_PLAN.md` (the original ultra-plan / design brief).

---

## 0. TL;DR — current state

A working, high-end real-time 3D visualization of ~18,900 tracked Earth-orbiting objects, rendered
as a glowing monochrome (white-on-black) particle field around a real-geography Earth, with a full
NORAD-command-terminal HUD. Runs at **60 FPS** with the full catalog.

**Done & verified:** project scaffold, full Earth (solid surface + accurate GeoJSON coastlines + land
dots, oriented in the true ECI frame via GMST), the 18.9k-object debris field (GPU `THREE.Points` +
custom shader, SGP4-propagated on the main thread at 10 Hz), the complete HUD (system status,
classification, filters, altitude histogram, timeline scrubber, loading screen), **object selection**
(hover label + click inspector + selection ring + orbit path), **camera fly-to-location** search, and a
robust **server-side cached catalog architecture** (`/api/catalog`) with stale-on-failure + bundled
fallback so it never hammers CelesTrak and always renders.

**Not done yet:** Web Worker propagation (needed only for the full ~27k+ catalog / weaker GPUs),
serverless `/api/catalog` for static production hosting, and most stretch goals (conjunction analysis,
day/night Earth shading, audio, VR, constellation lattices, decay prediction).

**Location:** `D:\Project_Visualization\orbital-debris\`
**Run:** `npm run dev` → http://localhost:5173

---

## 1. Vision (unchanged from the plan)

Black screen, white particles, visible orbital shells (you can SEE the Starlink ring at ~550 km and the
dense debris band at 800–900 km), smooth 60 fps, a Hollywood-command-center HUD where every number is
real telemetry. Three feelings: **awe** (scale), **unease** (Kessler density), **precision** (real data).
Strictly monochrome — no saturated colors anywhere.

---

## 2. Tech stack (ACTUAL installed versions — note: newer than the plan specified)

| Concern | Package | Version |
|---|---|---|
| Build/dev | `vite` | ^8.0.12 |
| Framework | `react` / `react-dom` | ^19.2 (NOTE: React 19, plan said 18) |
| Language | `typescript` | ~6.0 |
| 3D engine | `three` | ^0.184 |
| R3F | `@react-three/fiber` | ^9.6 (R3F v9, not v8) |
| R3F helpers | `@react-three/drei` | ^10.7 |
| Post FX | `@react-three/postprocessing` | ^3.0 |
| Orbital math | `satellite.js` | ^7.0.1 (v7, not v5 — see §6) |
| State | `zustand` | ^5.0 |
| Animation | `framer-motion` | ^12.40 |
| Styling | `tailwindcss` | ^3.4 + inline styles |
| Geo data | `world-atlas` | ^2.0 (land-110m TopoJSON) |
| Geo processing | `topojson-client` ^3.1, `d3-geo` ^3.1 | |
| Fonts | JetBrains Mono + Inter | via Google Fonts CDN (`index.html`) |
| Browser testing | `playwright` (devDep) | ^1.60 (uses system Chrome channel) |
| Installed-but-unused | `comlink`, `swr` | reserved for Web Worker / data fetching, not wired yet |

**Environment:** Windows 11, Node v24.14, npm 11. No git repo initialized.

---

## 3. How to run / build / verify

```bash
cd D:\Project_Visualization\orbital-debris
npm install            # if fresh
npm run dev            # dev server at http://localhost:5173  (provides /api/catalog)
npm run build          # tsc -b && vite build  → dist/
npm run preview        # serves dist/ AND still provides /api/catalog
node scripts/build-fallback.mjs   # regenerate public/catalog-fallback.json from live CelesTrak
```

**Type-check only:** `npx tsc -b` (strict — `verbatimModuleSyntax`, `noUnusedLocals/Parameters`).
The build uses two TS projects: `tsconfig.app.json` (covers `src/`) and `tsconfig.node.json`
(covers `vite.config.ts` + `vite-plugins/`).

**Visual/perf verification pattern** (used throughout dev — see the `verifying-the-app` memory):
drive the running dev server with a throwaway Playwright `.mjs` using
`chromium.launch({ channel: 'chrome', headless: true })`, wait for
`document.body.innerText.includes('OBJECT CLASSIFICATION')` (load complete), screenshot, Read the PNG,
measure FPS with a 2–3 s `requestAnimationFrame` counter in `page.evaluate`. Clean up the temp files after.

---

## 4. Full file map (every source file, what it does)

```
orbital-debris/
├── index.html                      Google Fonts (JetBrains Mono + Inter), #root, title
├── vite.config.ts                  plugins: [react(), catalogApi()]; worker.format 'es'
├── tailwind.config.js              content globs, mono/sans font families
├── tsconfig.app.json               strict frontend TS config (resolveJsonModule: true)
├── tsconfig.node.json              includes vite.config.ts + vite-plugins/
├── .gitignore                      adds .cache/, node_modules/, dist/, .pw-profile/
├── PROJECT_STATUS.md               <-- THIS FILE
│
├── vite-plugins/
│   └── catalogApi.ts               ★ server-side cached /api/catalog endpoint (see §5)
│
├── scripts/
│   └── build-fallback.mjs          regenerates public/catalog-fallback.json from CelesTrak
│
├── public/
│   ├── catalog-fallback.json       ★ bundled full sample catalog (~18,910 objects, ~7.9 MB)
│   ├── favicon.svg, icons.svg      (icons.svg is leftover Vite scaffold, unused)
│
├── src/
│   ├── main.tsx                    React root; imports styles/globals.css; renders <App/> (no StrictMode)
│   ├── App.tsx                     loads catalog on mount via loadAllTLEs(); renders <Scene/> + <HUD/>
│   │
│   ├── styles/globals.css          CSS vars (color palette), resets, scrollbar, .scanlines overlay
│   │
│   ├── data/
│   │   ├── tleService.ts           ★ frontend loader: fetch /api/catalog → /catalog-fallback.json →
│   │   │                             localStorage; json2satrec; classify; returns OrbitalObject[]
│   │   ├── classification.ts       classify(name, forceClass?) -> 0 debris|1 active|2 rocket|3 starlink
│   │   └── locations.ts            ~60 cities/countries/launch-sites + searchLocations() + parseLatLon()
│   │
│   ├── store/  (zustand, see §9)
│   │   ├── useSceneStore.ts        time, play state, layer toggles, effects, flyTo, resetCamera, intro
│   │   ├── useDataStore.ts         objects[], idToIndex Map, counts, filters, selectedId, hoveredId
│   │   └── useHUDStore.ts          (NOT created — HUD state lives in the two stores above)
│   │
│   ├── scene/
│   │   ├── Scene.tsx               <Canvas> root; raycaster Points threshold 0.05; onPointerMissed deselect; EffectComposer
│   │   ├── Camera.tsx              ★ intro animation + OrbitControls + fly-to + reset + idle auto-rotate
│   │   ├── Lighting.tsx            minimal ambient + one directional (gives Earth its day/night terminator)
│   │   ├── Stars.tsx               6,000-point static background star sphere (toggle: showStars)
│   │   ├── Atmosphere.tsx          fresnel rim-glow shader on a slightly larger sphere (toggle: showAtmosphere)
│   │   ├── shared.ts               ★ non-reactive sim singleton: { timeMs, positions, count }
│   │   ├── earth/
│   │   │   ├── EarthLayers.tsx     group rotated by GMST(sim.timeMs); wraps the 4 earth layers
│   │   │   ├── SurfaceEarth.tsx    opaque dark sphere + glowing GeoJSON coastlines (toggle: showSurface)
│   │   │   ├── DottedEarth.tsx     accurate land-fill dots via point-in-polygon (toggle: showDots / "LAND DOTS")
│   │   │   ├── WireframeEarth.tsx  lat/lon graticule grid sphere (toggle: showWireframe / "GRATICULE")
│   │   │   ├── TopographicEarth.tsx procedural elevation point cloud (toggle: showTerrain, default OFF)
│   │   │   └── geoData.ts          ★ builds coastline LineSegments + land dots from world-atlas land-110m
│   │   └── orbital/
│   │       ├── DebrisField.tsx     ★ THE hero: THREE.Points + shader, SGP4 @10Hz, pointer-pick events
│   │       ├── Selection.tsx       ★ hover/select rings (billboarded) + orbit path + live drei <Html> label
│   │       ├── DetailModels.tsx    ★ LOD: selected/hovered/nearest dots upgrade to tumbling 3D craft
│   │       └── models.ts           procedural per-class wireframe craft (satellite/starlink/rocket/debris)
│   │
│   ├── hud/
│   │   ├── HUD.tsx                 root overlay; framer-motion staggered entrance; positions every panel
│   │   ├── components/
│   │   │   ├── Cornerframe.tsx     L-bracket panel chrome w/ optional title (default export)
│   │   │   ├── Readout.tsx         requestAnimationFrame count-up number ticker (easeOutQuart)
│   │   │   ├── ProgressBar.tsx     thin white-on-#1A1A1A bar w/ label+count
│   │   │   └── ToggleSwitch.tsx    [●]/[○] mono toggle row w/ label, count, hotkey badge
│   │   ├── effects/
│   │   │   └── ScanlineOverlay.tsx fixed scanline gradient + vignette (toggle: scanlinesEnabled)
│   │   └── panels/
│   │       ├── SystemStatus.tsx    top-left: live UTC, catalog count, propagator, frame, live FPS, status
│   │       ├── Classification.tsx  top-right-ish: 4 class bars + total (animated Readouts)
│   │       ├── FilterPanel.tsx     right edge: class filters + layer toggles + effect toggles + hotkeys
│   │       ├── AltitudeChart.tsx   bottom-left: SVG log-scale altitude histogram w/ annotation lines
│   │       ├── TimelineScrubber.tsx bottom-center: transport, speed presets, ±12h scrub, T+ clock
│   │       ├── LocationSearch.tsx  top-center: "GO TO" search box + RESET (drives camera fly-to)
│   │       ├── ObjectInspector.tsx right slide-in on click: full orbital params + live state vector
│   │       ├── NavControls.tsx     bottom-right: hold-to-orbit d-pad + zoom +/- + reset (drives camera)
│   │       └── LoadingScreen.tsx   full-screen loader w/ progress + scanning line; error+retry state
│   │
│   ├── shaders/
│   │   ├── debris.vert.glsl        size attenuation + Starlink pulse; passes class/dist/alpha
│   │   ├── debris.frag.glsl        soft circular point; class→grayscale color; distance fade
│   │   ├── atmosphere.vert.glsl    passes normal + view dir
│   │   └── atmosphere.frag.glsl    fresnel rim, cool-blue, additive
│   │
│   └── utils/
│       ├── constants.ts           EARTH_RADIUS (6.371 units), SCALE (1/1000), timings, etc.
│       ├── math.ts                eciToScene, geodeticToSceneECEF, altitudeKm, etc.
│       └── format.ts              fmtCount/fmtKm/fmtDeg/fmtEpoch/fmtDuration/fmtVelocity
│
└── DEAD/LEFTOVER (safe to delete, from Vite scaffold; not imported):
    src/App.css, src/index.css, src/assets/{hero.png,react.svg,vite.svg}, public/icons.svg
```

---

## 5. ★ Data architecture — the catalog cache (most important system)

**Problem solved:** CelesTrak rate-limits (HTTP 403) aggressive/repeated requests per IP. The original
design fetched multiple feeds from the browser on every reload, which (a) hammered CelesTrak and (b)
broke under rate-limiting. The new design fetches CelesTrak **once per day, server-side**.

### 5.1 Flow

```
Browser ──fetch──> /api/catalog ──(Vite plugin, server-side)──> CelesTrak (8 feeds)
   │                    │
   │                    ├─ in-memory `mem` (richest catalog seen)
   │                    ├─ disk cache .cache/catalog.json (TTL 24h)
   │                    └─ bundled public/catalog-fallback.json (~18,910 objects)
   │
   └─ fallbacks if /api/catalog unreachable (e.g. static deploy):
        /catalog-fallback.json (bundled)  →  localStorage 'orbital_catalog_v2'
```

### 5.2 `vite-plugins/catalogApi.ts` (the server)

- Exposes `GET /api/catalog` via `configureServer` AND `configurePreviewServer` (works in `dev` and `preview`).
- **FEEDS** (8): `active`, `starlink`(forceClass 3), `oneweb`, `fengyun-1c-debris`(0), `cosmos-2251-debris`(0),
  `iridium-33-debris`(0), `cosmos-1408-debris`(0), `analyst`(0). Fetched **sequentially (concurrency 1)** with a
  **350 ms delay** between feeds. `forceClass` overrides name-based classification; `-1` means "classify by name".
- **fetchFeed:** 403/429 → throw `RATE_LIMIT` (fail fast, NO retry). Non-`[`/`{` body → `Non-JSON` (CelesTrak
  returns plain-text "Invalid query" for bad group names). Dedup by `NORAD_CAT_ID`, tag each object with `OBJECT_CLASS`.
- **TTL = 24h.** **REFRESH_COOLDOWN = 10 min** (won't re-hit CelesTrak more than once per 10 min while stale).
- **getCatalog() logic:**
  1. `seedMem()` — load `mem` from the richer of {disk cache, bundled fallback}.
  2. If nothing at all → last-resort synchronous live fetch → else 503 "catalog unavailable".
  3. `fresh = mem.source !== 'fallback' && (now - mem.updated < TTL)`. The fallback is deliberately treated as
     *never fresh* so the server keeps pulling toward live until a real catalog commits.
  4. If not fresh → `triggerRefresh()` (background, throttled by cooldown).
  5. Always returns `{ updated, stale, source, objects }` **instantly** from best-known data.
- **triggerRefresh()** — background `buildCatalog()`; **commits only if `size(new) >= size(mem)`**. This is the
  critical "never downgrade" rule: a rate-limited partial fetch (e.g. 3,862 when active/starlink 403) is
  **rejected**, keeping the richer 18,910 catalog. Verified in logs:
  `[catalog] live refresh partial (3862) — keeping 18910 (fallback)`.
- Response shape: `{ updated:number, stale:boolean, source:'live'|'cache'|'fallback', objects: RawOMM[] }`.

### 5.3 `src/data/tleService.ts` (the client)

- `loadAllTLEs(onProgress)` resolution order: **`/api/catalog` → `/catalog-fallback.json` → localStorage**.
- For each returned OMM record: `satellite.json2satrec(raw)` to build the satrec; skip if `satrec.error !== 0`
  or `MEAN_MOTION < 0.01` (decayed). `classify(name, OBJECT_CLASS>=0 ? OBJECT_CLASS : undefined)`.
- Best-effort `localStorage` write under key `orbital_catalog_v2` (may exceed ~5 MB quota for the full catalog —
  caught & ignored; the server cache is the real protection).
- Progress messages stream into the LoadingScreen; final message tags source (`· cached` / `· offline sample`).

### 5.4 `scripts/build-fallback.mjs`

Standalone Node script (own copy of the feed list) that fetches all 8 feeds and writes
`public/catalog-fallback.json` as `{ updated, objects:[...with OBJECT_CLASS...] }`. Run it occasionally to
refresh the bundled sample. Current bundled file ≈ 18,910 objects / 7.9 MB.

### 5.5 ⚠️ Production caveat

The Vite plugin only runs under `vite dev` / `vite preview`. A **plain static deploy** (Vercel/Netlify static,
GitHub Pages) has **no `/api/catalog`** → the frontend gracefully uses the bundled `/catalog-fallback.json`
(renders fine, but not auto-refreshing live). **For live data in production, port `catalogApi.ts`'s logic into a
serverless function at the same path `/api/catalog`** — no client change needed. (Not yet done.)

---

## 6. satellite.js v7 specifics (important)

- Installed **v7.0.1** (plan assumed v5). Use **`satellite.json2satrec(ommJson)`** directly on CelesTrak's OMM
  JSON — do NOT hand-reconstruct fixed-width TLE strings (that was the original bug; fragile column formatting).
- Per-object `propagate()` and `json2satrec()` are **pure JS**. v7 also ships a **WASM bulk-propagator** that
  imports `node:module`/`node:worker_threads`; Vite externalizes those (harmless build warnings). We never call
  the WASM path (no `BulkPropagator`), so it never executes.
- Also used: `gstime(date)` (GMST radians), `eciToGeodetic(eci, gmst)`, `degreesLat/degreesLong` (in ObjectInspector).
- Sanity check verified: ISS altitude ≈ 430 km from a live propagate.

---

## 7. Coordinate systems & math (`src/utils/math.ts`, `constants.ts`)

- **Scale:** `SCALE = 1/1000`, so **1 scene unit = 1000 km**. `EARTH_RADIUS = 6.371` units.
- **ECI → scene:** `(x, y, z)_ECI → (x·S, z·S, −y·S)` (ECI Z-up becomes scene Y-up). Debris positions use this.
- **Earth-fixed (ECEF) → scene-local:** `geodeticToSceneECEF(lat, lon, r)` =
  `(r·cosLat·cosLon, r·sinLat, −r·cosLat·sinLon)`. Continents/graticule are built in this frame.
- **★ GMST orientation:** `EarthLayers` rotates its group by `group.rotation.y = satellite.gstime(sim.timeMs)`.
  This rotates the ECEF-built geography into the true ECI frame, so continents line up with the (real-ECI)
  debris ground tracks AND "go to location" points at the actually-rendered location. Math verified: a Three.js
  Y-rotation by GMST applied to the scene-local ECEF point reproduces the standard ECEF→ECI Z-rotation.
  **Consequence:** at ×1 speed Earth barely rotates (real sidereal rate ~7.3e-5 rad/s); crank the time
  multiplier to see it spin. (This intentionally replaced the plan's exaggerated fixed spin.)
- **altitudeKm(x,y,z)** = `|(x,y,z)| / SCALE − 6371`.

---

## 8. Shared sim clock & live positions (`src/scene/shared.ts`)

Non-reactive module singleton `sim = { timeMs, positions, count }` — deliberately OUTSIDE React state to avoid
per-frame re-renders.
- **Written by `DebrisField`** every 10 Hz tick: advances `sim.timeMs` by `dt × timeMultiplier` when playing,
  and writes each object's live scene-space position into `sim.positions` (a `Float32Array` of length count×3).
- **Read by:** `EarthLayers` (GMST from `sim.timeMs`), `Selection` (live position of hovered/selected object
  by index), `ObjectInspector` (re-propagates the selected object at `sim.timeMs` for live velocity/state vector).

---

## 9. State management (zustand)

### `useSceneStore.ts`
`timeMultiplier, timeOffset, isPlaying`, layer toggles `showSurface/showWireframe/showDots/showTerrain/
showAtmosphere/showStars/showOrbitTrails`, effect toggles `bloomEnabled/chromaticEnabled/scanlinesEnabled`,
`introComplete`, `flyTo: {lat,lon,label}|null`, `resetCameraNonce`. Actions: `setTimeMultiplier/setTimeOffset/
setIsPlaying/toggleLayer/setIntroComplete/setFlyTo/resetCamera`.
**Defaults:** surface/wireframe/dots/atmosphere/stars ON; terrain/orbitTrails OFF; bloom ON;
**chromaticEnabled OFF** (it splits tiny white points into rainbow confetti — see §11); scanlines ON.

### `useDataStore.ts`
`objects: OrbitalObject[]`, `idToIndex: Map<noradId, arrayIndex>` (built in setObjects, used by Selection/Inspector
to read live positions), `totalCount`, `loadingProgress/loadingMessage/isLoaded/loadError`, `selectedId`,
`hoveredId`, class filters `filterActive/filterDebris/filterRockets/filterStarlink`, `altMin/altMax` (declared,
not yet wired to a UI control). `OrbitalObject = { noradId, name, objectId, classification 0-3, satrec, epoch,
inclination, eccentricity, meanMotion }`.

(There is no `useHUDStore` — the plan listed one but HUD state lives in the two stores above.)

---

## 10. Feature details

### 10.1 The debris field (`scene/orbital/DebrisField.tsx`)
- One `THREE.Points` + `BufferGeometry`, attributes `position` (Float32, updated each tick), `classification`,
  `pointSize`. Custom `ShaderMaterial` (additive, depthWrite off). Sizes: active 2.2, starlink 1.8, rocket 1.6,
  debris 1.0.
- `useFrame` throttled to **10 Hz**: advance sim time, loop all objects, apply class filters (hidden → position
  (0,0,0) which sits inside the opaque Earth so it's occluded/unpickable), `propagate` → ECI→scene → write buffer.
  `geometry.attributes.position.needsUpdate = true`.
- **Picking:** `onPointerMove`/`onPointerOut`/`onClick` on the `<points>`; R3F gives `e.index` → `objects[index]`
  → set `hoveredId`/`selectedId`. Canvas sets `raycaster.params.Points.threshold = 0.05`.
- **Performance:** main-thread SGP4 for ~18.9k objects holds **60 FPS** (verified). This is the prime candidate
  for the Web Worker move if object count grows much higher — see §13.

### 10.2 Selection visuals (`scene/orbital/Selection.tsx`)
- Reads `hoveredId`/`selectedId`/`idToIndex`; each frame reads live position from `sim.positions[index]`.
- **Selected:** bright billboarded ring (faces camera via `quaternion.copy(camera.quaternion)`, scaled by
  distance for ~constant screen size) + 4 crosshair ticks, slow spin. **Hover:** fainter ring (only when hovered
  ≠ selected). Both use `depthTest:false` so they're always visible.
- **Orbit path:** when an object is selected AND `showOrbitTrails` is on, a `lineLoop` traces one full orbital
  period — `1440/meanMotion` minutes sampled in 256 steps, propagated in the inertial frame, additive blue.
- **Live label:** drei `<Html>` follows the active (hover-else-select) object: name + class + NORAD + altitude +
  inclination, mono font, drop-shadowed.

### 10.2b Detail models / LOD (`scene/orbital/DetailModels.tsx` + `models.ts`)
- **Why:** at full-field view every object is 1–2 px (1 unit = 1000 km), so it must stay a GPU point. Real 3D
  shapes only pay off close up — so dots **upgrade to little 3D craft** on demand, keeping the swarm + 60fps.
- **What upgrades:** the **selected** object, the **hovered** object, and (only when the camera is within
  `NEAREST_DIST=15` of centre) the **14 nearest visible** objects. Nearest set recomputed at ~4Hz (`RECOMPUTE_MS=250`)
  by a throttled linear scan of `sim.positions` with a top-N — negligible cost. The set is React state; each model
  child positions/tumbles itself per-frame from `sim.positions[index]`.
- **`models.ts`:** asset-free geometry built from primitives, merged to one non-indexed BufferGeometry per class,
  then `EdgesGeometry` for the bright white outline. 0=debris (jittered icosahedron rock), 1=active sat
  (body+2 solar wings+mast), 2=rocket body (cylinder+nozzle), 3=Starlink (flat panel+bus). Each renders as a dark
  opaque `meshBasicMaterial` fill + additive white edge lines (blooms). Distance-scaled for ~constant screen size,
  clamped [0.03, 0.4]; tumbles on x/y at id-seeded rates.
- Mounted in `Scene.tsx` between `<DebrisField/>` and `<Selection/>`. Verified in-browser: models render as white
  wireframe craft when zoomed in, FPS ~57, no console errors.

### 10.3 Earth (`scene/earth/*`)
- **SurfaceEarth:** opaque `meshStandardMaterial` sphere (`#0a1726`, radius ×0.999) — anchors the scene & occludes
  debris behind the planet. Coastlines: `lineSegments` from `buildCoastlines()`, color `#cfe8ff`, opacity 0.85,
  additive → glows under bloom. The PRIMARY readable surface feature.
- **geoData.ts:** from `world-atlas/land-110m.json` (TopoJSON, object `land`). `buildCoastlines(r)` uses
  `topojson.mesh` → MultiLineString → great-circle-densified `LineSegments` (so long chords hug the globe).
  `buildLandDots(r, latStep)` samples a cosine-weighted lat/lon grid and keeps points where
  `d3-geo geoContains(landFeature, [lon,lat])` is true (~9,800 dots). Verified: London=land, mid-Pacific=ocean.
- **DottedEarth:** the land-fill dots (`#dfeaff`, additive). **WireframeEarth:** dim graticule grid (`#5a6b80`,
  opacity 0.05) so it recedes behind continents. **TopographicEarth:** procedural elevation point cloud, default OFF.
- All four sit inside the GMST-rotated `EarthLayers` group.

### 10.4 Camera (`scene/Camera.tsx`)
- **Intro (first 4s):** keyframed dolly from `[0,0,60]`/fov70 → `[0,0,30]`/fov55 → `[12,4,18]`/fov50, then hands
  off to OrbitControls and sets `introComplete` (which triggers the HUD entrance).
- **OrbitControls:** damping, minDistance 7, maxDistance 120, `enablePan={false}` (both buttons orbit; no view-slide).
  **Idle auto-rotate** after 8 s of no interaction (0.3 speed), cancels on interaction.
- **On-screen nav pad** (`NavControls.tsx`): writes `rotateInput{x,y}` / `zoomInput` to `useSceneStore`; the camera
  loop reads them each frame via `getState()` and nudges azimuth/polar (`setAzimuthalAngle/Polar`, clamped) or dollies.
  Guaranteed control path even if mouse-drag misbehaves. ⚠️ **Drag-rotate fix:** `DebrisField` hover handler must NOT
  call `e.stopPropagation()` — the points cover the screen and stopping every move swallows OrbitControls drag.
- **Fly-to-location:** on `flyTo` change, compute the location's current scene direction (ECEF→scene rotated by
  current GMST), animate camera to `dir × clamp(currentDistance,12,16)` over 1.4 s (easeInOutCubic), looking at
  origin. **Reset:** `resetCameraNonce` animates back to `[12,4,18]`.

### 10.5 HUD (`hud/*`)
- `HUD.tsx` reveals panels only when `introComplete && isLoaded`, with framer-motion staggered slide+fade.
  LoadingScreen + ScanlineOverlay always present.
- Panels positioned: SystemStatus top-left, LocationSearch top-center, Classification top (right of FilterPanel),
  FilterPanel right edge, AltitudeChart bottom-left, TimelineScrubber bottom-center, ObjectInspector right slide-in.
- **Hotkeys:** `S` surface, `W` graticule, `C` land dots, `T` terrain, `Space` play/pause. (Defined in FilterPanel
  + TimelineScrubber keydown handlers.)
- AltitudeChart computes altitude per object from mean motion (`a = (μ/n²)^⅓ − 6371`), bins 200–2000 km, log-scale
  SVG bars, annotation lines (ISS 408, Hubble 540, Starlink 550, SSO 800).
- TimelineScrubber speeds: ×0.1, ×1, ×10, ×100, ×1000, ×10000; ±12 h scrub writes `timeOffset` (NOTE: see §11 —
  scrub wiring is partial).

---

## 11. Design system + known quirks

**Color palette (CSS vars in `styles/globals.css`):** pure black bg `#000`; particle ramp white→`#C8C8C8`→
`#707070`→`#3A3A3A`; Starlink tint `#F0F4FF`; HUD borders `#1A1A1A`/`#0E0E0E`/`#2A2A2A`; text tiers
`#FFFFFF`/`#909090`/`#505050`/`#D0D0D0`; coastline `#cfe8ff`. Fonts: **JetBrains Mono** for ALL numbers/labels,
**Inter** for major titles. Sharp corners, glassmorphic panels `rgba(8,8,8,0.72)` + `backdrop-filter: blur`.

**Quirks / decisions worth remembering:**
- **Chromatic aberration is OFF by default** — at the plan's offset it splits 1–2 px white points into separate
  R/G/B dots (rainbow confetti), violating the monochrome rule. Left as a toggle at a much smaller offset (0.0002).
- **Bloom ON** (intensity 0.7, luminanceThreshold 0.35) — gives the glow; the whole look depends on it.
- `THREE.Clock deprecated` console warning from R3F internals — harmless.
- Components use **default exports** + heavy **inline styles** (set by the first HUD build); keep that convention.

---

## 12. What is verified working (empirically, in-browser)

- Full **18,910 objects** (5,147 active · 3,211 debris · 6 rocket bodies · 10,546 Starlink) render at **60 FPS**,
  **zero page/console errors**.
- Catalog served instantly from cache/fallback even while CelesTrak 403s; partial refresh correctly rejected.
- Hover → live label; click → ObjectInspector opens with live state vector; selection ring + orbit path draw.
- Fly-to (London → Europe, United States → N. America, Tokyo → Japan) all frame the correct, recognizable geography.
- `npm run build` passes; `npx tsc -b` clean.

---

## 13. TODO / what's left (prioritized)

**High value / likely next:**
1. **Web Worker SGP4 propagation** (`comlink` already installed; plan §6.3). Not needed at 18.9k/60fps, but
   required for the full ~27k+ catalog or weaker GPUs. Move the `propagate` loop off the main thread; post back a
   `Float32Array` (consider `SharedArrayBuffer`). Keep `sim.positions` as the handoff buffer.
2. **Serverless `/api/catalog`** for live data on a static production host (§5.5). Port `catalogApi.ts` logic.
3. **Wire remaining UI that's stubbed:**
   - `useDataStore.altMin/altMax` exist but there's no altitude-band slider in FilterPanel yet (plan §7.5).
   - TimelineScrubber: confirm the ±12h scrub `timeOffset` is consumed by DebrisField (currently DebrisField
     advances `sim.timeMs` itself; the scrub `timeOffset` integration should be double-checked/finished).
   - AltitudeChart hover tooltip ("850 km: 3,421 objects") per plan §7.3.

**Polish (plan §7–8):**
4. Object materialize-on-load animation (per-particle delay/scale), number-counter polish, intro tuning.
5. Crosshair leader-line style per plan §7.6 (currently a clean drei label instead).
6. Mobile-responsive HUD (collapse panels < 768px).
7. Decorative HUD elements (scrolling text streams, sub-point lat/lon ticker, corner markers).

**Stretch (plan §11):**
8. Conjunction analysis (SOCRATES feed, pulse close-approach pairs red — would need a non-monochrome accent).
9. Day/night Earth shading (sun position → terminator). 10. Constellation lattice lines for Starlink shells.
11. Decay prediction coloring. 12. Past-vs-present debris growth compare. 13. Ambient audio. 14. VR (`@react-three/xr`).

**Cleanup:**
15. Delete dead Vite scaffold files: `src/App.css`, `src/index.css`, `src/assets/*`, `public/icons.svg`.
16. Remove unused deps if Web Worker path not taken: `swr` (using plain fetch); keep `comlink` for #1.
17. `git init` (repo not initialized) so changes are tracked.

---

## 14. Gotchas to re-read before touching things

- **Don't fetch CelesTrak from the browser.** Everything goes through `/api/catalog`. Don't add per-feed frontend
  fetches back.
- **Don't retry 403/429.** Fail fast; the cache/fallback/cooldown handle it. Retrying re-triggers the IP rate-limit.
- **CelesTrak has no `debris` or `rocket-bodies` group** — only the specific collision/ASAT debris clouds + `analyst`.
- **Earth is in the real ECI/GMST frame** — if you change the debris ECI→scene transform, you must keep the
  `geodeticToSceneECEF` + GMST rotation consistent or continents and ground tracks will desync.
- **Keep it monochrome.** Any saturated color (incl. strong chromatic aberration) breaks the whole aesthetic.
- **R3F v9 + React 19** — buffer attributes use `args={[array, itemSize]}` (not the `attach/array/count/itemSize`
  form); the build's `tsconfig.app` is strict about unused locals and type-only imports.
```
