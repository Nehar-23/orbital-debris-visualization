import type { Plugin, Connect } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Server-side cached catalog. CelesTrak is fetched ONCE per TTL by the dev/preview
// server (not once per browser reload), with stale-on-failure and a bundled fallback.

interface Feed {
  id: string;
  label: string;
  group: string;
  forceClass?: number; // 0 debris, 1 active, 2 rocket body, 3 starlink; omitted = classify by name
}

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

const FEEDS: Feed[] = [
  { id: 'active',     label: 'Active Satellites',  group: 'active' },
  { id: 'starlink',   label: 'Starlink',           group: 'starlink',           forceClass: 3 },
  { id: 'oneweb',     label: 'OneWeb',             group: 'oneweb' },
  { id: 'fengyun',    label: 'Fengyun-1C Debris',  group: 'fengyun-1c-debris',  forceClass: 0 },
  { id: 'cosmos2251', label: 'Cosmos 2251 Debris', group: 'cosmos-2251-debris', forceClass: 0 },
  { id: 'iridium33',  label: 'Iridium 33 Debris',  group: 'iridium-33-debris',  forceClass: 0 },
  { id: 'cosmos1408', label: 'Cosmos 1408 Debris', group: 'cosmos-1408-debris', forceClass: 0 },
  { id: 'analyst',    label: 'Analyst Objects',    group: 'analyst',            forceClass: 0 },
];

const TTL = 24 * 60 * 60 * 1000; // 24h
const FEED_DELAY = 350;          // ms between feeds — gentle on CelesTrak (concurrency 1)
const CACHE_FILE = path.resolve('.cache/catalog.json');
const FALLBACK_FILE = path.resolve('public/catalog-fallback.json');

interface Catalog { updated: number; objects: Record<string, unknown>[]; source: string; }

let mem: Catalog | null = null;
let refreshing = false;
let lastRefreshAt = 0;
const REFRESH_COOLDOWN = 10 * 60 * 1000; // don't re-hit CelesTrak more than once per 10 min

const size = (c: Catalog | null) => (c ? c.objects.length : 0);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchFeed(feed: Feed): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${CELESTRAK_BASE}?GROUP=${feed.group}&FORMAT=json`);
  // Rate-limit: fail fast, no retry — retrying just hammers CelesTrak.
  if (res.status === 403 || res.status === 429) throw new Error(`RATE_LIMIT ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trimStart().startsWith('[')) throw new Error('Non-JSON response');
  return JSON.parse(text) as Record<string, unknown>[];
}

async function buildCatalog(): Promise<Catalog> {
  const seen = new Set<number>();
  const objects: Record<string, unknown>[] = [];
  for (const feed of FEEDS) {
    try {
      const raw = await fetchFeed(feed);
      for (const o of raw) {
        const id = o.NORAD_CAT_ID as number;
        if (seen.has(id)) continue;
        seen.add(id);
        o.OBJECT_CLASS = feed.forceClass ?? -1;
        objects.push(o);
      }
      console.log(`[catalog] ${feed.id}: ${raw.length}`);
    } catch (e) {
      console.warn(`[catalog] ${feed.id} skipped — ${(e as Error).message}`);
    }
    await delay(FEED_DELAY);
  }
  if (objects.length === 0) throw new Error('all feeds failed');
  return { updated: Date.now(), objects, source: 'live' };
}

async function readDisk(): Promise<Catalog | null> {
  try {
    const d = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    return { updated: d.updated ?? 0, objects: d.objects ?? [], source: 'cache' };
  } catch { return null; }
}
async function writeDisk(c: Catalog) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify({ updated: c.updated, objects: c.objects }));
  } catch { /* ignore */ }
}
async function readFallback(): Promise<Catalog | null> {
  try {
    const d = JSON.parse(await fs.readFile(FALLBACK_FILE, 'utf8'));
    const objects = Array.isArray(d) ? d : d.objects;
    return { updated: d.updated ?? 0, objects, source: 'fallback' };
  } catch { return null; }
}

// Seed memory with the richest of (disk cache, bundled fallback).
async function seedMem() {
  if (mem) return;
  const disk = await readDisk();
  const fb = await readFallback();
  mem = size(disk) >= size(fb) ? (disk ?? fb) : fb;
}

// Background live refresh — only commits if it's at least as complete as what we
// already serve, so a rate-limited PARTIAL fetch never downgrades a richer catalog.
function triggerRefresh() {
  if (refreshing) return;
  if (Date.now() - lastRefreshAt < REFRESH_COOLDOWN) return; // throttle CelesTrak retries
  refreshing = true;
  lastRefreshAt = Date.now();
  buildCatalog()
    .then(async (c) => {
      if (size(c) >= size(mem)) {
        mem = c;
        await writeDisk(c);
        console.log(`[catalog] live refresh committed — ${size(c)} objects`);
      } else {
        console.warn(`[catalog] live refresh partial (${size(c)}) — keeping ${size(mem)} (${mem?.source})`);
      }
    })
    .catch((e) => console.warn(`[catalog] refresh failed — ${(e as Error).message}`))
    .finally(() => { refreshing = false; });
}

interface CatalogResponse { updated: number; stale: boolean; source: string; objects: Record<string, unknown>[]; }

async function getCatalog(): Promise<CatalogResponse | null> {
  await seedMem();

  // Nothing bundled AND nothing cached — last-resort synchronous live fetch.
  if (!mem) {
    try {
      const live = await buildCatalog();
      mem = live;
      await writeDisk(live);
    } catch {
      return null; // truly unavailable
    }
  }

  // Always serve best-known data instantly. Treat the bundled fallback as never
  // "fresh" so we keep pulling toward live in the background until it commits.
  const fresh = mem.source !== 'fallback' && Date.now() - mem.updated < TTL;
  if (!fresh) triggerRefresh();

  return { updated: mem.updated, stale: !fresh, source: mem.source, objects: mem.objects };
}

const handler: Connect.SimpleHandleFunction = (_req, res) => {
  getCatalog()
    .then((data) => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      if (!data) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'catalog unavailable' }));
        return;
      }
      res.end(JSON.stringify(data));
    })
    .catch((e) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(e) }));
    });
};

export function catalogApi(): Plugin {
  return {
    name: 'catalog-api',
    configureServer(server) {
      server.middlewares.use('/api/catalog', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/catalog', handler);
    },
  };
}
