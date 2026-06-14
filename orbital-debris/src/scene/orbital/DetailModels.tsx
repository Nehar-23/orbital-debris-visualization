import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDataStore } from '../../store/useDataStore';
import { sim } from '../shared';
import { buildClassModels, type ClassModel } from './models';

const _v = new THREE.Vector3();
const NEAREST_MAX = 14;          // how many near-camera dots upgrade to models
const NEAREST_DIST = 15;         // only when camera is this close to centre
const RECOMPUTE_MS = 250;        // throttle the nearest-set search

function readPos(index: number, out: THREE.Vector3): boolean {
  if (!sim.positions) return false;
  const x = sim.positions[index * 3];
  const y = sim.positions[index * 3 + 1];
  const z = sim.positions[index * 3 + 2];
  if (x === 0 && y === 0 && z === 0) return false; // filtered / not propagated
  out.set(x, y, z);
  return true;
}

export function DetailModels() {
  const { camera } = useThree();
  const objects = useDataStore((s) => s.objects);
  const idToIndex = useDataStore((s) => s.idToIndex);
  const selectedId = useDataStore((s) => s.selectedId);
  const hoveredId = useDataStore((s) => s.hoveredId);
  const fActive = useDataStore((s) => s.filterActive);
  const fDebris = useDataStore((s) => s.filterDebris);
  const fRockets = useDataStore((s) => s.filterRockets);
  const fStarlink = useDataStore((s) => s.filterStarlink);

  const models = useMemo(() => buildClassModels(), []);
  const [nearest, setNearest] = useState<number[]>([]);
  const lastCompute = useRef(0);

  const visible = (cls: number) =>
    (cls === 0 && fDebris) || (cls === 1 && fActive) || (cls === 2 && fRockets) || (cls === 3 && fStarlink);

  // Throttled search for the closest visible objects to the camera (LOD upgrade).
  useFrame(() => {
    const now = performance.now();
    if (now - lastCompute.current < RECOMPUTE_MS) return;
    lastCompute.current = now;

    if (camera.position.length() > NEAREST_DIST || !sim.positions || objects.length === 0) {
      if (nearest.length) setNearest([]);
      return;
    }

    const pos = sim.positions;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    // top-N nearest by squared distance
    const best: { i: number; d: number }[] = [];
    for (let i = 0; i < objects.length; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (x === 0 && y === 0 && z === 0) continue;
      if (!visible(objects[i].classification)) continue;
      const dx = x - cx, dy = y - cy, dz = z - cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (best.length < NEAREST_MAX) {
        best.push({ i, d });
        if (best.length === NEAREST_MAX) best.sort((a, b) => b.d - a.d);
      } else if (d < best[0].d) {
        best[0] = { i, d };
        best.sort((a, b) => b.d - a.d);
      }
    }
    const ids = best.map((b) => objects[b.i].noradId).sort((a, b) => a - b);
    const same = ids.length === nearest.length && ids.every((v, k) => v === nearest[k]);
    if (!same) setNearest(ids);
  });

  // Build the active set: selected + hovered + nearest, each with a screen scale.
  const targets = useMemo(() => {
    const map = new Map<number, number>(); // id -> baseScale (larger = priority)
    for (const id of nearest) map.set(id, 0.0065);
    if (hoveredId != null) map.set(hoveredId, 0.009);
    if (selectedId != null) map.set(selectedId, 0.011);
    const out: { id: number; index: number; cls: number; scale: number }[] = [];
    for (const [id, scale] of map) {
      const index = idToIndex.get(id);
      if (index === undefined) continue;
      out.push({ id, index, cls: objects[index].classification, scale });
    }
    return out;
  }, [nearest, hoveredId, selectedId, idToIndex, objects]);

  return (
    <>
      {targets.map((t) => (
        <DetailModel key={t.id} index={t.index} seed={t.id} model={models[t.cls]} baseScale={t.scale} />
      ))}
    </>
  );
}

function DetailModel({ index, seed, model, baseScale }: { index: number; seed: number; model: ClassModel; baseScale: number }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const rx = 0.25 + ((seed % 50) / 50) * 0.6;
  const ry = 0.3 + ((seed % 37) / 37) * 0.7;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const has = readPos(index, _v);
    g.visible = has;
    if (!has) return;
    g.position.copy(_v);
    const sc = THREE.MathUtils.clamp(camera.position.distanceTo(_v) * baseScale, 0.03, 0.4);
    g.scale.setScalar(sc);
    g.rotation.x += delta * rx;
    g.rotation.y += delta * ry;
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={model.fill}>
        <meshBasicMaterial color="#0a1320" />
      </mesh>
      <lineSegments geometry={model.edges}>
        <lineBasicMaterial color="#eaf2ff" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
