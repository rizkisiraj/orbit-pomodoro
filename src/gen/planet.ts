/**
 * Deterministic planet generation. Pure functions: params in, params out.
 * No React, no Three.js, no DOM. Orbit radius/speed always come from
 * `contract/constants` so the scene's orbit arcs never drift from these
 * positions.
 */

import {
  MAX_BODY_RADIUS,
  MAX_INCLINATION,
  MIN_BODY_RADIUS,
  FOCUS_MIN,
  orbitRadius,
  orbitSpeed,
} from '~/contract/constants';
import type { PlanetParamsFor, PlanetsForWeek } from '~/contract/api';
import type { MoonParams, Session, Surface } from '~/contract/types';
import { mulberry32, seedFrom } from './rng';

const SURFACES: Surface[] = ['banded', 'cratered', 'smooth', 'fault'];

/** Hue spread either side of the week's base hue, per PRD §4. */
const HUE_SPREAD = 25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function moonParamsFor(rand: () => number, moonIndex: number): MoonParams {
  return {
    orbitRadius: 0.55 + moonIndex * 0.22,
    orbitSpeed: 0.9 - moonIndex * 0.15,
    radius: 0.05 + rand() * 0.03,
    startAngle: rand() * Math.PI * 2,
    inclination: (rand() - 0.5) * 2 * MAX_INCLINATION,
  };
}

/**
 * Every property here is derived from `session.id`'s seed in a fixed draw
 * order, so the same session always yields byte-identical params. `index`
 * and `baseHue` are inputs, not seeds, but still deterministic given the
 * caller passes the same values (which `planetsForWeek` guarantees).
 */
export const planetParamsFor: PlanetParamsFor = (session, index, baseHue) => {
  const rand = mulberry32(seedFrom(session.id));

  const radius = orbitRadius(index);
  const inclination = (rand() - 0.5) * 2 * MAX_INCLINATION;
  const startAngle = rand() * Math.PI * 2;

  const rawBodyRadius = MIN_BODY_RADIUS + rand() * (MAX_BODY_RADIUS - MIN_BODY_RADIUS);
  const durationScale = session.durationMin / FOCUS_MIN;
  const bodyRadius = clamp(rawBodyRadius * durationScale, MIN_BODY_RADIUS, MAX_BODY_RADIUS);

  const detail = rand() > 0.5 ? 2 : 1;
  const hue = (baseHue + (rand() - 0.5) * 2 * HUE_SPREAD + 360) % 360;
  const surface = SURFACES[Math.floor(rand() * SURFACES.length)];

  // Moon count and ring come from the session record (accreted during
  // actual play), never re-derived from the seed. Per-moon visual detail
  // is still seeded so it stays stable across reloads.
  const moons: MoonParams[] = Array.from({ length: session.moons }, (_, m) =>
    moonParamsFor(rand, m),
  );

  return {
    id: session.id,
    index,
    orbitRadius: radius,
    orbitSpeed: orbitSpeed(radius),
    inclination,
    startAngle,
    bodyRadius,
    detail,
    hue,
    surface,
    hasRing: session.hasRing,
    moons,
    label: session.label,
    startedAt: session.startedAt,
  };
};

/**
 * Only completed sessions become planets. Orbit indexes are assigned in
 * chronological order (by `startedAt`), independent of storage order.
 */
export const planetsForWeek: PlanetsForWeek = (week) => {
  const completed = week.sessions
    .filter((s: Session) => s.outcome === 'completed')
    .sort((a: Session, b: Session) => a.startedAt - b.startedAt);

  return completed.map((session, index) => planetParamsFor(session, index, week.baseHue));
};
