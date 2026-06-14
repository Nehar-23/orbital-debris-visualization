import { motion } from 'framer-motion';
import { useSceneStore } from '../store/useSceneStore';
import { useDataStore } from '../store/useDataStore';
import SystemStatus from './panels/SystemStatus';
import Classification from './panels/Classification';
import FilterPanel from './panels/FilterPanel';
import AltitudeChart from './panels/AltitudeChart';
import TimelineScrubber from './panels/TimelineScrubber';
import LoadingScreen from './panels/LoadingScreen';
import ObjectInspector from './panels/ObjectInspector';
import LocationSearch from './panels/LocationSearch';
import NavControls from './panels/NavControls';
import ScanlineOverlay from './effects/ScanlineOverlay';

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

export function HUD({ onRetry }: { onRetry?: () => void }) {
  const introComplete = useSceneStore((s) => s.introComplete);
  const scanlinesEnabled = useSceneStore((s) => s.scanlinesEnabled);
  const isLoaded = useDataStore((s) => s.isLoaded);

  // Only reveal panels once intro animation finished + data loaded
  const reveal = introComplete && isLoaded;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      <LoadingScreen onRetry={onRetry} />

      {reveal && (
        <>
          {/* Left column: status + classification + altitude, top-anchored so
              the panels push each other down and can never overlap. */}
          <motion.div
            {...enter(0)}
            style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', maxHeight: 'calc(100vh - 32px)' }}
          >
            <SystemStatus />
            <Classification />
            <AltitudeChart />
          </motion.div>

          {/* Right column: filters + navigation, top-anchored for the same reason. */}
          <motion.div
            {...enter(0.16)}
            style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end', maxHeight: 'calc(100vh - 32px)' }}
          >
            <FilterPanel />
            <NavControls />
          </motion.div>

          <motion.div {...enter(0.12)} style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 130 }}>
            <LocationSearch />
          </motion.div>

          <ObjectInspector />

          <motion.div
            {...enter(0.32)}
            style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
          >
            <TimelineScrubber />
          </motion.div>
        </>
      )}

      {scanlinesEnabled && <ScanlineOverlay />}
    </div>
  );
}
