/**
 * SHARED CONTRACT — fixtures.
 *
 * OWNED BY: the human / orchestrator. Agents MUST NOT edit this file.
 *
 * This is what makes the four workstreams non-blocking. The view agents build
 * against these fixtures and never wait for the logic agents to finish. When
 * the real modules land, the swap is a one-line import change per call site.
 *
 * STATUS after integration (M-INT): the app no longer reads any of this. The
 * only remaining consumer is the scene dev harness at `src/scene/__dev__/`,
 * which needs fixed fixtures to compare frames against and to exercise the
 * 20-planet case without waiting a real week. Kept for that reason rather than
 * deleted per TODO I.4.
 *
 * Because of that, treat it as harness data ONLY. It duplicates a little
 * generation math and is NOT guaranteed to match `src/gen/planet.ts` — never
 * use it to reason about what the real app will render.
 */

import {
  MAX_BODY_RADIUS,
  MAX_INCLINATION,
  MIN_BODY_RADIUS,
  hueForWeek,
  isoWeekKey,
  orbitRadius,
  orbitSpeed,
  weekStart,
} from './constants';
import type {
  PersistedStore,
  PlanetParams,
  Session,
  Stats,
  Surface,
  TimerApi,
  Week,
} from './types';

// --- tiny deterministic RNG, fixtures only -------------------------------

function rngFor(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURFACES: Surface[] = ['banded', 'cratered', 'smooth', 'fault'];

const LABELS = [
  'refactor auth layer',
  'read Kepler paper',
  '',
  'PRD review',
  'shader experiments',
  'inbox zero',
  'orbit math',
  '',
  'design pass on archive',
  'write tests',
];

// --- sessions -------------------------------------------------------------

const WEEK_START = weekStart(Date.now());

function makeSession(i: number, dayOffset: number, outcome: Session['outcome']): Session {
  const rand = rngFor(`mock-session-${i}`);
  const startedAt = WEEK_START + dayOffset * 86_400_000 + (9 + (i % 8)) * 3_600_000;
  return {
    id: `mock-session-${i}`,
    startedAt,
    endedAt: startedAt + 25 * 60_000,
    durationMin: 25,
    label: LABELS[i % LABELS.length],
    outcome,
    moons: Math.floor(rand() * 4),
    hasRing: (i + 1) % 4 === 0,
  };
}

/** 9 completed + 2 abandoned, spread across the first four days of this week. */
export const mockSessions: Session[] = [
  makeSession(0, 0, 'completed'),
  makeSession(1, 0, 'completed'),
  makeSession(2, 0, 'abandoned'),
  makeSession(3, 1, 'completed'),
  makeSession(4, 1, 'completed'),
  makeSession(5, 1, 'completed'),
  makeSession(6, 2, 'completed'),
  makeSession(7, 2, 'abandoned'),
  makeSession(8, 3, 'completed'),
  makeSession(9, 3, 'completed'),
  makeSession(10, 3, 'completed'),
];

export const mockWeek: Week = {
  isoWeek: isoWeekKey(WEEK_START),
  baseHue: hueForWeek(isoWeekKey(WEEK_START)),
  startedAt: WEEK_START,
  sessions: mockSessions,
};

/** Three past weeks of varying density, newest first. */
export const mockArchive: Week[] = [1, 2, 3].map((back) => {
  const start = WEEK_START - back * 7 * 86_400_000;
  const key = isoWeekKey(start);
  const count = [14, 6, 20][back - 1];
  return {
    isoWeek: key,
    baseHue: hueForWeek(key),
    startedAt: start,
    sessions: Array.from({ length: count }, (_, i) => {
      const s = makeSession(i, i % 7, 'completed');
      return { ...s, id: `${key}-${i}`, startedAt: start + (i % 7) * 86_400_000 };
    }),
  };
});

// --- planets --------------------------------------------------------------

/** Fixture version of planetParamsFor. LOGIC-2 owns the real one. */
export function mockPlanetParams(session: Session, index: number, baseHue: number): PlanetParams {
  const rand = rngFor(session.id);
  const radius = orbitRadius(index);
  return {
    id: session.id,
    index,
    orbitRadius: radius,
    orbitSpeed: orbitSpeed(radius),
    inclination: (rand() - 0.5) * 2 * MAX_INCLINATION,
    startAngle: rand() * Math.PI * 2,
    bodyRadius: MIN_BODY_RADIUS + rand() * (MAX_BODY_RADIUS - MIN_BODY_RADIUS),
    detail: rand() > 0.5 ? 2 : 1,
    hue: (baseHue + (rand() - 0.5) * 50 + 360) % 360,
    surface: SURFACES[Math.floor(rand() * SURFACES.length)],
    hasRing: session.hasRing,
    moons: Array.from({ length: session.moons }, (_, m) => ({
      orbitRadius: 0.55 + m * 0.22,
      orbitSpeed: 0.9 - m * 0.15,
      radius: 0.05 + rand() * 0.03,
      startAngle: rand() * Math.PI * 2,
      inclination: (rand() - 0.5) * 0.6,
    })),
    label: session.label,
    startedAt: session.startedAt,
  };
}

export function mockPlanetsForWeek(week: Week): PlanetParams[] {
  return week.sessions
    .filter((s) => s.outcome === 'completed')
    .map((s, i) => mockPlanetParams(s, i, week.baseHue));
}

/** 9 planets — a realistic mid-week system. */
export const mockPlanets: PlanetParams[] = mockPlanetsForWeek(mockWeek);

/** 20 planets — the crowded case. Test orbit compression against this. */
export const mockFullWeekPlanets: PlanetParams[] = mockPlanetsForWeek(mockArchive[2]);

// --- stats ----------------------------------------------------------------

export const mockStats: Stats = {
  sessionsThisWeek: 9,
  sessionsAllTime: 49,
  minutesThisWeek: 225,
  minutesAllTime: 1225,
  streakDays: 4,
  completionRate: 0.82,
  perDay: [2, 3, 1, 3, 0, 0, 0],
};

// --- timer ----------------------------------------------------------------

const noop = () => {};

/** Mid-focus, 11:12 left. Swap `phase`/`progress` by hand while building UI. */
export const mockTimer: TimerApi = {
  phase: 'focus',
  remainingMs: 672_000,
  deadline: Date.now() + 672_000,
  progress: 0.552,
  setPosition: 1,
  label: 'refactor auth layer',
  inGracePeriod: false,
  start: noop,
  giveUp: noop,
  skipBreak: noop,
};

export const mockIdleTimer: TimerApi = {
  ...mockTimer,
  phase: 'idle',
  remainingMs: 0,
  deadline: null,
  progress: 0,
  label: '',
};

export const mockStore: PersistedStore = {
  version: 1,
  currentWeek: mockWeek,
  archive: mockArchive,
  settings: { sound: true, notifications: true },
};
