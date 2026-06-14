import { useRef, useMemo, useCallback } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { SCALE } from '../../utils/constants';
import { sim } from '../shared';

import debrisVert from '../../shaders/debris.vert.glsl?raw';
import debrisFrag from '../../shaders/debris.frag.glsl?raw';

export function DebrisField() {
  const objects = useDataStore((s) => s.objects);
  const filterActive = useDataStore((s) => s.filterActive);
  const filterDebris = useDataStore((s) => s.filterDebris);
  const filterRockets = useDataStore((s) => s.filterRockets);
  const filterStarlink = useDataStore((s) => s.filterStarlink);
  const setHovered = useDataStore((s) => s.setHovered);
  const setSelected = useDataStore((s) => s.setSelected);
  const focusObject = useSceneStore((s) => s.focusObject);
  const timeMultiplier = useSceneStore((s) => s.timeMultiplier);
  const isPlaying = useSceneStore((s) => s.isPlaying);

  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lastPropagateRef = useRef(0);
  // Cross-platform double-click/tap detection (mouse dblclick is unreliable on touch).
  const lastTap = useRef<{ id: number; t: number }>({ id: -1, t: 0 });

  const { geometry, positions } = useMemo(() => {
    if (objects.length === 0) return { geometry: null, positions: null };

    const count = objects.length;
    const pos = new Float32Array(count * 3);
    const cls = new Float32Array(count);
    const sz = new Float32Array(count);

    objects.forEach((obj, i) => {
      cls[i] = obj.classification;
      sz[i] = obj.classification === 1 ? 2.2 : obj.classification === 3 ? 1.8 : obj.classification === 2 ? 1.6 : 1.0;
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('classification', new THREE.BufferAttribute(cls, 1));
    geo.setAttribute('pointSize', new THREE.BufferAttribute(sz, 1));

    sim.positions = pos;
    sim.count = count;

    return { geometry: geo, positions: pos };
  }, [objects]);

  useFrame(({ clock }) => {
    if (!geometry || !positions || !matRef.current) return;

    const now = performance.now();
    const dt = now - lastPropagateRef.current;
    if (dt < 100) return; // propagate at 10Hz
    lastPropagateRef.current = now;

    matRef.current.uniforms.uTime.value = clock.getElapsedTime();

    if (isPlaying) {
      sim.timeMs += dt * timeMultiplier;
    }
    const simDate = new Date(sim.timeMs);

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const cls = obj.classification;
      const show =
        (cls === 0 && filterDebris) ||
        (cls === 1 && filterActive) ||
        (cls === 2 && filterRockets) ||
        (cls === 3 && filterStarlink);

      if (!show) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        continue;
      }

      try {
        const pv = satellite.propagate(obj.satrec as satellite.SatRec, simDate);
        if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
        const { x, y, z } = pv.position as { x: number; y: number; z: number };
        if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

        positions[i * 3]     = x * SCALE;
        positions[i * 3 + 1] = z * SCALE;
        positions[i * 3 + 2] = -y * SCALE;
      } catch {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  });

  // NB: no e.stopPropagation() here — the points cover the whole screen, and
  // stopping propagation on every move can swallow OrbitControls drag-to-rotate.
  const handleMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.index === undefined) return;
    const obj = objects[e.index];
    if (obj) setHovered(obj.noradId);
  }, [objects, setHovered]);

  const handleOut = useCallback(() => {
    setHovered(null);
  }, [setHovered]);

  // Single click selects (opens the inspector); a second click on the same
  // object within 350ms zooms the camera to it (works for mouse + touch).
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (e.index === undefined) return;
    e.stopPropagation();
    const obj = objects[e.index];
    if (!obj) return;
    const now = performance.now();
    const isDouble = lastTap.current.id === obj.noradId && now - lastTap.current.t < 350;
    setSelected(obj.noradId);
    if (isDouble) {
      focusObject(obj.noradId);
      lastTap.current = { id: -1, t: 0 };
    } else {
      lastTap.current = { id: obj.noradId, t: now };
    }
  }, [objects, setSelected, focusObject]);

  if (!geometry) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      frustumCulled={false}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={debrisVert}
        fragmentShader={debrisFrag}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
