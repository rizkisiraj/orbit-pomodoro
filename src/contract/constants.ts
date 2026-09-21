/**
 * SHARED CONTRACT — constants and pure shared math.
 *
 * OWNED BY: the human / orchestrator. Agents MUST NOT edit this file.
 *
 * Anything both the logic layer and the view layer must agree on numerically
 * lives here, so orbit positions computed by the generator and orbit arcs drawn
 * by the scene can never drift apart.
 */

// ---------------------------------------------------------------------------
// Phase durations
// ---------------------------------------------------------------------------

export const FOCUS_MIN = 25;
export const SHORT_BREAK_MIN = 5;
export const LONG_BREAK_MIN = 15;

/** A long break replaces the short break after this many completed focuses. */
export const SET_LENGTH = 4;

/**
 * Quitting inside this window is a free cancel, not an abandon: no planet, no
 * shatter, nothing recorded. Misclicks should not cost anything.
 */
export const GRACE_PERIOD_MS = 60_000;

export const MINUTE_MS = 60_000;

export const PHASE_MINUTES = {
  idle: 0,
  focus: FOCUS_MIN,
  shortBreak: SHORT_BREAK_MIN,
  longBreak: LONG_BREAK_MIN,
} as const;

// ---------------------------------------------------------------------------
// World rules
// ---------------------------------------------------------------------------

export const MAX_MOONS_PER_PLANET = 3;
/** Past this count, orbits compress instead of extending outward. */
export const ORBIT_COMPRESS_FROM = 12;
export const ORBIT_BASE_RADIUS = 3.2;
export const ORBIT_STEP = 1.15;

export const MIN_BODY_RADIUS = 0.22;
export const MAX_BODY_RADIUS = 0.4;

export const MAX_INCLINATION = 0.14; // radians, ~8°

/** Star brightness tiers, 0..5. One tier per completed set of 4. */
export const MAX_STAR_TIER = 5;

export const ARCHIVE_MAX_WEEKS = 52;

export const STORAGE_KEY = 'orbit.v1';

/**
 * Fixed hue palette, one per week, cycled by ISO week number. Fixed rather
 * than freely derived so no week ever lands on an ugly colour.
 */
export const WEEK_HUES = [205, 265, 340, 28, 165, 225, 300, 48] as const;

// ---------------------------------------------------------------------------
// Shared pure math — identical results required on both sides
// ---------------------------------------------------------------------------

/** Orbit radius for a 0-based slot index, compressing past the 12th planet. */
export function orbitRadius(index: number): number {
  if (index < ORBIT_COMPRESS_FROM) {
    return ORBIT_BASE_RADIUS + index * ORBIT_STEP;
  }
  const compressed = Math.log2(index - ORBIT_COMPRESS_FROM + 2) * ORBIT_STEP * 0.9;
  return ORBIT_BASE_RADIUS + ORBIT_COMPRESS_FROM * ORBIT_STEP + compressed;
}

/** Fake-Kepler angular velocity in radians/second: ~60s inner, ~180s outer. */
export function orbitSpeed(radius: number): number {
  return (Math.PI * 2) / (52 * Math.sqrt(radius / ORBIT_BASE_RADIUS));
}

/** 0..5, from the number of completed focus sessions in the week. */
export function starTier(completedFocusCount: number): number {
  return Math.min(MAX_STAR_TIER, Math.floor(completedFocusCount / SET_LENGTH));
}

/** ISO-8601 week key for a date, e.g. "2026-W39". Weeks start Monday. */
export function isoWeekKey(date: Date | number): string {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(0, 0, 0, 0);
  // Thursday of the current week decides the ISO year.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoYear = d.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Local-time Monday 00:00 of the week containing `date`. */
export function weekStart(date: Date | number): number {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Week hue from its ISO key. Stable for a given week, cycles every 8 weeks. */
export function hueForWeek(isoWeek: string): number {
  const week = Number(isoWeek.slice(-2));
  return WEEK_HUES[week % WEEK_HUES.length];
}

/** 0..6, Monday..Sunday. */
export function dayIndex(date: Date | number): number {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  return (d.getDay() + 6) % 7;
}
