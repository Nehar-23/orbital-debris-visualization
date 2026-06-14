import * as THREE from 'three';

// Procedural, asset-free craft built from primitives. Each class returns a
// merged fill geometry + its edge wireframe (the bright white outline that
// carries the monochrome HUD look and blooms nicely).

export interface ClassModel {
  fill: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
}

// Merge a set of (already transformed) part geometries into one non-indexed
// BufferGeometry — avoids any BufferGeometryUtils import differences.
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geos = parts.map((g) => g.toNonIndexed());
  let len = 0;
  for (const g of geos) len += (g.getAttribute('position').array as ArrayLike<number>).length;
  const pos = new Float32Array(len);
  let o = 0;
  for (const g of geos) {
    const a = g.getAttribute('position').array as ArrayLike<number>;
    pos.set(a as Float32Array, o);
    o += a.length;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.computeVertexNormals();
  return merged;
}

function makeModel(parts: THREE.BufferGeometry[]): ClassModel {
  const fill = merge(parts);
  const edges = new THREE.EdgesGeometry(fill, 18);
  return { fill, edges };
}

// 1 — Active satellite: body + two solar wings + antenna mast.
function satellite(): ClassModel {
  const body = new THREE.BoxGeometry(0.5, 0.5, 0.8);
  const wingL = new THREE.BoxGeometry(1.3, 0.03, 0.62).translate(-0.98, 0, 0);
  const wingR = new THREE.BoxGeometry(1.3, 0.03, 0.62).translate(0.98, 0, 0);
  const mast = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6).translate(0, 0.5, 0);
  return makeModel([body, wingL, wingR, mast]);
}

// 3 — Starlink: flat-pack panel + thin bus.
function starlink(): ClassModel {
  const panel = new THREE.BoxGeometry(1.9, 0.04, 0.6);
  const bus = new THREE.BoxGeometry(0.4, 0.16, 0.5).translate(0, 0.1, 0);
  return makeModel([panel, bus]);
}

// 2 — Spent rocket body: cylinder + flared nozzle.
function rocket(): ClassModel {
  const body = new THREE.CylinderGeometry(0.28, 0.28, 1.1, 12);
  const nozzle = new THREE.CylinderGeometry(0.3, 0.14, 0.28, 12).translate(0, -0.69, 0);
  return makeModel([body, nozzle]);
}

// 0 — Debris: an irregular tumbling rock (jittered icosahedron).
function debris(): ClassModel {
  const geo = new THREE.IcosahedronGeometry(0.45, 0);
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  // Deterministic per-vertex jitter so the rock looks chipped, not spherical.
  for (let i = 0; i < p.count; i++) {
    const n = Math.sin(i * 12.9898) * 43758.5453;
    const f = 0.72 + (n - Math.floor(n)) * 0.5;
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return makeModel([geo]);
}

// classification index → model: 0 debris, 1 active, 2 rocket, 3 starlink
export function buildClassModels(): ClassModel[] {
  return [debris(), satellite(), rocket(), starlink()];
}
