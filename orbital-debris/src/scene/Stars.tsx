import { useMemo } from 'react';
import { useSceneStore } from '../store/useSceneStore';

export function Stars() {
  const showStars = useSceneStore((s) => s.showStars);

  const { positions, sizes } = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 280 + Math.random() * 60;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sz[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions: pos, sizes: sz };
  }, []);

  if (!showStars) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        sizeAttenuation={false}
        color="#FFFFFF"
        transparent
        opacity={0.7}
        vertexColors={false}
        depthWrite={false}
      />
    </points>
  );
}
