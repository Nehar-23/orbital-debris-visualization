import * as topojson from 'topojson-client';
import { geoContains } from 'd3-geo';
import landTopo from 'world-atlas/land-110m.json';
import type { Feature, MultiLineString, MultiPolygon } from 'geojson';
import { geodeticToSceneECEFArray } from '../../utils/math';

// world-atlas land-110m: a TopoJSON topology with a single `land` object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = landTopo as any;
const landObj = topo.objects.land;

const landFeature = topojson.feature(topo, landObj) as unknown as Feature<MultiPolygon>;
const coastline = topojson.mesh(topo, landObj) as MultiLineString;

// Slerp two lat/lon points on the unit sphere, emitting densified scene points so
// long coastline chords hug the globe instead of cutting through it.
function emitGreatCircle(
  latA: number, lonA: number,
  latB: number, lonB: number,
  radius: number,
  out: number[]
) {
  const toRad = Math.PI / 180;
  const ax = Math.cos(latA * toRad) * Math.cos(lonA * toRad);
  const ay = Math.sin(latA * toRad);
  const az = Math.cos(latA * toRad) * Math.sin(lonA * toRad);
  const bx = Math.cos(latB * toRad) * Math.cos(lonB * toRad);
  const by = Math.sin(latB * toRad);
  const bz = Math.cos(latB * toRad) * Math.sin(lonB * toRad);
  const dot = Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz));
  const ang = Math.acos(dot);
  // Number of subdivisions: ~1 per 2 degrees of arc
  const steps = Math.max(1, Math.ceil((ang * 180) / Math.PI / 2));
  let prevLon = lonA, prevLat = latA;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    let lat: number, lon: number;
    if (ang < 1e-6) {
      lat = latB; lon = lonB;
    } else {
      const k1 = Math.sin((1 - t) * ang) / Math.sin(ang);
      const k2 = Math.sin(t * ang) / Math.sin(ang);
      const x = k1 * ax + k2 * bx;
      const y = k1 * ay + k2 * by;
      const z = k1 * az + k2 * bz;
      lat = Math.atan2(y, Math.sqrt(x * x + z * z)) / toRad;
      lon = Math.atan2(z, x) / toRad;
    }
    // LineSegments expects pairs: push prev + current
    geodeticToSceneECEFArray(prevLat, prevLon, radius, out);
    geodeticToSceneECEFArray(lat, lon, radius, out);
    prevLat = lat; prevLon = lon;
  }
}

export function buildCoastlines(radius: number): Float32Array {
  const out: number[] = [];
  for (const line of coastline.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      emitGreatCircle(lat1, lon1, lat2, lon2, radius, out);
    }
  }
  return new Float32Array(out);
}

// Fill landmasses with dots via spherical point-in-polygon. Cosine-weighted
// longitude spacing keeps dot density roughly uniform across latitudes.
export function buildLandDots(radius: number, latStepDeg = 1.1): Float32Array {
  const out: number[] = [];
  for (let lat = -84; lat <= 84; lat += latStepDeg) {
    const lonStep = latStepDeg / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (geoContains(landFeature, [lon, lat])) {
        const jLat = lat + (Math.random() - 0.5) * latStepDeg * 0.5;
        const jLon = lon + (Math.random() - 0.5) * lonStep * 0.5;
        geodeticToSceneECEFArray(jLat, jLon, radius, out);
      }
    }
  }
  return new Float32Array(out);
}
