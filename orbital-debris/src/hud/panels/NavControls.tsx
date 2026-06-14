import { useEffect } from 'react';
import { useSceneStore, type CameraPreset } from '../../store/useSceneStore';

const mono = "'JetBrains Mono', monospace";

const PRESETS: { key: CameraPreset; label: string }[] = [
  { key: 'overview', label: 'GLOBE' },
  { key: 'leo', label: 'LEO' },
  { key: 'starlink', label: 'SL SHELL' },
  { key: 'geo', label: 'GEO' },
];

// On-screen camera pad — a guaranteed way to orbit/zoom even if mouse-drag
// doesn't reach the canvas. Hold a button to move continuously; the Camera
// loop reads rotateInput / zoomInput from the store each frame.
export default function NavControls() {
  const setRotateInput = useSceneStore((s) => s.setRotateInput);
  const setZoomInput = useSceneStore((s) => s.setZoomInput);
  const resetCamera = useSceneStore((s) => s.resetCamera);
  const goToPreset = useSceneStore((s) => s.goToPreset);
  const trackingObjectId = useSceneStore((s) => s.trackingObjectId);
  const stopTracking = useSceneStore((s) => s.stopTracking);

  // Safety: release any held input if the pointer is released anywhere.
  useEffect(() => {
    const release = () => { setRotateInput(0, 0); setZoomInput(0); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [setRotateInput, setZoomInput]);

  const rotate = (x: number, y: number) => () => setRotateInput(x, y);
  const zoom = (z: number) => () => setZoomInput(z);
  const stopRot = () => setRotateInput(0, 0);
  const stopZoom = () => setZoomInput(0);

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'rgba(8,8,8,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid #1A1A1A',
        padding: '10px 12px',
        userSelect: 'none',
      }}
    >
      {trackingObjectId != null && (
        <button
          onClick={stopTracking}
          style={{
            width: '100%', marginBottom: 8, padding: '5px 0',
            fontFamily: mono, fontSize: 8.5, letterSpacing: '0.12em',
            color: '#000', background: '#cfe4ff', border: '1px solid #cfe4ff',
            cursor: 'pointer', textTransform: 'uppercase',
          }}
        >
          ▣ Following · Exit
        </button>
      )}

      {/* View presets */}
      <div style={{ fontFamily: mono, fontSize: 8, color: '#505050', letterSpacing: '0.18em', marginBottom: 6, textAlign: 'center' }}>
        VIEW
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 47px)', gap: 4, marginBottom: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => goToPreset(p.key)}
            title={`Jump to ${p.label}`}
            style={{
              padding: '5px 0',
              fontFamily: mono, fontSize: 8.5, letterSpacing: '0.06em', whiteSpace: 'nowrap',
              color: '#C8C8C8', background: 'rgba(255,255,255,0.02)',
              border: '1px solid #242424', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = '#C8C8C8'; }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: mono, fontSize: 8, color: '#505050', letterSpacing: '0.18em', marginBottom: 8, textAlign: 'center' }}>
        NAVIGATE
      </div>

      {/* D-pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gridTemplateRows: 'repeat(3, 30px)', gap: 4 }}>
        <span />
        <Btn label="↑" hold press={rotate(0, 1)} release={stopRot} title="Tilt up" />
        <span />
        <Btn label="←" hold press={rotate(-1, 0)} release={stopRot} title="Orbit left" />
        <Btn label="⊙" press={resetCamera} title="Reset view" />
        <Btn label="→" hold press={rotate(1, 0)} release={stopRot} title="Orbit right" />
        <span />
        <Btn label="↓" hold press={rotate(0, -1)} release={stopRot} title="Tilt down" />
        <span />
      </div>

      {/* Zoom */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 47px)', gap: 4, marginTop: 4 }}>
        <Btn label="−" hold press={zoom(1)} release={stopZoom} title="Zoom out" />
        <Btn label="+" hold press={zoom(-1)} release={stopZoom} title="Zoom in" />
      </div>
    </div>
  );
}

function Btn({
  label, press, release, hold, title,
}: {
  label: string;
  press: () => void;
  release?: () => void;
  hold?: boolean;
  title: string;
}) {
  return (
    <button
      title={title}
      onPointerDown={(e) => { e.preventDefault(); press(); }}
      onPointerUp={hold ? release : undefined}
      onPointerLeave={hold ? release : undefined}
      onPointerCancel={hold ? release : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid #242424',
        color: '#C8C8C8',
        fontFamily: mono,
        fontSize: 15,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
        e.currentTarget.style.color = '#FFFFFF';
        e.currentTarget.style.borderColor = '#3A3A3A';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.color = '#C8C8C8';
        e.currentTarget.style.borderColor = '#242424';
      }}
    >
      {label}
    </button>
  );
}
