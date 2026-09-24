/**
 * Every number the design pins down. Values come from
 * design_handoff_orbital_station/README.md — change them here, not at call sites.
 */
import type { ModuleKind, Phase } from '../types';

export const MIN = 60;

export const STORAGE_KEY = 'orbital.v1';

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

/** Stage viewBox. SVG is `-450 -295 900 590`, so the origin is the core. */
export const VW = 900;
export const VH = 590;

/** Core geometry. The progress arc and ring-0 connectors both key off CORE_R. */
export const CORE_R = 92;
export const CORE_DISC_R = 82;
export const CORE_INNER_R = 73;
export const CORE_CIRCUMFERENCE = 2 * Math.PI * CORE_R;

export const FOCUS_MIN = 25;
export const BREAK_MIN = 5;
export const LONG_MIN = 15;

/** A long recovery replaces the short one after this many completed cycles. */
export const SET_LENGTH = 4;

/** Aborting before this counts as a free cancel: nothing recorded. */
export const GRACE_S = 60;

/** How long a freshly docked module keeps its accent stroke. */
export const DOCK_HIGHLIGHT_MS = 1800;

/** Timer poll interval. Display only — remaining time comes from the deadline. */
export const TICK_MS = 250;

export const CHIME_BREAK_HZ = 440;

export const STARFIELD_SEED = 90210;
export const STARFIELD_COUNT = 100;

/**
 * The three module rings, innermost first.
 *
 * Geometry is solved, not eyeballed. A module card measures 112 x 44.8 stage
 * units, so with a 900x590 viewBox no slot can sit past rx 394 / ry 272 without
 * the card leaving the stage — ring 2 is pinned exactly there, making this the
 * largest orbit the box allows. The offsets interleave each ring against its
 * neighbour (ring 0's cross at -90, ring 1 half a step off at -67.5) so no two
 * cards on adjacent rings ever line up radially. The previous -75/-80 pair put
 * every ring-1 slot within 10 degrees of a ring-2 slot, which overlapped four
 * card pairs by up to 18 units at a full build. Clearance is now 14.5 units at
 * the tightest point; re-solve if the card size or viewBox changes.
 */
export const RINGS = [
  { rx: 200, ry: 128, n: 4, off: -90, opacity: 1 },
  { rx: 275, ry: 204, n: 8, off: -67.5, opacity: 0.62 },
  { rx: 394, ry: 272, n: 12, off: -75, opacity: 0.4 },
] as const;

/** Module types, cycled by index. Suffix increments every full pass. */
export const KINDS: ModuleKind[] = [
  { code: 'ARRAY', status: 'COMMS', glyph: 'M -11 6 A 11 11 0 0 1 11 6 M 0 6 V -8 M -4 -11 H 4' },
  { code: 'HAB', status: 'HABITAT', glyph: 'M -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 M -8 0 H 8' },
  { code: 'SOLAR', status: 'POWER', glyph: 'M -12 -9 V 9 M -4 -9 V 9 M 4 -9 V 9 M 12 -9 V 9 M -12 0 H 12' },
  { code: 'LAB', status: 'RESEARCH', glyph: 'M -6 -10 H 6 M -3 -10 V -1 L -8 9 H 8 L 3 -1 V -10' },
  { code: 'OBS', status: 'OPTICS', glyph: 'M -6 -6 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 4 4 L 11 11 M -11 9 H -2' },
  { code: 'DOCK', status: 'DOCKING', glyph: 'M -11 -8 H 11 V 8 H -11 Z M 0 -8 V 8' },
  { code: 'HYDRO', status: 'BIOMASS', glyph: 'M 0 -10 C 9 -4 9 6 0 10 C -9 6 -9 -4 0 -10 M 0 -10 V 10' },
  { code: 'RES', status: 'ANALYSIS', glyph: 'M -11 8 L -4 -6 L 3 3 L 11 -9' },
];

/** Phase duration in seconds. `demo` runs 25 minutes in 25 seconds. */
export function durationFor(phase: Phase, demo = false): number {
  const m = demo ? 1 / 60 : 1;
  if (phase === 'focus') return FOCUS_MIN * MIN * m;
  if (phase === 'break') return BREAK_MIN * MIN * m;
  if (phase === 'long') return LONG_MIN * MIN * m;
  return 0;
}

export const PHASE_NAME: Record<Phase, string> = {
  idle: 'STANDBY',
  focus: 'FOCUS',
  break: 'RECOVERY',
  long: 'LONG RECOVERY',
};

/** mm:ss, clamped at zero. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local Monday 00:00 of the week containing `date`. */
export function weekStart(date: Date | number = Date.now()): number {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** 0..6, Monday..Sunday. */
export function dayIndex(date: Date | number): number {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  return (d.getDay() + 6) % 7;
}
