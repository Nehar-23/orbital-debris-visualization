import { useEffect, useRef, useState } from 'react';
import Cornerframe from '../components/Cornerframe';
import Readout from '../components/Readout';
import MinimizeButton from '../components/MinimizeButton';
import { useDataStore } from '../../store/useDataStore';

const PANEL_W = 280;

const panelStyle: React.CSSProperties = {
  width: PANEL_W,
  background: 'rgba(8,8,8,0.72)',
  backdropFilter: 'blur(8px)',
  border: '1px solid #1A1A1A',
  padding: '14px 14px 12px',
  pointerEvents: 'auto',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: '#909090',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const valueSmStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  color: '#D0D0D0',
  letterSpacing: '0.04em',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #1A1A1A',
  margin: '6px 0',
};

function useUtcClock() {
  const [utc, setUtc] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z');
  useEffect(() => {
    const id = setInterval(() => {
      setUtc(new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z');
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return utc;
}

function useFPS() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    function loop(now: number) {
      frameCount.current++;
      const elapsed = now - lastTime.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      rafId.current = requestAnimationFrame(loop);
    }
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return fps;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
      <span style={labelStyle}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function SystemStatus() {
  const totalCount = useDataStore((s) => s.totalCount);
  const utc = useUtcClock();
  const fps = useFPS();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ ...panelStyle, width: collapsed ? 'auto' : PANEL_W }}>
      <Cornerframe title="SYSTEM STATUS">
        <div style={{ paddingTop: 4 }}>
          {/* Panel title */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: '#FFFFFF',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: collapsed ? 0 : 8,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              ORBITAL TRACKING SYSTEM{' '}
              <span style={{ color: '#505050', fontSize: 9 }}>v2.4</span>
            </span>
            <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>

          {!collapsed && (
          <>
          <div style={dividerStyle} />

          {/* EPOCH row */}
          <Row label="EPOCH">
            <span style={{ ...valueSmStyle, fontSize: 11 }}>{utc}</span>
          </Row>

          {/* CATALOG row */}
          <Row label="CATALOG">
            <Readout value={totalCount} duration={1400} style={{ fontSize: 20, fontWeight: 400 }} />
          </Row>

          {/* PROPAGATOR */}
          <Row label="PROPAGATOR">
            <span style={valueSmStyle}>SGP4 / WGS84</span>
          </Row>

          {/* FRAME */}
          <Row label="FRAME">
            <span style={valueSmStyle}>ECI J2000</span>
          </Row>

          <div style={dividerStyle} />

          {/* FPS */}
          <Row label="RENDER">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: '#D0D0D0',
              }}
            >
              {fps.toString().padStart(3, ' ')} fps
            </span>
          </Row>

          {/* STATUS */}
          <div style={{ marginTop: 2 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#FFFFFF',
                letterSpacing: '0.08em',
              }}
            >
              ▮{' '}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#D0D0D0',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              TRACKING NOMINAL
            </span>
          </div>
          </>
          )}
        </div>
      </Cornerframe>
    </div>
  );
}
