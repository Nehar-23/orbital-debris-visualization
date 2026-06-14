import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../utils/constants';
import { useSceneStore } from '../store/useSceneStore';

import atmVert from '../shaders/atmosphere.vert.glsl?raw';
import atmFrag from '../shaders/atmosphere.frag.glsl?raw';

export function Atmosphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const showAtmosphere = useSceneStore((s) => s.showAtmosphere);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  if (!showAtmosphere) return null;

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[EARTH_RADIUS * 1.035, 48, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={atmVert}
        fragmentShader={atmFrag}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
