import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import { EARTH_RADIUS } from '../../utils/constants';
import { buildCoastlines } from './geoData';

export function SurfaceEarth() {
  const showSurface = useSceneStore((s) => s.showSurface);

  const coastGeo = useMemo(() => {
    const positions = buildCoastlines(EARTH_RADIUS * 1.004);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  if (!showSurface) return null;

  return (
    <group>
      {/* Opaque planet body — anchors the scene, occludes debris behind it */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 0.999, 96, 64]} />
        <meshStandardMaterial
          color="#0d0820"
          roughness={0.92}
          metalness={0.0}
          emissive="#1a0f3a"
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* Glowing accurate coastlines — the primary readable surface feature */}
      <lineSegments geometry={coastGeo}>
        <lineBasicMaterial
          color="#e6c8ff"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}
