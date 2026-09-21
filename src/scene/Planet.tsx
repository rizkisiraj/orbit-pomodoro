/**
 * One planet: body + its moons + its ring (if any). Flat-shaded, low-poly,
 * matte, with a low emissive intensity that lets bloom pick out only the
 * brightest facets — the "thin emissive rim" is the low-poly facets catching
 * the star light and bloom threshold, not extra geometry.
 *
 * Geometry is always a reference into the shared pool (`geometryPool.ts`),
 * scaled per-mesh — never constructed per-planet.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { DoubleSide } from 'three';
import type { PlanetParams } from '~/contract/types';
import { ICOSA_LOD0, RING_GEOMETRY, icosaForDetail } from './geometryPool';
import { orbitPosition } from './orbitMath';
import { hueColor } from './palette';

export interface PlanetProps {
  planet: PlanetParams;
  cinematic?: boolean;
  hovered?: boolean;
  onPointerOver?: (planet: PlanetParams) => void;
  onPointerOut?: (planet: PlanetParams) => void;
}

function Moon({
  moon,
  cinematic,
  hue,
}: {
  moon: PlanetParams['moons'][number];
  cinematic: boolean;
  hue: number;
}) {
  const ref = useRef<Group>(null);
  const angleRef = useRef(moon.startAngle);

  useFrame((_, delta) => {
    if (cinematic) angleRef.current += moon.orbitSpeed * delta;
    const [x, y, z] = orbitPosition(moon.orbitRadius, angleRef.current, moon.inclination);
    ref.current?.position.set(x, y, z);
  });

  const color = hueColor(hue, 0.12, 0.82);

  return (
    <group ref={ref}>
      <mesh geometry={ICOSA_LOD0} scale={moon.radius}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          flatShading
          roughness={0.9}
          metalness={0}
          toneMapped
        />
      </mesh>
    </group>
  );
}

export function Planet({ planet, cinematic = true, hovered = false, onPointerOver, onPointerOut }: PlanetProps) {
  const groupRef = useRef<Group>(null);
  const angleRef = useRef(planet.startAngle);
  const color = hueColor(planet.hue);

  useFrame((_, delta) => {
    if (cinematic) angleRef.current += planet.orbitSpeed * delta;
    const [x, y, z] = orbitPosition(planet.orbitRadius, angleRef.current, planet.inclination);
    groupRef.current?.position.set(x, y, z);
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={icosaForDetail(planet.detail)}
        scale={hovered ? planet.bodyRadius * 1.08 : planet.bodyRadius}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver?.(planet);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onPointerOut?.(planet);
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.42 : 0.22}
          flatShading
          roughness={0.82}
          metalness={0.08}
          toneMapped
        />
      </mesh>
      {planet.hasRing ? (
        <mesh geometry={RING_GEOMETRY} scale={planet.bodyRadius} rotation={[Math.PI / 2.3, 0, 0]}>
          <meshBasicMaterial color={color} transparent opacity={0.3} side={DoubleSide} toneMapped />
        </mesh>
      ) : null}
      {planet.moons.map((moon, i) => (
        <Moon key={i} moon={moon} cinematic={cinematic} hue={planet.hue} />
      ))}
    </group>
  );
}
