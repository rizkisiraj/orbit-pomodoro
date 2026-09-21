/**
 * `<Scene>` — the entire three.js world. Implements `SceneProps` from
 * `~/contract/api` exactly: plain props in, no store/timer reads, no global
 * state. That's what makes it reusable for archive thumbnails and testable
 * in isolation (see `__dev__/SceneDemo.tsx`).
 *
 * Post-processing is Bloom and nothing else — no DOF, no chromatic
 * aberration, no vignette shader. The near-black background + subtle radial
 * vignette from PRD §6 is done with a CSS gradient on the wrapping div, so it
 * never touches the post-processing pipeline.
 */
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { Canvas } from '@react-three/fiber';
import type { PlanetParams } from '~/contract/types';
import { orbitRadius } from '~/contract/constants';
import { BloomEffect } from './BloomEffect';
import { CameraRig } from './CameraRig';
import { Orbits } from './Orbits';
import { Planet } from './Planet';
import { Protoplanet } from './Protoplanet';
import { Star } from './Star';
import { Starfield } from './Starfield';
import { starBloomIntensityForTier } from './palette';

export interface SceneProps {
  planets: PlanetParams[];
  starTier: number;
  baseHue: number;
  focusProgress: number | null;
  shattering?: boolean;
  cinematic?: boolean;
  thumbnail?: boolean;
  onHoverPlanet?: (planet: PlanetParams | null) => void;
}

const BACKDROP_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse at 50% 45%, #0d0f16 0%, #07080B 65%, #050609 100%)',
};

export function Scene({
  planets,
  starTier,
  baseHue,
  focusProgress,
  shattering = false,
  cinematic = true,
  thumbnail = false,
  onHoverPlanet,
}: SceneProps): ReactElement {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const effectiveCinematic = cinematic && !thumbnail;

  const outerRadius = useMemo(
    () => (planets.length > 0 ? orbitRadius(planets.length - 1) : orbitRadius(0)),
    [planets.length],
  );

  const handlePointerOver = useCallback(
    (planet: PlanetParams) => {
      if (thumbnail) return;
      setHoveredId(planet.id);
      onHoverPlanet?.(planet);
    },
    [onHoverPlanet, thumbnail],
  );

  const handlePointerOut = useCallback(
    (planet: PlanetParams) => {
      if (thumbnail) return;
      setHoveredId((current) => (current === planet.id ? null : current));
      onHoverPlanet?.(null);
    },
    [onHoverPlanet, thumbnail],
  );

  return (
    <div style={BACKDROP_STYLE}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 48, near: 0.1, far: 260, position: [0, 6, 18] }}
      >
        <color attach="background" args={['#07080B']} />
        <ambientLight intensity={0.18} />

        <Starfield />
        <Star starTier={starTier} cinematic={effectiveCinematic} />
        <Orbits planets={planets} baseHue={baseHue} />

        {planets.map((planet) => (
          <Planet
            key={planet.id}
            planet={planet}
            cinematic={effectiveCinematic}
            hovered={hoveredId === planet.id}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ))}

        <Protoplanet
          focusProgress={thumbnail ? null : focusProgress}
          shattering={shattering}
          baseHue={baseHue}
          nextIndex={planets.length}
          cinematic={effectiveCinematic}
        />

        <CameraRig
          outerRadius={outerRadius}
          focusProgress={thumbnail ? null : focusProgress}
          nextIndex={planets.length}
          cinematic={effectiveCinematic}
          thumbnail={thumbnail}
        />

        <BloomEffect intensity={starBloomIntensityForTier(starTier)} />
      </Canvas>
    </div>
  );
}
