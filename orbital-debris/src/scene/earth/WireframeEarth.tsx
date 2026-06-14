import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import { EARTH_RADIUS } from '../../utils/constants';

export function WireframeEarth() {
  const showWireframe = useSceneStore((s) => s.showWireframe);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(EARTH_RADIUS, 72, 36);
    return geo;
  }, []);

  if (!showWireframe) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color="#4a3a6b"
        wireframe
        transparent
        opacity={0.06}
        depthWrite={false}
      />
    </mesh>
  );
}
