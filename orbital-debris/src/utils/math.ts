import * as THREE from 'three';
import { SCALE } from './constants';

// ECI (X right, Y up-ish, Z toward vernal equinox) → Three.js (X right, Y up, Z toward viewer)
export function eciToScene(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x * SCALE, z * SCALE, -y * SCALE);
}

export function eciToSceneArray(x: number, y: number, z: number, out: Float32Array, offset: number) {
  out[offset]     = x * SCALE;
  out[offset + 1] = z * SCALE;
  out[offset + 2] = -y * SCALE;
}

// Earth-FIXED (ECEF) lat/lon -> scene-local coords (before the GMST group rotation).
// At GMST=0, ECEF == ECI, and ECI->scene is (x, z, -y). So:
//   sx =  R cosLat cosLon
//   sy =  R sinLat
//   sz = -R cosLat sinLon
// Rendered inside a group rotated by group.rotation.y = GMST to land in the ECI frame,
// keeping continents aligned with the (real-ECI) debris positions.
export function geodeticToSceneECEF(latDeg: number, lonDeg: number, radiusUnits: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(
    radiusUnits * Math.cos(lat) * Math.cos(lon),
    radiusUnits * Math.sin(lat),
    -radiusUnits * Math.cos(lat) * Math.sin(lon)
  );
}

export function geodeticToSceneECEFArray(
  latDeg: number,
  lonDeg: number,
  radiusUnits: number,
  out: number[]
) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cl = Math.cos(lat);
  out.push(radiusUnits * cl * Math.cos(lon), radiusUnits * Math.sin(lat), -radiusUnits * cl * Math.sin(lon));
}

export function altitudeKm(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z) / SCALE - 6371;
}

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}
