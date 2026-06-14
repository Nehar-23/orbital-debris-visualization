import { create } from 'zustand';

export interface FlyToTarget {
  lat: number;
  lon: number;
  label: string;
}

export type CameraTargetMode = 'earth' | 'object' | 'location';
export type CameraPreset = 'overview' | 'leo' | 'geo' | 'starlink';

interface SceneState {
  timeMultiplier: number;
  timeOffset: number;
  isPlaying: boolean;
  showSurface: boolean;
  showWireframe: boolean;
  showDots: boolean;
  showTerrain: boolean;
  showAtmosphere: boolean;
  showStars: boolean;
  showOrbitTrails: boolean;
  bloomEnabled: boolean;
  chromaticEnabled: boolean;
  scanlinesEnabled: boolean;
  introComplete: boolean;
  flyTo: FlyToTarget | null;
  resetCameraNonce: number;

  // Camera focus / tracking
  cameraTargetMode: CameraTargetMode;
  focusObjectId: number | null;   // object the camera last flew to
  trackingObjectId: number | null; // object the camera is following each frame
  focusNonce: number;             // bump to (re)trigger a fly-to-object
  preset: CameraPreset | null;
  presetNonce: number;            // bump to (re)trigger a preset move

  // Continuous camera nudge from the on-screen nav pad. x: azimuth (-1..1),
  // y: polar (-1..1), zoom: dolly (-1 in .. 1 out). Read each frame by Camera.
  rotateInput: { x: number; y: number };
  zoomInput: number;

  setTimeMultiplier: (v: number) => void;
  setTimeOffset: (v: number) => void;
  setIsPlaying: (v: boolean) => void;
  toggleLayer: (key: LayerKey) => void;
  setIntroComplete: () => void;
  setFlyTo: (t: FlyToTarget | null) => void;
  resetCamera: () => void;
  focusObject: (id: number) => void;
  trackObject: (id: number) => void;
  stopTracking: () => void;
  goToPreset: (preset: CameraPreset) => void;
  setRotateInput: (x: number, y: number) => void;
  setZoomInput: (z: number) => void;
}

type LayerKey = 'showSurface' | 'showWireframe' | 'showDots' | 'showTerrain' | 'showAtmosphere' | 'showStars' | 'showOrbitTrails' | 'bloomEnabled' | 'chromaticEnabled' | 'scanlinesEnabled';

export const useSceneStore = create<SceneState>((set) => ({
  timeMultiplier: 1,
  timeOffset: 0,
  isPlaying: true,
  showSurface: true,
  showWireframe: true,
  showDots: true,
  showTerrain: false,
  showAtmosphere: true,
  showStars: true,
  showOrbitTrails: false,
  bloomEnabled: true,
  chromaticEnabled: false, // off by default — splits tiny white points into rainbow confetti
  scanlinesEnabled: true,
  introComplete: false,
  flyTo: null,
  resetCameraNonce: 0,

  cameraTargetMode: 'earth',
  focusObjectId: null,
  trackingObjectId: null,
  focusNonce: 0,
  preset: null,
  presetNonce: 0,

  rotateInput: { x: 0, y: 0 },
  zoomInput: 0,

  setTimeMultiplier: (v) => set({ timeMultiplier: v }),
  setTimeOffset: (v) => set({ timeOffset: v }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  toggleLayer: (key) => set((s) => ({ [key]: !s[key] } as Partial<SceneState>)),
  setIntroComplete: () => set({ introComplete: true }),
  // Flying to a geographic location cancels any object tracking.
  setFlyTo: (flyTo) => set({ flyTo, cameraTargetMode: flyTo ? 'location' : 'earth', trackingObjectId: null }),
  resetCamera: () => set((s) => ({
    resetCameraNonce: s.resetCameraNonce + 1,
    flyTo: null,
    cameraTargetMode: 'earth',
    focusObjectId: null,
    trackingObjectId: null,
  })),
  // Fly to an object once, then let the user orbit it freely (no follow).
  focusObject: (id) => set((s) => ({
    focusObjectId: id,
    focusNonce: s.focusNonce + 1,
    cameraTargetMode: 'object',
    trackingObjectId: null,
    flyTo: null,
  })),
  // Fly to an object and keep following it every frame.
  trackObject: (id) => set((s) => ({
    focusObjectId: id,
    focusNonce: s.focusNonce + 1,
    cameraTargetMode: 'object',
    trackingObjectId: id,
    flyTo: null,
  })),
  stopTracking: () => set({ trackingObjectId: null }),
  goToPreset: (preset) => set((s) => ({
    preset,
    presetNonce: s.presetNonce + 1,
    cameraTargetMode: 'earth',
    flyTo: null,
    focusObjectId: null,
    trackingObjectId: null,
  })),
  setRotateInput: (x, y) => set({ rotateInput: { x, y } }),
  setZoomInput: (z) => set({ zoomInput: z }),
}));
