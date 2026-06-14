import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../shared';
import { SCALE } from '../../utils/constants';
import { fmtKm, fmtDeg } from '../../utils/format';
import { altitudeKm } from '../../utils/math';

const _v = new THREE.Vector3();

function readPos(index: number | undefined, out: THREE.Vector3): boolean {
  if (index === undefined || !sim.positions) return false;
  const x = sim.positions[index * 3];
  const y = sim.positions[index * 3 + 1];
  const z = sim.positions[index * 3 + 2];
  if (x === 0 && y === 0 && z === 0) return false; // filtered / not yet propagated
  out.set(x, y, z);
  return true;
}

export function Selection() {
  const { camera } = useThree();
  const objects = useDataStore((s) => s.objects);
  const idToIndex = useDataStore((s) => s.idToIndex);
  const hoveredId = useDataStore((s) => s.hoveredId);
  const selectedId = useDataStore((s) => s.selectedId);
  const showOrbitTrails = useSceneStore((s) => s.showOrbitTrails);

  const selectRing = useRef<THREE.Mesh>(null);
  const hoverRing = useRef<THREE.Mesh>(null);
  const selectGroup = useRef<THREE.Group>(null);
  const hoverGroup = useRef<THREE.Group>(null);
  const labelGroup = useRef<THREE.Group>(null);

  const selectedObj = selectedId != null ? objects[idToIndex.get(selectedId) ?? -1] : null;
  const hoveredObj = hoveredId != null && hoveredId !== selectedId ? objects[idToIndex.get(hoveredId) ?? -1] : null;

  // Orbit path for the selected object — one full period in the inertial frame.
  const orbitGeo = useMemo(() => {
    if (!selectedObj) return null;
    const periodMin = 1440 / Math.max(0.01, selectedObj.meanMotion);
    const steps = 256;
    const pts: number[] = [];
    const base = sim.timeMs;
    for (let s = 0; s <= steps; s++) {
      const t = base + (s / steps) * periodMin * 60000;
      try {
        const pv = satellite.propagate(selectedObj.satrec as satellite.SatRec, new Date(t));
        if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
        const { x, y, z } = pv.position as { x: number; y: number; z: number };
        if (isNaN(x)) continue;
        pts.push(x * SCALE, z * SCALE, -y * SCALE);
      } catch { /* skip */ }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, showOrbitTrails]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Selected ring
    if (selectGroup.current) {
      const has = selectedObj && readPos(idToIndex.get(selectedObj.noradId), _v);
      selectGroup.current.visible = !!has;
      if (has) {
        selectGroup.current.position.copy(_v);
        const dist = camera.position.distanceTo(_v);
        const sc = dist * 0.025;
        selectGroup.current.scale.setScalar(sc);
        selectGroup.current.quaternion.copy(camera.quaternion);
        if (selectRing.current) selectRing.current.rotation.z = t * 0.6;
      }
    }

    // Hover ring
    if (hoverGroup.current) {
      const has = hoveredObj && readPos(idToIndex.get(hoveredObj.noradId), _v);
      hoverGroup.current.visible = !!has;
      if (has) {
        hoverGroup.current.position.copy(_v);
        const dist = camera.position.distanceTo(_v);
        hoverGroup.current.scale.setScalar(dist * 0.018);
        hoverGroup.current.quaternion.copy(camera.quaternion);
        if (hoverRing.current) hoverRing.current.rotation.z = -t * 0.4;
      }
    }

    // Label follows the active (hovered, else selected) object
    if (labelGroup.current) {
      const target = hoveredObj || selectedObj;
      const has = target && readPos(idToIndex.get(target.noradId), _v);
      labelGroup.current.visible = !!has;
      if (has) labelGroup.current.position.copy(_v);
    }
  });

  const labelObj = hoveredObj || selectedObj;

  return (
    <>
      {/* Selected: bright ring + crosshair ticks */}
      <group ref={selectGroup} visible={false}>
        <mesh ref={selectRing}>
          <ringGeometry args={[0.85, 1.0, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* crosshair ticks */}
        {[0, 90, 180, 270].map((deg) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} position={[0, 0, 0]}>
            <planeGeometry args={[0.04, 0.5]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthTest={false} />
          </mesh>
        ))}
      </group>

      {/* Hover: faint ring */}
      <group ref={hoverGroup} visible={false}>
        <mesh ref={hoverRing}>
          <ringGeometry args={[0.8, 0.92, 40]} />
          <meshBasicMaterial color="#cfe4ff" transparent opacity={0.5} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      </group>

      {/* Orbit path */}
      {orbitGeo && selectedObj && showOrbitTrails && (
        <lineLoop geometry={orbitGeo}>
          <lineBasicMaterial color="#7fb4ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineLoop>
      )}

      {/* Live label */}
      <group ref={labelGroup} visible={false}>
        {labelObj && (
          <Html
            center={false}
            distanceFactor={undefined}
            style={{ pointerEvents: 'none', transform: 'translate(14px, -50%)' }}
            zIndexRange={[50, 0]}
          >
            <ObjectTag obj={labelObj} pinned={labelObj === selectedObj && !hoveredObj} />
          </Html>
        )}
      </group>
    </>
  );
}

function ObjectTag({ obj, pinned }: { obj: { name: string; noradId: number; classification: number; inclination: number; satrec: unknown }; pinned: boolean }) {
  // Compute live altitude from shared positions if available
  let altStr = '—';
  const idx = useDataStore.getState().idToIndex.get(obj.noradId);
  if (idx !== undefined && sim.positions) {
    const x = sim.positions[idx * 3], y = sim.positions[idx * 3 + 1], z = sim.positions[idx * 3 + 2];
    if (!(x === 0 && y === 0 && z === 0)) altStr = fmtKm(altitudeKm(x, y, z), 0);
  }
  const CLASS = ['DEBRIS', 'ACTIVE SAT', 'ROCKET BODY', 'STARLINK'][obj.classification] || 'OBJECT';
  const mono = "'JetBrains Mono', monospace";

  return (
    <div style={{ whiteSpace: 'nowrap', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 5, height: 5, background: pinned ? '#fff' : '#cfe4ff', display: 'inline-block' }} />
        <span style={{ fontFamily: mono, fontSize: 12, color: '#fff', letterSpacing: '0.04em', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
          {obj.name}
        </span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 9.5, color: '#9fb4c8', marginTop: 2, marginLeft: 11, letterSpacing: '0.03em', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
        {CLASS} · NORAD {obj.noradId} · {altStr} · {fmtDeg(obj.inclination, 1)} incl
      </div>
    </div>
  );
}
