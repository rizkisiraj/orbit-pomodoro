/**
 * Reframes `slotFor`'s wrap at 36 as an intentional restart: once a station's
 * lattice fills, module 37 begins "STATION II" rather than stacking on
 * module 1. Ring seal points come from a running sum of RINGS so the beats
 * stay correct if the lattice geometry ever changes. Pure: no React, no DOM.
 */
import { RINGS } from '../constants';

export type Tier = 'OUTPOST' | 'STATION' | 'COLONY' | 'FLEET';

export interface Milestone {
  /** Module count within the station build at which this seals: 6, 18, or 36. */
  at: number;
  /** 0-indexed ring that just sealed. */
  ring: number;
  /** e.g. "RING 1 SEALED" */
  title: string;
  /** e.g. "Core habitat online." */
  detail: string;
}

export interface Progress {
  tier: Tier;
  /** 1-based build number: modules 1-36 => 1, 37-72 => 2, ... */
  stationNumber: number;
  /** Modules docked within the current build, 0..36. */
  inStation: number;
  /** Modules remaining until the next ring seals; 0 when the build is full. */
  toNext: number;
  /** The next milestone in this build, or null when the build is complete. */
  next: Milestone | null;
}

/** Copy for the beat at each ring's seal point, keyed by ring index. */
const RING_COPY: Record<number, { title: string; detail: string }> = {
  0: { title: 'RING 1 SEALED', detail: 'Core habitat online.' },
  1: { title: 'RING 2 SEALED', detail: 'Sector expansion complete.' },
};

/** Cumulative modules at which each ring seals: [6, 18, 36]. Derived, never hardcoded. */
export const SEAL_POINTS: readonly number[] = RINGS.reduce<number[]>((acc, ring) => {
  const prev = acc.length ? acc[acc.length - 1] : 0;
  acc.push(prev + ring.n);
  return acc;
}, []);

/** Total modules in one station build: 36, the sum of every ring's slots. */
export const STATION_SIZE = SEAL_POINTS[SEAL_POINTS.length - 1];

const LAST_RING = RINGS.length - 1;

const MILESTONES: readonly Milestone[] = SEAL_POINTS.map((at, ring) => {
  const copy =
    ring === LAST_RING
      ? { title: 'STATION COMPLETE', detail: 'Full deployment. Beginning next build.' }
      : RING_COPY[ring];
  return { at, ring, title: copy.title, detail: copy.detail };
});

/** The milestone crossed by docking module number `count` (1-based), or null. */
export function milestoneAt(count: number): Milestone | null {
  const n = Number.isFinite(count) ? Math.floor(count) : 0;
  if (n <= 0) return null;
  const inStation = n % STATION_SIZE || STATION_SIZE;
  return MILESTONES.find((m) => m.at === inStation) ?? null;
}

/** Current standing for a given all-time completed-module count. */
export function progressFor(count: number): Progress {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  // Keyed off the build size, not fixed counts: OUTPOST covers the first third
  // of a build, STATION the rest of it, then one tier per completed build.
  // Hardcoding these (12/36/72) silently desyncs the ladder from the rings the
  // moment RINGS changes.
  const tier: Tier =
    n < STATION_SIZE / 3
      ? 'OUTPOST'
      : n < STATION_SIZE
        ? 'STATION'
        : n < STATION_SIZE * 2
          ? 'COLONY'
          : 'FLEET';

  // A build that lands exactly on STATION_SIZE is a full build (inStation ===
  // STATION_SIZE), not the start of the next one wrapped to 0.
  const stationNumber = n === 0 ? 1 : Math.ceil(n / STATION_SIZE);
  const inStation = n === 0 ? 0 : n - (stationNumber - 1) * STATION_SIZE;

  const next = MILESTONES.find((m) => m.at > inStation) ?? null;
  const toNext = next ? next.at - inStation : 0;

  return { tier, stationNumber, inStation, toNext, next };
}
