/**
 * All orbit hairlines merged into a single BufferGeometry + one draw call.
 * Rebuilt only when the planet *count* changes (per PRD §7 / V2.5) — content
 * changes (hue, hover, etc.) never touch this.
 *
 * Each orbit is drawn as a ~92%-of-a-circle arc (never a closed ring) with a
 * per-vertex alpha that tapers to 0 at both ends, so it visibly fades into the
 * gap rather than snapping off. Baseline opacity sits at 6-10%.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import type { PlanetParams } from '~/contract/types';
import { orbitPosition } from './orbitMath';
import { orbitColor } from './palette';

const SEGMENTS_PER_ORBIT = 96;
const ARC_FRACTION = 0.92;
const BASE_OPACITY = 0.08;
const FADE_FRACTION = 0.08; // fraction of the arc length used for the taper at each end

const VERTEX_SHADER = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity * vAlpha);
  }
`;

function buildOrbitGeometry(planets: PlanetParams[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const alphas: number[] = [];
  const totalAngle = Math.PI * 2 * ARC_FRACTION;

  for (const planet of planets) {
    // Rotate the gap to a seed-derived position so gaps don't all line up.
    const gapOffset = planet.startAngle;
    for (let i = 0; i < SEGMENTS_PER_ORBIT; i++) {
      const t0 = i / SEGMENTS_PER_ORBIT;
      const t1 = (i + 1) / SEGMENTS_PER_ORBIT;
      const a0 = gapOffset + t0 * totalAngle;
      const a1 = gapOffset + t1 * totalAngle;
      const p0 = orbitPosition(planet.orbitRadius, a0, planet.inclination);
      const p1 = orbitPosition(planet.orbitRadius, a1, planet.inclination);
      positions.push(...p0, ...p1);

      const fade = (t: number) => {
        if (t < FADE_FRACTION) return t / FADE_FRACTION;
        if (t > 1 - FADE_FRACTION) return (1 - t) / FADE_FRACTION;
        return 1;
      };
      alphas.push(fade(t0), fade(t1));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));
  return geometry;
}

export interface OrbitsProps {
  planets: PlanetParams[];
  baseHue: number;
}

export function Orbits({ planets, baseHue }: OrbitsProps) {
  // Rebuilt only when the planet count changes, per spec.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildOrbitGeometry(planets), [planets.length]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: orbitColor(baseHue) },
          uOpacity: { value: BASE_OPACITY },
        },
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseHue],
  );

  if (planets.length === 0) return null;

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
