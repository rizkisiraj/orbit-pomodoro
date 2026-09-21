/**
 * Emissive sphere at the origin. Size, colour temperature and emissive
 * intensity (which is what drives bloom strength — Bloom reads scene
 * luminance) are all a function of `starTier` (0..5).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { ICOSA_LOD3 } from './geometryPool';
import {
  starColorForTier,
  starEmissiveForTier,
  starRadiusForTier,
} from './palette';

export interface StarProps {
  starTier: number;
  cinematic?: boolean;
}

export function Star({ starTier, cinematic = true }: StarProps) {
  const meshRef = useRef<Mesh>(null);
  const color = useMemo(() => starColorForTier(starTier), [starTier]);
  const radius = starRadiusForTier(starTier);
  const emissiveIntensity = starEmissiveForTier(starTier);

  // A very slow, near-imperceptible pulse — not a twinkle, just enough life
  // to keep the star from reading as a static sticker. Frozen under reduced motion.
  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = cinematic ? 1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015 : 1;
    meshRef.current.scale.setScalar(radius * pulse);
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={ICOSA_LOD3} scale={radius}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={1}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={color} intensity={2.2 + starTier * 0.6} distance={70} decay={2} />
    </group>
  );
}
