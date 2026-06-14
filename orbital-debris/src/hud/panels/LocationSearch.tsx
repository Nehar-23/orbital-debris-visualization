import { useState, useRef, useEffect, useMemo } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import { useDataStore } from '../../store/useDataStore';
import { searchLocations, parseLatLon } from '../../data/locations';

const mono = "'JetBrains Mono', monospace";
const CLASS = ['DEBRIS', 'ACTIVE SAT', 'ROCKET BODY', 'STARLINK'];

// A unified search row: a place to fly to, or a catalog object to focus.
type SearchItem =
  | { type: 'loc'; label: string; kind: string; run: () => void }
  | { type: 'obj'; label: string; kind: string; run: () => void };

export default function LocationSearch() {
  const setFlyTo = useSceneStore((s) => s.setFlyTo);
  const focusObject = useSceneStore((s) => s.focusObject);
  const resetCamera = useSceneStore((s) => s.resetCamera);
  const setSelected = useDataStore((s) => s.setSelected);
  const objects = useDataStore((s) => s.objects);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const items = useMemo<SearchItem[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const list: SearchItem[] = [];

    const latLon = parseLatLon(q);
    if (latLon) {
      list.push({
        type: 'loc',
        label: `Coordinates ${latLon.name}`,
        kind: 'lat/lon',
        run: () => { setFlyTo({ lat: latLon.lat, lon: latLon.lon, label: latLon.name }); },
      });
    }

    for (const loc of searchLocations(q)) {
      list.push({
        type: 'loc',
        label: loc.name,
        kind: loc.kind,
        run: () => { setFlyTo({ lat: loc.lat, lon: loc.lon, label: loc.name }); setQuery(loc.name); },
      });
    }

    // Catalog objects — by name substring or NORAD ID.
    const ql = q.toLowerCase();
    const numeric = /^\d+$/.test(q);
    let found = 0;
    for (let i = 0; i < objects.length && found < 8; i++) {
      const o = objects[i];
      const match = numeric
        ? String(o.noradId).startsWith(q)
        : o.name.toLowerCase().includes(ql);
      if (!match) continue;
      found++;
      const id = o.noradId;
      const label = o.name;
      list.push({
        type: 'obj',
        label: `${label}  ·  ${id}`,
        kind: CLASS[o.classification] ?? 'OBJECT',
        run: () => { setSelected(id); focusObject(id); setQuery(label); },
      });
    }

    return list;
  }, [query, objects, setFlyTo, focusObject, setSelected]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const run = (item: SearchItem) => { item.run(); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[activeIdx]) run(items[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ width: 340, pointerEvents: 'auto', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(8,8,8,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid #1A1A1A',
          padding: '8px 10px',
        }}
      >
        <span style={{ fontFamily: mono, fontSize: 8, color: '#505050', letterSpacing: '0.16em', whiteSpace: 'nowrap' }}>SEARCH</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="place, lat/lon, object name, or NORAD ID"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: '0.03em',
          }}
        />
        <span
          role="button"
          tabIndex={0}
          onClick={resetCamera}
          onKeyDown={(e) => { if (e.key === 'Enter') resetCamera(); }}
          title="Reset view"
          style={{ fontFamily: mono, fontSize: 9, color: '#707070', border: '1px solid #2A2A2A', padding: '2px 5px', cursor: 'pointer', letterSpacing: '0.08em' }}
        >
          RESET
        </span>
      </div>

      {open && items.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 2,
            background: 'rgba(6,6,6,0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid #1A1A1A',
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {items.map((item, i) => (
            <Item
              key={`${item.type}-${item.label}-${i}`}
              label={item.label}
              kind={item.kind}
              dot={item.type === 'obj'}
              active={i === activeIdx}
              onClick={() => run(item)}
              onHover={() => setActiveIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({ label, kind, active, dot, onClick, onHover }: { label: string; kind: string; active: boolean; dot?: boolean; onClick: () => void; onHover?: () => void }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 10px',
        cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
        {dot && <span style={{ width: 4, height: 4, background: '#cfe4ff', flexShrink: 0 }} />}
        <span style={{ fontFamily: mono, fontSize: 11, color: active ? '#FFFFFF' : '#C0C0C0', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </span>
      <span style={{ fontFamily: mono, fontSize: 8, color: '#505050', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: 8 }}>{kind}</span>
    </div>
  );
}
