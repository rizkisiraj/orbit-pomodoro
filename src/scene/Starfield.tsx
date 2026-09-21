/**
 * ~800 static points, two size classes, no twinkle. One `Points` object, one
 * shared geometry + shader material. Positions are generated once with a
 * fixed local seed so the field is stable across remounts (thumbnails included).
 */
import { useMemo } from 'react';
import * as THREE from 'three';

const COUNT = 800;
const RADIUS_MIN = 45;
const RADIUS_MAX = 95;
/** Fraction of points that get the larger size class. */
const LARGE_FRACTION = 0.18;

// Small self-contained PRNG — Starfield has no business depending on the
// generation layer owned by another agent, so this stays local and trivial.
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

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    vAlpha = clamp(1.0 - (-mvPosition.z) / 140.0, 0.25, 0.9);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0), edge * vAlpha);
  }
`;

export function Starfield() {
  const geometry = useMemo(() => {
    const rand = mulberry32(0x5eed1);
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Uniform-ish distribution on a spherical shell around the system.
      const radius = RADIUS_MIN + rand() * (RADIUS_MAX - RADIUS_MIN);
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      sizes[i] = rand() < LARGE_FRACTION ? 2.4 : 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
