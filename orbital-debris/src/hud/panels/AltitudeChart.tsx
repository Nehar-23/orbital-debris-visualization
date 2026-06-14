import { useMemo, useState, useEffect, useRef } from 'react';
import Cornerframe from '../components/Cornerframe';
import MinimizeButton from '../components/MinimizeButton';
import { useDataStore } from '../../store/useDataStore';

const PANEL_W = 340;
const SVG_W = 312;
const SVG_H = 70;
const MARGIN = { top: 4, right: 8, bottom: 17, left: 28 };

const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

const ALT_MIN = 200;
const ALT_MAX = 2000;
const BIN_SIZE = 50;
const NUM_BINS = (ALT_MAX - ALT_MIN) / BIN_SIZE; // 36 bins

const GM = 3.986e14; // m³/s²
const EARTH_RADIUS_KM = 6371;

// Convert meanMotion (rev/day) → altitude km
function meanMotionToAltKm(mm: number): number {
  if (mm <= 0) return -1;
  const n = (mm * 2 * Math.PI) / 86400;
  const a_m = Math.pow(GM / (n * n), 1 / 3);
  return a_m / 1000 - EARTH_RADIUS_KM;
}

interface Annotation {
  km: number;
  label: string;
}

const ANNOTATIONS: Annotation[] = [
  { km: 408, label: 'ISS' },
  { km: 540, label: 'HST' },
  { km: 550, label: 'SL' },
  { km: 800, label: 'SSO' },
];

function altToX(alt: number): number {
  return ((alt - ALT_MIN) / (ALT_MAX - ALT_MIN)) * PLOT_W;
}

