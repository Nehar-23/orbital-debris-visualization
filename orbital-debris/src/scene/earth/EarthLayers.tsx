import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { SurfaceEarth } from './SurfaceEarth';
import { WireframeEarth } from './WireframeEarth';
import { DottedEarth } from './DottedEarth';
import { TopographicEarth } from './TopographicEarth';
import { sim } from '../shared';

export function EarthLayers() {
  const groupRef = useRef<THREE.Group>(null);

  // Orient the whole Earth by Greenwich Mean Sidereal Time so its geography sits
  // in the true ECI frame — continents then line up with the (real-ECI) debris.
  useFrame(() => {
    if (groupRef.current) {
      const gmst = satellite.gstime(new Date(sim.timeMs));
      groupRef.current.rotation.y = gmst;
    }
  });

  return (
    <group ref={groupRef}>
      <SurfaceEarth />
      <WireframeEarth />
      <DottedEarth />
      <TopographicEarth />
    </group>
  );
}
