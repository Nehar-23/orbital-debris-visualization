import { useMemo } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import { EARTH_RADIUS } from '../../utils/constants';

// Procedural heightmap using sine/cosine noise to simulate mountain ranges
function elevation(lat: number, lon: number): number {
  const l = (lat * Math.PI) / 180;
  const o = (lon * Math.PI) / 180;
  // Multi-octave noise approximation
  const e =
    0.5 * Math.sin(3 * l) * Math.cos(2 * o) +
    0.3 * Math.sin(7 * l + 1) * Math.cos(5 * o + 0.5) +
    0.2 * Math.sin(13 * l + 2) * Math.cos(11 * o + 1);
  return Math.max(0, e); // sea level = 0
}

export function TopographicEarth() {
  const showTerrain = useSceneStore((s) => s.showTerrain);

  const { positions, colors } = useMemo(() => {
    const pts: number[] = [];
    const cols: number[] = [];
    const COUNT = 40000;

    for (let i = 0; i < COUNT; i++) {
      const lat = -90 + Math.random() * 180;
      const lon = -180 + Math.random() * 360;
      const elev = elevation(lat, lon);

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const r = EARTH_RADIUS + elev * 0.012;

      pts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );

      // Color: peaks luminous lilac, lowlands dim violet (Amethyst palette)
      const brightness = 0.18 + elev * 0.82;
      cols.push(brightness * 0.79, brightness * 0.66, brightness * 1.0);
    }

    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
    };
  }, []);

  if (!showTerrain) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}
