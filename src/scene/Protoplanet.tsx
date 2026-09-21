/**
 * The in-progress body during a focus session.
 *
 * - `focusProgress` (0..1, or null when idle) drives accretion: a loose dust
 *   cloud tightens into a solid low-poly core as progress approaches 1.
 * - `shattering` triggers a single ~1.2s fracture: the core vanishes and the
 *   dust bursts outward, then drifts inward toward the star and fades. Cold
 *   and quiet — fixed pale, desaturated colour (never the week hue, never
 *   red), no camera shake, no flash.
 *
 * Sits at the orbit slot the forming planet will occupy on completion, so
 * crystallization reads as "settling into place" rather than teleporting.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orbitRadius } from '~/contract/constants';
import { ICOSA_LOD1 } from './geometryPool';
import { orbitPosition } from './orbitMath';
import { hueColor } from './palette';

const PARTICLE_COUNT = 200;
const SHATTER_DURATION_S = 1.2;
const COLD_COLOR = new THREE.Color('#cfe3ff');

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ProtoplanetProps {
  focusProgress: number | null;
  shattering?: boolean;
  baseHue: number;
  nextIndex: number;
  cinematic?: boolean;
}

export function Protoplanet({
  focusProgress,
  shattering = false,
  baseHue,
  nextIndex,
  cinematic = true,
}: ProtoplanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMaterialRef = useRef<THREE.PointsMaterial>(null);
  const shatterElapsed = useRef<number | null>(null);
  const wasShattering = useRef(false);
  const angleRef = useRef(0);

  const radius = orbitRadius(nextIndex);
  const color = useMemo(() => hueColor(baseHue), [baseHue]);

  const { positions, directions } = useMemo(() => {
    const rand = mulberry32(0xC0FFEE ^ nextIndex);
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const dir = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const d = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      );
      dir[i * 3] = d.x;
      dir[i * 3 + 1] = d.y;
      dir[i * 3 + 2] = d.z;
      pos[i * 3] = d.x;
      pos[i * 3 + 1] = d.y;
      pos[i * 3 + 2] = d.z;
    }
    return { positions: pos, directions: dir };
  }, [nextIndex]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    return geo;
  }, [positions]);

  useFrame((_state, delta) => {
    if (focusProgress == null || !groupRef.current) return;

    if (cinematic) angleRef.current += 0.05 * delta;
    const [x, y, z] = orbitPosition(radius, angleRef.current, 0.02);
    groupRef.current.position.set(x, y, z);

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

    if (shattering) {
      if (!wasShattering.current) shatterElapsed.current = 0;
      wasShattering.current = true;
      shatterElapsed.current = Math.min(
        SHATTER_DURATION_S,
        (shatterElapsed.current ?? 0) + delta,
      );
      const t = shatterElapsed.current / SHATTER_DURATION_S;
      // First third: burst outward. Remainder: drift back toward the star
      // (world origin, i.e. back toward -groupRef.position) and fade.
      const burst = Math.min(1, t / 0.3) * 0.9;
      const pull = Math.max(0, (t - 0.3) / 0.7);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const dx = directions[i * 3];
        const dy = directions[i * 3 + 1];
        const dz = directions[i * 3 + 2];
        const outward = 0.35 + burst * 1.1;
        // Pull vector: from current outward position back toward the star,
        // i.e. toward -group position in local space.
        const toStar = new THREE.Vector3(-x, -y, -z).normalize().multiplyScalar(pull * radius * 0.9);
        posAttr.setXYZ(
          i,
          dx * outward + toStar.x,
          dy * outward + toStar.y,
          dz * outward + toStar.z,
        );
      }
      posAttr.needsUpdate = true;
      if (pointsMaterialRef.current) pointsMaterialRef.current.opacity = 0.8 * (1 - t);
      if (coreRef.current) coreRef.current.visible = false;
      if (t >= 1 && pointsRef.current) pointsRef.current.visible = false;
      return;
    }

    wasShattering.current = false;
    shatterElapsed.current = null;
    if (pointsRef.current) pointsRef.current.visible = true;
    if (pointsMaterialRef.current) {
      pointsMaterialRef.current.opacity = 0.8 * (1 - Math.min(1, focusProgress * 1.4));
    }

    const spread = THREE.MathUtils.lerp(1.3, 0.05, focusProgress);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dx = directions[i * 3];
      const dy = directions[i * 3 + 1];
      const dz = directions[i * 3 + 2];
      posAttr.setXYZ(i, dx * spread, dy * spread, dz * spread);
    }
    posAttr.needsUpdate = true;

    if (coreRef.current) {
      coreRef.current.visible = true;
      const coreScale = THREE.MathUtils.lerp(0.02, 0.3, Math.max(0, focusProgress - 0.15) / 0.85);
      coreRef.current.scale.setScalar(Math.max(0.001, coreScale));
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.lerp(0, 0.95, focusProgress);
    }
  });

  if (focusProgress == null) return null;

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          ref={pointsMaterialRef}
          size={0.045}
          color={COLD_COLOR}
          transparent
          opacity={0.8}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <mesh ref={coreRef} geometry={ICOSA_LOD1} visible={false}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          flatShading
          roughness={0.85}
          transparent
          opacity={0}
          toneMapped
        />
      </mesh>
    </group>
  );
}