export default function AltitudeChart() {
  const objects = useDataStore((s) => s.objects);
  const filterActive = useDataStore((s) => s.filterActive);
  const filterDebris = useDataStore((s) => s.filterDebris);
  const filterRockets = useDataStore((s) => s.filterRockets);
  const filterStarlink = useDataStore((s) => s.filterStarlink);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Per-class histogram, computed once. Filtered view = sum of enabled classes,
  // so the chart reacts live as the user toggles classification filters.
  const binsByClass = useMemo(() => {
    const b = [0, 1, 2, 3].map(() => new Array<number>(NUM_BINS).fill(0));
    for (const obj of objects) {
      const alt = meanMotionToAltKm(obj.meanMotion);
      if (alt >= ALT_MIN && alt < ALT_MAX) {
        const idx = Math.floor((alt - ALT_MIN) / BIN_SIZE);
        if (idx >= 0 && idx < NUM_BINS) b[obj.classification][idx]++;
      }
    }
    return b;
  }, [objects]);

  // class index: 0 debris, 1 active, 2 rocket, 3 starlink
  const enabled = [filterDebris, filterActive, filterRockets, filterStarlink];
  const bins = useMemo(() => {
    const out = new Array<number>(NUM_BINS).fill(0);
    for (let c = 0; c < 4; c++) {
      if (!enabled[c]) continue;
      for (let i = 0; i < NUM_BINS; i++) out[i] += binsByClass[c][i];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binsByClass, filterActive, filterDebris, filterRockets, filterStarlink]);

  // Stable Y-scale based on the unfiltered max, so toggling filters visibly
  // shrinks bars instead of rescaling the whole axis.
  const logMax = useMemo(() => {
    let m = 1;
    for (let i = 0; i < NUM_BINS; i++) {
      let s = 0;
      for (let c = 0; c < 4; c++) s += binsByClass[c][i];
      if (s > m) m = s;
    }
    return Math.log1p(m);
  }, [binsByClass]);

  // Animated displayed values — ease toward target bins each frame (grow-in on
  // mount from 0, smooth morph when filters change).
  const dispRef = useRef<number[]>(new Array(NUM_BINS).fill(0));
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const disp = dispRef.current;
      let moving = false;
      for (let i = 0; i < NUM_BINS; i++) {
        const d = bins[i] - disp[i];
        if (Math.abs(d) > 0.5) { disp[i] += d * 0.16; moving = true; }
        else disp[i] = bins[i];
      }
      setTick((t) => (t + 1) & 0xffff);
      if (moving) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bins]);

  function barHeight(count: number): number {
    if (count <= 0) return 0;
    return (Math.log1p(count) / logMax) * PLOT_H;
  }

  const BAR_W = PLOT_W / NUM_BINS - 1;
  const disp = dispRef.current;

  const xTicks: number[] = [];
  for (let alt = ALT_MIN; alt <= ALT_MAX; alt += 400) xTicks.push(alt);

  const visibleTotal = bins.reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        width: collapsed ? 'auto' : PANEL_W,
        background: 'rgba(8,8,8,0.72)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #1A1A1A',
        padding: '9px 12px 7px',
        pointerEvents: 'auto',
      }}
    >
      <Cornerframe title="ALTITUDE DISTRIBUTION (LEO)">
        <div style={{ paddingTop: 3 }}>
          {/* Panel title */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Inter', sans-serif",
              fontSize: 10.5,
              fontWeight: 500,
              color: '#FFFFFF',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: collapsed ? 0 : 5,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              ALTITUDE DISTRIBUTION{' '}
              <span style={{ color: '#6a5a8a', fontSize: 9 }}>{visibleTotal.toLocaleString('en-US')} IN LEO</span>
            </span>
            <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>

          {!collapsed && (
          <svg width={SVG_W} height={SVG_H} style={{ overflow: 'visible', display: 'block' }}>
            <defs>
              <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#a878ff" floodOpacity="0.75" />
              </filter>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0e6ff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#9a7ad0" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Annotation dashed lines */}
              {ANNOTATIONS.map((ann) => {
                const x = altToX(ann.km);
                if (x < 0 || x > PLOT_W) return null;
                return (
                  <g key={ann.label}>
                    <line x1={x} y1={0} x2={x} y2={PLOT_H} stroke="rgba(168,120,255,0.16)" strokeWidth={1} strokeDasharray="2 3" />
                    <text x={x + 2} y={4} fill="#6a5a8a" fontSize={7} fontFamily="'JetBrains Mono', monospace">{ann.label}</text>
                  </g>
                );
              })}

              {/* Histogram bars (animated) */}
              <g filter="url(#barGlow)">
                {bins.map((_, i) => {
                  const h = barHeight(disp[i] ?? 0);
                  const y = PLOT_H - h;
                  const x = (i / NUM_BINS) * PLOT_W;
                  const isHovered = hoveredBin === i;
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width={Math.max(BAR_W, 2)}
                      height={h}
                      fill={isHovered ? '#FFFFFF' : 'url(#barGrad)'}
                      onMouseEnter={() => setHoveredBin(i)}
                      onMouseLeave={() => setHoveredBin(null)}
                      style={{ cursor: 'crosshair' }}
                    />
                  );
                })}
              </g>

              {/* Tooltip (uses target counts, not the animating value) */}
              {hoveredBin !== null && bins[hoveredBin] > 0 && (() => {
                const i = hoveredBin;
                const x = (i / NUM_BINS) * PLOT_W;
                const h = barHeight(disp[i] ?? 0);
                const y = PLOT_H - h;
                const altCenter = ALT_MIN + i * BIN_SIZE + BIN_SIZE / 2;
                return (
                  <g>
                    <rect x={Math.min(x - 2, PLOT_W - 122)} y={Math.max(0, y - 20)} width={120} height={16} fill="rgba(8,8,8,0.92)" stroke="#3a2a5a" strokeWidth={1} />
                    <text x={Math.min(x + 1, PLOT_W - 119)} y={Math.max(11, y - 8)} fill="#D0C8E8" fontSize={8} fontFamily="'JetBrains Mono', monospace">
                      {`${altCenter.toFixed(0)} km: ${bins[i].toLocaleString('en-US')}`}
                    </text>
                  </g>
                );
              })()}

              {/* X-axis baseline */}
              <line x1={0} y1={PLOT_H} x2={PLOT_W} y2={PLOT_H} stroke="#1A1A1A" strokeWidth={1} />

              {/* X-axis ticks/labels every 400 km */}
              {xTicks.map((alt) => {
                const x = altToX(alt);
                return (
                  <g key={alt}>
                    <line x1={x} y1={PLOT_H} x2={x} y2={PLOT_H + 3} stroke="#2A2A2A" strokeWidth={1} />
                    <text x={x} y={PLOT_H + 11} textAnchor="middle" fill="#505050" fontSize={7} fontFamily="'JetBrains Mono', monospace">{alt}</text>
                  </g>
                );
              })}

              <text x={PLOT_W / 2} y={PLOT_H + 19} textAnchor="middle" fill="#3A3A3A" fontSize={7} fontFamily="'JetBrains Mono', monospace">ALTITUDE (KM)</text>
              <text x={-MARGIN.left + 2} y={PLOT_H / 2} textAnchor="middle" fill="#3A3A3A" fontSize={7} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90, ${-MARGIN.left + 8}, ${PLOT_H / 2})`}>COUNT</text>
            </g>
          </svg>
          )}
        </div>
      </Cornerframe>
    </div>
  );
}
