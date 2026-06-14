import * as satellite from 'satellite.js';
import { classify } from './classification';
import type { OrbitalObject } from '../store/useDataStore';

// The frontend talks to ONE server-cached endpoint (see vite-plugins/catalogApi.ts),
// never CelesTrak directly. Resolution order:
//   1. /api/catalog        — dev/preview server cache (live, refreshed in background)
//   2. /catalog-fallback.json — bundled static sample (works on a plain static deploy)
//   3. localStorage         — best-effort offline copy
const CATALOG_URL = '/api/catalog';
const FALLBACK_URL = '/catalog-fallback.json';
const NET_CACHE_KEY = 'orbital_catalog_v2';

interface RawOMM {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  NORAD_CAT_ID: number;
  OBJECT_CLASS?: number; // server hint: 0-3, or -1 = classify by name
  [k: string]: unknown;
}

interface CatalogResponse {
  updated: number;
  stale: boolean;
  source: string; // 'live' | 'cache' | 'fallback'
  objects: RawOMM[];
}

function rawToObject(raw: RawOMM): OrbitalObject | null {
  try {
    const satrec = satellite.json2satrec(raw as unknown as Parameters<typeof satellite.json2satrec>[0]);
    if (!satrec || satrec.error !== 0) return null;
    if (raw.MEAN_MOTION < 0.01) return null; // decayed / bad element set

    const forceClass = typeof raw.OBJECT_CLASS === 'number' && raw.OBJECT_CLASS >= 0
      ? (raw.OBJECT_CLASS as 0 | 1 | 2 | 3)
      : undefined;

    return {
      noradId: raw.NORAD_CAT_ID,
      name: raw.OBJECT_NAME.trim(),
      objectId: raw.OBJECT_ID,
      classification: classify(raw.OBJECT_NAME, forceClass),
      satrec,
      epoch: new Date(raw.EPOCH),
      inclination: raw.INCLINATION,
      eccentricity: raw.ECCENTRICITY,
      meanMotion: raw.MEAN_MOTION,
    };
  } catch {
    return null;
  }
}

function readNetCache(): CatalogResponse | null {
  try {
    const raw = localStorage.getItem(NET_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CatalogResponse) : null;
  } catch {
    return null;
  }
}

function writeNetCache(resp: CatalogResponse) {
  try {
    localStorage.setItem(NET_CACHE_KEY, JSON.stringify(resp));
  } catch {
    // catalog can exceed the ~5MB localStorage quota — that's fine, the server
    // cache is the real protection; offline cache is just a bonus.
  }
}

// Fetch + normalize either the /api/catalog response ({updated,stale,source,objects})
// or the bundled fallback file ({updated,objects} or a bare array).
async function fetchCatalog(url: string, defaultSource: string): Promise<CatalogResponse | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    const objects: RawOMM[] = Array.isArray(d) ? d : d.objects;
    if (!objects?.length) return null;
    return {
      updated: d.updated ?? 0,
      stale: d.stale ?? true,
      source: d.source ?? defaultSource,
      objects,
    };
  } catch {
    return null;
  }
}

export interface LoadProgress {
  progress: number;
  message: string;
}

export async function loadAllTLEs(
  onProgress: (p: LoadProgress) => void
): Promise<OrbitalObject[]> {
  onProgress({ progress: 0.1, message: 'Contacting catalog service...' });

  // 1. server-cached endpoint  2. bundled static fallback  3. localStorage
  let resp = await fetchCatalog(CATALOG_URL, 'live');
  if (!resp) {
    onProgress({ progress: 0.15, message: 'Loading bundled catalog...' });
    resp = await fetchCatalog(FALLBACK_URL, 'fallback');
  }
  if (resp?.objects?.length) writeNetCache(resp);

  if (!resp || !resp.objects?.length) {
    const cached = readNetCache();
    if (cached?.objects?.length) resp = { ...cached, stale: true, source: 'local-cache' };
  }

  if (!resp || !resp.objects?.length) {
    throw new Error('Catalog service unavailable — no live data and no cache');
  }

  const total = resp.objects.length;
  onProgress({ progress: 0.35, message: `Building ${total.toLocaleString()} satellite records...` });

  const all: OrbitalObject[] = [];
  for (let i = 0; i < total; i++) {
    const obj = rawToObject(resp.objects[i]);
    if (obj) all.push(obj);
    if (i % 3000 === 0) {
      onProgress({ progress: 0.35 + 0.6 * (i / total), message: `Propagating element sets — ${i.toLocaleString()} of ${total.toLocaleString()}` });
    }
  }

  const tag = resp.source === 'fallback' ? ' · offline sample'
    : resp.stale ? ' · cached' : '';
  onProgress({ progress: 1, message: `Catalog ready — ${all.length.toLocaleString()} objects${tag}` });
  return all;
}
