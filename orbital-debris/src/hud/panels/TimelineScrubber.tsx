import { useEffect, useRef, useState } from 'react';
import Cornerframe from '../components/Cornerframe';
import MinimizeButton from '../components/MinimizeButton';
import { useSceneStore } from '../../store/useSceneStore';

const PANEL_W = 580;
const SPEEDS = [0.1, 1, 10, 100, 1000, 10000];
const SCRUB_RANGE_MS = 12 * 60 * 60 * 1000; // ±12h

const panelStyle: React.CSSProperties = {
  width: PANEL_W,
  background: 'rgba(8,8,8,0.72)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid #1A1A1A',
  padding: '14px 18px 14px',
  pointerEvents: 'auto',
};

const mono = "'JetBrains Mono', monospace";

function fmtSpeed(m: number): string {
  if (m < 1) return `×${m}`;
  return `×${m.toLocaleString('en-US')}`;
}

function fmtElapsed(ms: number): string {
  const sign = ms < 0 ? '-' : '+';
  const a = Math.abs(ms);
  const s = Math.floor(a / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `T${sign} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function TransportButton({ children, onClick, active, size = 13 }: { children: React.ReactNode; onClick: () => void; active?: boolean; size?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: mono,
        fontSize: size,
        color: active ? '#FFFFFF' : hover ? '#D0D0D0' : '#707070',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '0 5px',
        lineHeight: 1,
        transition: 'color 0.12s ease',
        outline: 'none',
      }}
    >
      {children}
    </span>
  );
}

export default function TimelineScrubber() {
  const timeMultiplier = useSceneStore((s) => s.timeMultiplier);
  const isPlaying = useSceneStore((s) => s.isPlaying);
  const timeOffset = useSceneStore((s) => s.timeOffset);
  const setTimeMultiplier = useSceneStore((s) => s.setTimeMultiplier);
  const setIsPlaying = useSceneStore((s) => s.setIsPlaying);
  const setTimeOffset = useSceneStore((s) => s.setTimeOffset);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  // Accumulate sim-elapsed time for the readout
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    function loop(now: number) {
      const dt = now - last;
      last = now;
      if (isPlaying) {
        setElapsed((e) => e + dt * timeMultiplier);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, timeMultiplier]);

  // Spacebar = play/pause
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, setIsPlaying]);

  const stepSpeed = (dir: 1 | -1) => {
    const idx = SPEEDS.indexOf(timeMultiplier);
    if (idx === -1) { setTimeMultiplier(1); return; }
    const next = Math.min(SPEEDS.length - 1, Math.max(0, idx + dir));
    setTimeMultiplier(SPEEDS[next]);
  };

  const scrubPct = ((timeOffset + SCRUB_RANGE_MS) / (2 * SCRUB_RANGE_MS)) * 100;

  const handleScrub = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setTimeOffset(t * 2 * SCRUB_RANGE_MS - SCRUB_RANGE_MS);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (draggingRef.current) handleScrub(e.clientX); };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return (
    <div style={{ ...panelStyle, width: collapsed ? 'auto' : PANEL_W }}>
      <Cornerframe title="TIME CONTROL">
        <div style={{ paddingTop: 4 }}>
          {/* Header with minimize */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: collapsed ? 0 : 10,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                color: '#FFFFFF',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              TIME CONTROL{collapsed && <span style={{ color: '#707070', marginLeft: 10 }}>{fmtElapsed(elapsed)} {fmtSpeed(timeMultiplier)}</span>}
            </span>
            <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>

          {!collapsed && (
          <>
          {/* Transport row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TransportButton onClick={() => stepSpeed(-1)}>◀◀</TransportButton>
              <TransportButton onClick={() => setTimeMultiplier(Math.max(0.1, timeMultiplier / 2))}>◀</TransportButton>
              <TransportButton onClick={() => setIsPlaying(!isPlaying)} active size={15}>{isPlaying ? '⏸' : '▶'}</TransportButton>
              <TransportButton onClick={() => setTimeMultiplier(Math.min(10000, timeMultiplier * 2))}>▶</TransportButton>
              <TransportButton onClick={() => stepSpeed(1)}>▶▶</TransportButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 15, color: '#FFFFFF', letterSpacing: '0.05em' }}>
                {fmtElapsed(elapsed)}
              </span>
              <span style={{ fontFamily: mono, fontSize: 11, color: '#707070' }}>{fmtSpeed(timeMultiplier)}</span>
            </div>
          </div>

          {/* Scrub track */}
          <div
            ref={trackRef}
            onMouseDown={(e) => { draggingRef.current = true; handleScrub(e.clientX); }}
            style={{ position: 'relative', height: 14, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: '#1A1A1A' }} />
            {/* NOW center tick */}
            <div style={{ position: 'absolute', left: '50%', top: 2, bottom: 2, width: 1, background: '#2A2A2A' }} />
            {/* Handle */}
            <div
              style={{
                position: 'absolute',
                left: `${scrubPct}%`,
                width: 7, height: 7,
                borderRadius: '50%',
                background: '#FFFFFF',
                transform: 'translate(-50%, 0)',
                boxShadow: '0 0 6px rgba(255,255,255,0.6)',
              }}
            />
          </div>

          {/* Axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#505050' }}>T−12h</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#909090' }}>NOW</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#505050' }}>T+12h</span>
          </div>

          {/* Speed presets */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center' }}>
            {SPEEDS.map((sp) => {
              const isActive = timeMultiplier === sp;
              return (
                <span
                  key={sp}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTimeMultiplier(sp)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setTimeMultiplier(sp); }}
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    color: isActive ? '#000000' : '#707070',
                    background: isActive ? '#D0D0D0' : 'transparent',
                    border: `1px solid ${isActive ? '#D0D0D0' : '#2A2A2A'}`,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    letterSpacing: '0.04em',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {fmtSpeed(sp)}
                </span>
              );
            })}
          </div>
          </>
          )}
        </div>
      </Cornerframe>
    </div>
  );
}
