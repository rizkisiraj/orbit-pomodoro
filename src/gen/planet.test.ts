import { describe, expect, it } from 'vitest';
import { orbitRadius, orbitSpeed } from '~/contract/constants';
import type { Session, Week } from '~/contract/types';
import { planetParamsFor, planetsForWeek } from './planet';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    startedAt: 1_000,
    endedAt: 1_000 + 25 * 60_000,
    durationMin: 25,
    label: 'test',
    outcome: 'completed',
    moons: 0,
    hasRing: false,
    ...overrides,
  };
}

describe('planetParamsFor', () => {
  it('is byte-identical across 100 runs for the same id/index/hue', () => {
    const session = makeSession();
    const first = planetParamsFor(session, 3, 205);
    for (let i = 0; i < 100; i++) {
      const again = planetParamsFor(session, 3, 205);
      expect(again).toEqual(first);
    }
  });

  it('uses contract orbitRadius/orbitSpeed, not local math', () => {
    const session = makeSession();
    const params = planetParamsFor(session, 5, 205);
    expect(params.orbitRadius).toBe(orbitRadius(5));
    expect(params.orbitSpeed).toBe(orbitSpeed(orbitRadius(5)));
  });

  it('takes hasRing and moon count from the session, not the seed', () => {
    const session = makeSession({ hasRing: true, moons: 2 });
    const params = planetParamsFor(session, 0, 205);
    expect(params.hasRing).toBe(true);
    expect(params.moons).toHaveLength(2);
  });

  it('clamps body radius scaled by duration into the valid range', () => {
    const shortSession = makeSession({ durationMin: 1 });
    const params = planetParamsFor(shortSession, 0, 205);
    expect(params.bodyRadius).toBeGreaterThanOrEqual(0.22);
    expect(params.bodyRadius).toBeLessThanOrEqual(0.4);
  });

  it('produces different params for different ids', () => {
    const a = planetParamsFor(makeSession({ id: 'a' }), 0, 205);
    const b = planetParamsFor(makeSession({ id: 'b' }), 0, 205);
    expect(a.startAngle).not.toBe(b.startAngle);
  });
});

describe('planetsForWeek', () => {
  it('filters out abandoned sessions and assigns chronological indexes', () => {
    const week: Week = {
      isoWeek: '2026-W39',
      baseHue: 205,
      startedAt: 0,
      sessions: [
        makeSession({ id: 'later', startedAt: 3000, outcome: 'completed' }),
        makeSession({ id: 'abandoned', startedAt: 1500, outcome: 'abandoned' }),
        makeSession({ id: 'earlier', startedAt: 1000, outcome: 'completed' }),
      ],
    };

    const planets = planetsForWeek(week);
    expect(planets).toHaveLength(2);
    expect(planets[0].id).toBe('earlier');
    expect(planets[0].index).toBe(0);
    expect(planets[1].id).toBe('later');
    expect(planets[1].index).toBe(1);
  });

  it('returns an empty array for a week with no completed sessions', () => {
    const week: Week = { isoWeek: '2026-W39', baseHue: 205, startedAt: 0, sessions: [] };
    expect(planetsForWeek(week)).toEqual([]);
  });
});
