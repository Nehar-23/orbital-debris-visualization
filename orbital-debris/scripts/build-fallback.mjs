// Generates public/catalog-fallback.json — a static sample catalog so the app
// always renders something, even if CelesTrak is unreachable / rate-limiting.
// Run: node scripts/build-fallback.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const FEEDS = [
  { id: 'active',     group: 'active' },
  { id: 'starlink',   group: 'starlink',           forceClass: 3 },
  { id: 'oneweb',     group: 'oneweb' },
  { id: 'fengyun',    group: 'fengyun-1c-debris',  forceClass: 0 },
  { id: 'cosmos2251', group: 'cosmos-2251-debris', forceClass: 0 },
  { id: 'iridium33',  group: 'iridium-33-debris',  forceClass: 0 },
  { id: 'cosmos1408', group: 'cosmos-1408-debris', forceClass: 0 },
  { id: 'analyst',    group: 'analyst',            forceClass: 0 },
];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const seen = new Set();
const objects = [];
for (const feed of FEEDS) {
  try {
    const res = await fetch(`${CELESTRAK_BASE}?GROUP=${feed.group}&FORMAT=json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trimStart().startsWith('[')) throw new Error('Non-JSON');
    const raw = JSON.parse(text);
    for (const o of raw) {
      if (seen.has(o.NORAD_CAT_ID)) continue;
      seen.add(o.NORAD_CAT_ID);
      o.OBJECT_CLASS = feed.forceClass ?? -1;
      objects.push(o);
    }
    console.log(`${feed.id}: ${raw.length}`);
  } catch (e) {
    console.warn(`${feed.id} skipped — ${e.message}`);
  }
  await delay(400);
}

const out = path.resolve('public/catalog-fallback.json');
await fs.writeFile(out, JSON.stringify({ updated: Date.now(), objects }));
console.log(`\nWrote ${objects.length} objects to ${out}`);
