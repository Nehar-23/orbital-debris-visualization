import { useEffect, useState } from 'react';
import Cornerframe from '../components/Cornerframe';
import ToggleSwitch from '../components/ToggleSwitch';
import MinimizeButton from '../components/MinimizeButton';
import { useSceneStore } from '../../store/useSceneStore';
import { useDataStore } from '../../store/useDataStore';

const PANEL_W = 240;

const panelStyle: React.CSSProperties = {
  width: PANEL_W,
  background: 'rgba(8,8,8,0.72)',
  backdropFilter: 'blur(8px)',
  border: '1px solid #1A1A1A',
  padding: '14px 8px 12px',
  pointerEvents: 'auto',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #1A1A1A',
  margin: '6px 0',
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 8,
  color: '#3A3A3A',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  padding: '0 6px',
  marginBottom: 2,
  marginTop: 4,
};

export default function FilterPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    showSurface, showWireframe, showDots, showTerrain, showAtmosphere,
    showStars, showOrbitTrails, bloomEnabled, chromaticEnabled,
    scanlinesEnabled, toggleLayer,
  } = useSceneStore();

  const {
    filterActive, filterDebris, filterRockets, filterStarlink, toggleFilter,
    objects,
  } = useDataStore();

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toUpperCase()) {
        case 'S':
          toggleLayer('showSurface');
          break;
        case 'W':
          toggleLayer('showWireframe');
          break;
        case 'C':
          toggleLayer('showDots');
          break;
        case 'T':
          toggleLayer('showTerrain');
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleLayer]);

  // Counts per filter class
  const countActive   = objects.filter((o) => o.classification === 1).length;
  const countDebris   = objects.filter((o) => o.classification === 0).length;
  const countRockets  = objects.filter((o) => o.classification === 2).length;
  const countStarlink = objects.filter((o) => o.classification === 3).length;

  return (
    <div style={{ ...panelStyle, width: collapsed ? 'auto' : PANEL_W }}>
      <Cornerframe title="FILTERS">
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
              padding: '0 6px',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>FILTERS</span>
            <MinimizeButton collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>

          {!collapsed && (
          <>
          <div style={dividerStyle} />

          {/* CLASS section */}
          <div style={sectionLabel}>CLASS</div>
          <ToggleSwitch
            active={filterActive}
            onToggle={() => toggleFilter('filterActive')}
            label="ACTIVE SAT."
            count={countActive}
          />
          <ToggleSwitch
            active={filterDebris}
            onToggle={() => toggleFilter('filterDebris')}
            label="DEBRIS"
            count={countDebris}
          />
          <ToggleSwitch
            active={filterRockets}
            onToggle={() => toggleFilter('filterRockets')}
            label="ROCKET BODY"
            count={countRockets}
          />
          <ToggleSwitch
            active={filterStarlink}
            onToggle={() => toggleFilter('filterStarlink')}
            label="STARLINK"
            count={countStarlink}
          />

          <div style={dividerStyle} />

          {/* LAYERS section */}
          <div style={sectionLabel}>LAYERS</div>
          <ToggleSwitch
            active={showSurface}
            onToggle={() => toggleLayer('showSurface')}
            label="SURFACE"
            hotkey="S"
          />
          <ToggleSwitch
            active={showWireframe}
            onToggle={() => toggleLayer('showWireframe')}
            label="GRATICULE"
            hotkey="W"
          />
          <ToggleSwitch
            active={showDots}
            onToggle={() => toggleLayer('showDots')}
            label="LAND DOTS"
            hotkey="C"
          />
          <ToggleSwitch
            active={showTerrain}
            onToggle={() => toggleLayer('showTerrain')}
            label="TERRAIN"
            hotkey="T"
          />
          <ToggleSwitch
            active={showAtmosphere}
            onToggle={() => toggleLayer('showAtmosphere')}
            label="ATMOSPHERE"
          />
          <ToggleSwitch
            active={showStars}
            onToggle={() => toggleLayer('showStars')}
            label="STAR FIELD"
          />
          <ToggleSwitch
            active={showOrbitTrails}
            onToggle={() => toggleLayer('showOrbitTrails')}
            label="ORBIT TRAILS"
          />

          <div style={dividerStyle} />

          {/* EFFECTS section */}
          <div style={sectionLabel}>EFFECTS</div>
          <ToggleSwitch
            active={bloomEnabled}
            onToggle={() => toggleLayer('bloomEnabled')}
            label="BLOOM"
          />
          <ToggleSwitch
            active={chromaticEnabled}
            onToggle={() => toggleLayer('chromaticEnabled')}
            label="CHROMATIC AB."
          />
          <ToggleSwitch
            active={scanlinesEnabled}
            onToggle={() => toggleLayer('scanlinesEnabled')}
            label="SCANLINES"
          />
          </>
          )}
        </div>
      </Cornerframe>
    </div>
  );
}
