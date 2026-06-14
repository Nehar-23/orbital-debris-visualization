import { useMemo, useState } from 'react';
import Cornerframe from '../components/Cornerframe';
import ProgressBar from '../components/ProgressBar';
import Readout from '../components/Readout';
import MinimizeButton from '../components/MinimizeButton';
import { useDataStore } from '../../store/useDataStore';

const PANEL_W = 300;

const panelStyle: React.CSSProperties = {
  width: PANEL_W,
  background: 'rgba(8,8,8,0.72)',
  backdropFilter: 'blur(8px)',
  border: '1px solid #1A1A1A',
  padding: '14px 14px 12px',
  pointerEvents: 'auto',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #1A1A1A',
  margin: '6px 0',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: '#505050',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 10,
};

interface ClassEntry {
  key: string;
  label: string;
  cls: 0 | 1 | 2 | 3;
}

const CLASS_ENTRIES: ClassEntry[] = [
  { key: 'active',   label: 'ACTIVE SATELLITES', cls: 1 },
  { key: 'debris',   label: 'DEBRIS FRAGMENTS',  cls: 0 },
  { key: 'rockets',  label: 'ROCKET BODIES',     cls: 2 },
  { key: 'starlink', label: 'STARLINK CONST.',   cls: 3 },
];

export default function Classification() {
  const objects = useDataStore((s) => s.objects);
  const [collapsed, setCollapsed] = useState(false);

  const counts = useMemo(() => {
    const c = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const obj of objects) {
      c[obj.classification]++;
    }
    return c;
  }, [objects]);

  const total = counts[0] + counts[1] + counts[2] + counts[3];

  return (
    <div style={{ ...panelStyle, width: collapsed ? 'auto' : PANEL_W }}>
      <Cornerframe title="OBJECT CLASSIFICATION">
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
            <span style={{ whiteSpace: 'nowrap' }}>OBJECT CLASSIFICATION</span>
            <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>

          {!collapsed && (
          <>
          <div style={dividerStyle} />

          {CLASS_ENTRIES.map((entry) => {
            const count = counts[entry.cls];
            const ratio = total > 0 ? count / total : 0;

            return (
              <div key={entry.key} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span style={sectionTitleStyle}>{entry.label}</span>
                  <Readout
                    value={count}
                    duration={1200}
                    style={{ fontSize: 13, color: '#D0D0D0' }}
                  />
                </div>
                <ProgressBar value={ratio} />
              </div>
            );
          })}

          <div style={dividerStyle} />

          {/* Total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#909090',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              TOTAL TRACKED
            </span>
            <Readout value={total} duration={1400} style={{ fontSize: 18, color: '#FFFFFF' }} />
          </div>
          </>
          )}
        </div>
      </Cornerframe>
    </div>
  );
}
