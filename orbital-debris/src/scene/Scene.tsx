import { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Stars } from './Stars';
import { EarthLayers } from './earth/EarthLayers';
import { Atmosphere } from './Atmosphere';
import { Lighting } from './Lighting';
import { DebrisField } from './orbital/DebrisField';
import { Selection } from './orbital/Selection';
import { DetailModels } from './orbital/DetailModels';
import { Camera } from './Camera';
import { useSceneStore } from '../store/useSceneStore';
import { useDataStore } from '../store/useDataStore';

function Effects() {
  const bloomEnabled = useSceneStore((s) => s.bloomEnabled);
  const chromaticEnabled = useSceneStore((s) => s.chromaticEnabled);

  // EffectComposer dislikes empty/fragment children — render nothing if all off
  if (!bloomEnabled && !chromaticEnabled) return null;

  const effects = [];
  if (bloomEnabled) {
    effects.push(
      <Bloom
        key="bloom"
        intensity={0.7}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.85}
        mipmapBlur
      />
    );
  }
  if (chromaticEnabled) {
    effects.push(
      <ChromaticAberration
        key="chromatic"
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0002, 0.0002] as unknown as [number, number]}
        radialModulation={false}
        modulationOffset={0}
      />
    );
  }

  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}

export function Scene() {
  const setSelected = useDataStore((s) => s.setSelected);
  const stopTracking = useSceneStore((s) => s.stopTracking);
  // Clicking empty space (or the globe) clears the selection and exits follow mode.
  const handleMiss = () => { setSelected(null); stopTracking(); };
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0, 0, 60], fov: 70, near: 0.01, far: 1000 }}
      dpr={[1, 2]}
      raycaster={{ params: { Points: { threshold: 0.1 } } as THREE.RaycasterParameters }}
      onPointerMissed={handleMiss}
      style={{ background: '#000000', width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <Stars />
        <EarthLayers />
        <Atmosphere />
        <DebrisField />
        <DetailModels />
        <Selection />
        <Camera />
        <Effects />
      </Suspense>
    </Canvas>
  );
}
