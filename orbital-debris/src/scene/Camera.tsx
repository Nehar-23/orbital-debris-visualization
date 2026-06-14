import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useSceneStore, type CameraPreset } from '../store/useSceneStore';
import { useDataStore } from '../store/useDataStore';
import { geodeticToSceneECEF } from '../utils/math';
import { sim } from './shared';
import { CAMERA_INTRO_END, IDLE_TIMEOUT_MS, EARTH_RADIUS } from '../utils/constants';

const INTRO_KEYFRAMES = [
  { time: 0,    pos: new THREE.Vector3(0, 0, 72),  fov: 70 },
  { time: 1500, pos: new THREE.Vector3(0, 0, 38),  fov: 55 },
  { time: 3000, pos: new THREE.Vector3(15, 5, 23), fov: 50 },
];

const DEFAULT_POS = new THREE.Vector3(15, 5, 23);
const FLY_DURATION = 1400;
const FOCUS_DIST = 2.2;            // camera distance from a focused object (scene units)
const MIN_EARTH_CLEARANCE = EARTH_RADIUS + 0.5; // never let the camera clip into Earth

// Preset camera framings (target is Earth centre for all of these).
const PRESETS: Record<CameraPreset, THREE.Vector3> = {
  overview: new THREE.Vector3(14, 6, 22),  // dist ~27 — whole catalog
  leo:      new THREE.Vector3(6, 3, 8),    // dist ~10 — low Earth orbit shell
  geo:      new THREE.Vector3(0, 26, 80),  // dist ~84 — geostationary ring
  starlink: new THREE.Vector3(9, 5, 12),   // dist ~16 — Starlink shell
};

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Live scene-space position of an object, read from the shared propagation buffer.
function readObjectPos(id: number | null, out: THREE.Vector3): boolean {
  if (id == null || !sim.positions) return false;
  const idx = useDataStore.getState().idToIndex.get(id);
  if (idx === undefined) return false;
  const x = sim.positions[idx * 3];
  const y = sim.positions[idx * 3 + 1];
  const z = sim.positions[idx * 3 + 2];
  if (x === 0 && y === 0 && z === 0) return false; // filtered / not yet propagated
  out.set(x, y, z);
  return true;
}

