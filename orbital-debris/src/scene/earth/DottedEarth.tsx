import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import { EARTH_RADIUS } from '../../utils/constants';
import { buildLandDots } from './geoData';

export function DottedEarth() {
  const showDots = useSceneStore((s) => s.showDots);

  const positions = useMemo(() => buildLandDots(EARTH_RADIUS * 1.006, 0.95), []);

  if (!showDots) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c9a8ff"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
