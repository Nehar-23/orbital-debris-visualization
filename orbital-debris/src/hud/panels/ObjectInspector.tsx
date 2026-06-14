import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as satellite from 'satellite.js';
import MinimizeButton from '../components/MinimizeButton';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../scene/shared';
import { fmtKm, fmtDeg, fmtVelocity, fmtEpoch } from '../../utils/format';

const MU = 398600.4418; // km^3/s^2
const mono = "'JetBrains Mono', monospace";
const CLASS = ['DEBRIS FRAGMENT', 'ACTIVE SATELLITE', 'ROCKET BODY', 'STARLINK'];

interface LiveState {
  vx: number; vy: number; vz: number;
  x: number; y: number; z: number;
  speed: number;
  alt: number;
  lat: number; lon: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: '#808080', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 11, color: '#E0E0E0' }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 8, color: '#3A3A3A', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '14px 0 8px' }}>
      {children}
    </div>
  );
}

export default function ObjectInspector() {
  const selectedId = useDataStore((s) => s.selectedId);
  const objects = useDataStore((s) => s.objects);
  const idToIndex = useDataStore((s) => s.idToIndex);
  const setSelected = useDataStore((s) => s.setSelected);
  const showOrbitTrails = useSceneStore((s) => s.showOrbitTrails);
  const toggleLayer = useSceneStore((s) => s.toggleLayer);
  const focusObject = useSceneStore((s) => s.focusObject);
  const trackObject = useSceneStore((s) => s.trackObject);
  const stopTracking = useSceneStore((s) => s.stopTracking);
  const trackingObjectId = useSceneStore((s) => s.trackingObjectId);

  const obj = selectedId != null ? objects[idToIndex.get(selectedId) ?? -1] : null;
  const [live, setLive] = useState<LiveState | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Each new selection opens expanded.
  useEffect(() => { setCollapsed(false); }, [selectedId]);

  useEffect(() => {
    if (!obj) { setLive(null); return; }
    let raf = 0;
    let last = 0;
    const update = (now: number) => {
      if (now - last >= 200) {
        last = now;
        try {
          const date = new Date(sim.timeMs);
          const pv = satellite.propagate(obj.satrec as satellite.SatRec, date);
          if (pv && pv.position && typeof pv.position !== 'boolean' && pv.velocity && typeof pv.velocity !== 'boolean') {
            const p = pv.position as { x: number; y: number; z: number };
            const v = pv.velocity as { x: number; y: number; z: number };
            const gmst = satellite.gstime(date);
            const geo = satellite.eciToGeodetic(pv.position, gmst);
            const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            const alt = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) - 6371;
            setLive({
              vx: v.x, vy: v.y, vz: v.z,
              x: p.x, y: p.y, z: p.z,
              speed, alt,
              lat: satellite.degreesLat(geo.latitude),
              lon: satellite.degreesLong(geo.longitude),
            });
          }
        } catch { /* skip frame */ }
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [obj]);

  // Orbital geometry from mean motion
  const derived = obj ? (() => {
    const n = (obj.meanMotion * 2 * Math.PI) / 86400; // rad/s
    const a = Math.cbrt(MU / (n * n)); // km
    const apogee = a * (1 + obj.eccentricity) - 6371;
    const perigee = a * (1 - obj.eccentricity) - 6371;
    const period = 1440 / obj.meanMotion; // min
    return { apogee, perigee, period, a };
  })() : null;

  return (
    <AnimatePresence>
      {obj && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            top: 16,
            right: 272,
            width: collapsed ? 300 : 360,
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            background: 'rgba(8,8,8,0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid #1A1A1A',
            padding: '16px 18px 18px',
            pointerEvents: 'auto',
            zIndex: 120,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: 8, color: '#505050', letterSpacing: '0.18em' }}>OBJECT DETAIL</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
              <span
                role="button"
                tabIndex={0}
                onClick={() => setSelected(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(null); }}
                title="Close"
                style={{ fontFamily: mono, fontSize: 14, color: '#808080', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
              >
                ×
              </span>
            </span>
          </div>

          <div style={{ borderTop: '1px solid #1A1A1A', margin: collapsed ? '8px 0' : '10px 0' }} />

          <div style={{ fontFamily: mono, fontSize: collapsed ? 14 : 17, color: '#FFFFFF', letterSpacing: '0.02em', marginBottom: 4 }}>
            {obj.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: '#707070', letterSpacing: '0.04em' }}>
            NORAD {obj.noradId} · {obj.objectId} · {CLASS[obj.classification]}
          </div>

          {!collapsed && (
          <>
          <SectionLabel>Orbital Parameters</SectionLabel>
          {derived && (
            <>
              <Row label="APOGEE" value={fmtKm(derived.apogee)} />
              <Row label="PERIGEE" value={fmtKm(derived.perigee)} />
              <Row label="INCLINATION" value={fmtDeg(obj.inclination)} />
              <Row label="ECCENTRICITY" value={obj.eccentricity.toFixed(5)} />
              <Row label="PERIOD" value={`${derived.period.toFixed(1)} min`} />
              <Row label="VELOCITY" value={live ? fmtVelocity(live.speed) : '—'} />
            </>
          )}

          <SectionLabel>State Vector (ECI)</SectionLabel>
          <Row label="X" value={live ? `${live.x >= 0 ? '+' : ''}${live.x.toFixed(1)} km` : '—'} />
          <Row label="Y" value={live ? `${live.y >= 0 ? '+' : ''}${live.y.toFixed(1)} km` : '—'} />
          <Row label="Z" value={live ? `${live.z >= 0 ? '+' : ''}${live.z.toFixed(1)} km` : '—'} />
          <Row label="ALTITUDE" value={live ? fmtKm(live.alt) : '—'} />

          <SectionLabel>Sub-Satellite Point</SectionLabel>
          <Row label="LATITUDE" value={live ? fmtDeg(live.lat) : '—'} />
          <Row label="LONGITUDE" value={live ? fmtDeg(live.lon) : '—'} />

          <SectionLabel>TLE Epoch</SectionLabel>
          <div style={{ fontFamily: mono, fontSize: 10, color: '#A0A0A0' }}>{fmtEpoch(obj.epoch)}</div>
          </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: collapsed ? 12 : 18 }}>
            <button
              onClick={() => focusObject(obj.noradId)}
              style={btnStyle(false)}
            >
              FOCUS
            </button>
            <button
              onClick={() => (trackingObjectId === obj.noradId ? stopTracking() : trackObject(obj.noradId))}
              style={btnStyle(trackingObjectId === obj.noradId)}
            >
              {trackingObjectId === obj.noradId ? 'TRACKING' : 'TRACK'}
            </button>
            <button
              onClick={() => toggleLayer('showOrbitTrails')}
              style={btnStyle(showOrbitTrails)}
            >
              ORBIT
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: '0.12em',
    color: active ? '#000' : '#D0D0D0',
    background: active ? '#D0D0D0' : 'transparent',
    border: `1px solid ${active ? '#D0D0D0' : '#2A2A2A'}`,
    padding: '8px 0',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'all 0.15s ease',
  };
}
