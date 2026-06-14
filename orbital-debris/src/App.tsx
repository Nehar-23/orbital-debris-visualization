import { useEffect, useCallback, useRef } from 'react';
import { Scene } from './scene/Scene';
import { HUD } from './hud/HUD';
import { useDataStore } from './store/useDataStore';
import { loadAllTLEs } from './data/tleService';

export default function App() {
  const setObjects = useDataStore((s) => s.setObjects);
  const setLoadingProgress = useDataStore((s) => s.setLoadingProgress);
  const setLoaded = useDataStore((s) => s.setLoaded);
  const setError = useDataStore((s) => s.setError);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError('');
    try {
      const objects = await loadAllTLEs(({ progress, message }) => {
        setLoadingProgress(progress, message);
      });
      if (objects.length === 0) {
        throw new Error('No objects returned from catalog');
      }
      setObjects(objects);
      setTimeout(() => setLoaded(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      loadingRef.current = false;
    }
  }, [setObjects, setLoadingProgress, setLoaded, setError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000', overflow: 'hidden' }}>
      <Scene />
      <HUD onRetry={load} />
    </div>
  );
}