export function Camera() {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const introComplete = useSceneStore((s) => s.introComplete);
  const setIntroComplete = useSceneStore((s) => s.setIntroComplete);
  const flyTo = useSceneStore((s) => s.flyTo);
  const resetNonce = useSceneStore((s) => s.resetCameraNonce);
  const focusNonce = useSceneStore((s) => s.focusNonce);
  const presetNonce = useSceneStore((s) => s.presetNonce);

  const startRef = useRef(performance.now());
  const lastInteraction = useRef(performance.now());

  // Generalized fly animation: interpolates BOTH camera position and orbit target.
  const anim = useRef<{
    active: boolean; start: number; duration: number;
    fromPos: THREE.Vector3; toPos: THREE.Vector3;
    fromTarget: THREE.Vector3; toTarget: THREE.Vector3;
    thenTrack: number | null;
  }>({
    active: false, start: 0, duration: FLY_DURATION,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
    thenTrack: null,
  });

  // Follow-mode bookkeeping: remembers the object's last position so we can
  // translate the camera by the same delta and keep the view rigid.
  const track = useRef<{ id: number | null; prev: THREE.Vector3 }>({ id: null, prev: new THREE.Vector3() });

  // Keyboard drive state (arrows = orbit, +/- = zoom). Applied each frame.
  const keys = useRef({ left: false, right: false, up: false, down: false, zin: false, zout: false });

  const startAnim = (toPos: THREE.Vector3, toTarget: THREE.Vector3, thenTrack: number | null, duration = FLY_DURATION) => {
    const c = controlsRef.current;
    anim.current.active = true;
    anim.current.start = performance.now();
    anim.current.duration = duration;
    anim.current.fromPos.copy(camera.position);
    anim.current.toPos.copy(toPos);
    anim.current.fromTarget.copy(c ? c.target : new THREE.Vector3());
    anim.current.toTarget.copy(toTarget);
    anim.current.thenTrack = thenTrack;
    if (c) c.autoRotate = false;
    lastInteraction.current = performance.now();
  };

  useEffect(() => {
    camera.position.set(0, 0, 60);
    (camera as THREE.PerspectiveCamera).fov = 70;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Keyboard listeners
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      switch (e.key) {
        case 'ArrowLeft':  keys.current.left = true; break;
        case 'ArrowRight': keys.current.right = true; break;
        case 'ArrowUp':    keys.current.up = true; break;
        case 'ArrowDown':  keys.current.down = true; break;
        case '+': case '=': keys.current.zin = true; break;
        case '-': case '_': keys.current.zout = true; break;
        case 'r': case 'R': useSceneStore.getState().resetCamera(); break;
        default: return;
      }
      lastInteraction.current = performance.now();
    };
    const onUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':  keys.current.left = false; break;
        case 'ArrowRight': keys.current.right = false; break;
        case 'ArrowUp':    keys.current.up = false; break;
        case 'ArrowDown':  keys.current.down = false; break;
        case '+': case '=': keys.current.zin = false; break;
        case '-': case '_': keys.current.zout = false; break;
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Fly to a geographic location
  useEffect(() => {
    if (!flyTo || !introComplete) return;
    const local = geodeticToSceneECEF(flyTo.lat, flyTo.lon, 1);
    const g = satellite.gstime(new Date(sim.timeMs));
    const cos = Math.cos(g), sin = Math.sin(g);
    const dir = new THREE.Vector3(
      local.x * cos + local.z * sin,
      local.y,
      -local.x * sin + local.z * cos
    ).normalize();
    const dist = THREE.MathUtils.clamp(camera.position.length(), 12, 16);
    startAnim(dir.multiplyScalar(dist), new THREE.Vector3(0, 0, 0), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo, introComplete]);

  // Reset to default Earth view
  useEffect(() => {
    if (resetNonce === 0 || !introComplete) return;
    track.current.id = null;
    startAnim(DEFAULT_POS.clone(), new THREE.Vector3(0, 0, 0), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce, introComplete]);

  // Fly to an object (and optionally follow it afterwards)
  useEffect(() => {
    if (focusNonce === 0 || !introComplete) return;
    const { focusObjectId, trackingObjectId } = useSceneStore.getState();
    const P = new THREE.Vector3();
    if (!readObjectPos(focusObjectId, P)) return; // not visible right now — ignore
    const dir = camera.position.clone().sub(P);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.3, 1);
    dir.normalize();
    const toPos = P.clone().add(dir.multiplyScalar(FOCUS_DIST));
    if (toPos.length() < MIN_EARTH_CLEARANCE) toPos.setLength(MIN_EARTH_CLEARANCE);
    track.current.id = null; // re-seed follow baseline after the flight
    startAnim(toPos, P.clone(), trackingObjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, introComplete]);

  // Jump to a camera preset
  useEffect(() => {
    if (presetNonce === 0 || !introComplete) return;
    const { preset } = useSceneStore.getState();
    if (!preset) return;
    track.current.id = null;
    startAnim(PRESETS[preset].clone(), new THREE.Vector3(0, 0, 0), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetNonce, introComplete]);

  useFrame((_, delta) => {
    const elapsed = performance.now() - startRef.current;
    const c = controlsRef.current;

    // ---- Intro dolly ----
    if (!introComplete) {
      const t = Math.min(elapsed, CAMERA_INTRO_END);
      let fromKf = INTRO_KEYFRAMES[0];
      let toKf = INTRO_KEYFRAMES[1];
      for (let i = 0; i < INTRO_KEYFRAMES.length - 1; i++) {
        if (t >= INTRO_KEYFRAMES[i].time && t <= INTRO_KEYFRAMES[i + 1].time) {
          fromKf = INTRO_KEYFRAMES[i];
          toKf = INTRO_KEYFRAMES[i + 1];
          break;
        }
      }
      const segmentT = Math.min(1, (t - fromKf.time) / Math.max(1, toKf.time - fromKf.time));
      const eased = easeInOut(segmentT);
      camera.position.lerpVectors(fromKf.pos, toKf.pos, eased);
      (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp(fromKf.fov, toKf.fov, eased);
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      if (elapsed >= CAMERA_INTRO_END) {
        setIntroComplete();
        if (c) { c.target.set(0, 0, 0); c.update(); }
      }
      return;
    }

    // Keep orbit limits sensible for the current mode.
    if (c) {
      const mode = useSceneStore.getState().cameraTargetMode;
      c.minDistance = mode === 'object' ? 0.4 : 7;
      c.maxDistance = 120;
    }

    // ---- Fly animation (camera + target) ----
    if (anim.current.active) {
      const a = anim.current;
      const t = Math.min(1, (performance.now() - a.start) / a.duration);
      const eased = easeInOut(t);
      camera.position.lerpVectors(a.fromPos, a.toPos, eased);
      const tgt = new THREE.Vector3().lerpVectors(a.fromTarget, a.toTarget, eased);
      camera.lookAt(tgt);
      if (c) { c.target.copy(tgt); c.update(); }
      if (t >= 1) {
        a.active = false;
        lastInteraction.current = performance.now();
        if (a.thenTrack != null) { track.current.id = null; } // follow loop will seed baseline
      }
      clampEarthClearance(camera);
      return;
    }

    // ---- Follow / tracking ----
    const trackingId = useSceneStore.getState().trackingObjectId;
    if (trackingId != null && c) {
      const P = new THREE.Vector3();
      if (readObjectPos(trackingId, P)) {
        if (track.current.id !== trackingId) {
          track.current.id = trackingId;
          track.current.prev.copy(P);
        }
        const deltaP = P.clone().sub(track.current.prev);
        camera.position.add(deltaP);
        c.target.copy(P);
        track.current.prev.copy(P);
        // user can still orbit/zoom the followed object via pad + keyboard below
      }
    } else {
      track.current.id = null;
    }

    // ---- Manual nav (on-screen pad + keyboard) ----
    if (c) {
      const { rotateInput, zoomInput } = useSceneStore.getState();
      const k = keys.current;
      const rx = rotateInput.x + (k.right ? 1 : 0) + (k.left ? -1 : 0);
      const ry = rotateInput.y + (k.up ? 1 : 0) + (k.down ? -1 : 0);
      const zin = zoomInput + (k.zout ? 1 : 0) + (k.zin ? -1 : 0);
      const dt = Math.min(delta, 0.05); // clamp to avoid jumps after a stall

      if (rx !== 0 || ry !== 0) {
        const speed = 1.4; // rad/s
        c.setAzimuthalAngle(c.getAzimuthalAngle() - rx * speed * dt);
        const pol = c.getPolarAngle() - ry * speed * dt;
        c.setPolarAngle(THREE.MathUtils.clamp(pol, 0.15, Math.PI - 0.15));
        lastInteraction.current = performance.now();
        c.autoRotate = false;
      }
      if (zin !== 0) {
        const offset = camera.position.clone().sub(c.target);
        offset.multiplyScalar(1 + zin * 1.2 * dt);
        const dist = THREE.MathUtils.clamp(offset.length(), c.minDistance, c.maxDistance);
        offset.setLength(dist);
        camera.position.copy(c.target).add(offset);
        lastInteraction.current = performance.now();
        c.autoRotate = false;
      }
      c.update();
    }

    // ---- Idle auto-rotate (only when freely viewing Earth) ----
    const tracking = useSceneStore.getState().trackingObjectId != null;
    const idleTime = performance.now() - lastInteraction.current;
    if (!tracking && idleTime > IDLE_TIMEOUT_MS && c) {
      c.autoRotate = true;
      c.autoRotateSpeed = 0.3;
    }

    clampEarthClearance(camera);
  });

  const handleInteraction = () => {
    lastInteraction.current = performance.now();
    anim.current.active = false;
    // Manual drag exits follow mode and stops any in-flight animation.
    const { trackingObjectId, stopTracking } = useSceneStore.getState();
    if (trackingObjectId != null) stopTracking();
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={introComplete}
      enableDamping
      dampingFactor={0.08}
      minDistance={7}
      maxDistance={120}
      enablePan={false}
      onStart={handleInteraction}
    />
  );
}

function clampEarthClearance(camera: THREE.Camera) {
  const r = camera.position.length();
  if (r < MIN_EARTH_CLEARANCE) camera.position.setLength(MIN_EARTH_CLEARANCE);
}
