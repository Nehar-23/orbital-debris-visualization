import { useSceneStore } from '../../store/useSceneStore';

export default function ScanlineOverlay() {
  const scanlinesEnabled = useSceneStore((s) => s.scanlinesEnabled);

  return (
    <>
      {/* Vignette — always on */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)',
          zIndex: 9998,
        }}
        aria-hidden="true"
      />

      {/* Scanlines — toggled by store */}
      {scanlinesEnabled && (
        <div
          className="scanlines"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
