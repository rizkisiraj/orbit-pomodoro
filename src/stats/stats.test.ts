import { describe, expect, it } from 'vitest';
import type { Session, Week } from '~/contract/types';
import { computeStats } from './stats';

const DAY_MS = 86_400_000;

function session(overrides: Partial<Session>): Session {
  return {
    id: 'x',
    startedAt: 0,
    endedAt: 1_500_000,
    durationMin: 25,
    label: '',
    outcome: 'completed',
    moons: 0,
    hasRing: false,
    ...overrides,
  };
}

function week(sessions: Session[], startedAt = 0): Week {
  return { isoWeek: '2026-W01', baseHue: 205, startedAt, sessions };
}

describe('computeStats', () => {
  it('counts sessions and minutes for this week and all time', () => {
    const current = week([
      session({ id: 'a', outcome: 'completed', durationMin: 25 }),
      session({ id: 'b', outcome: 'abandoned', durationMin: 25 }),
    ]);
    const archive = [week([session({ id: 'c', outcome: 'completed', durationMin: 25 })])];

    const stats = computeStats(current, archive, Date.now());

    expect(stats.sessionsThisWeek).toBe(2);
    expect(stats.sessionsAllTime).toBe(3);
    expect(stats.minutesThisWeek).toBe(25);
    expect(stats.minutesAllTime).toBe(50);
    expect(stats.completionRate).toBeCloseTo(2 / 3);
  });

  it('completionRate is 0 when nothing has started', () => {
    const stats = computeStats(week([]), [], Date.now());
    expect(stats.completionRate).toBe(0);
  });

  it('perDay has exactly 7 entries, Monday..Sunday, counting completed only', () => {
    // Monday 2026-09-21 00:00 UTC-ish local; use local Date construction.
    const monday = new Date(2026, 8, 21, 10, 0, 0).getTime(); // a Monday
    const tuesday = monday + DAY_MS;
    const current = week(
      [
        session({ id: 'a', startedAt: monday, outcome: 'completed' }),
        session({ id: 'b', startedAt: monday, outcome: 'completed' }),
        session({ id: 'c', startedAt: tuesday, outcome: 'completed' }),
        session({ id: 'd', startedAt: tuesday, outcome: 'abandoned' }),
      ],
      monday,
    );

    const stats = computeStats(current, [], monday);
    expect(stats.perDay).toHaveLength(7);
    expect(stats.perDay[0]).toBe(2); // Monday
    expect(stats.perDay[1]).toBe(1); // Tuesday
    expect(stats.perDay.slice(2)).toEqual([0, 0, 0, 0, 0]);
  });

  it('streak counts consecutive days ending today', () => {
    const today = new Date(2026, 8, 21, 12, 0, 0).getTime();
    const yesterday = today - DAY_MS;
    const twoDaysAgo = today - 2 * DAY_MS;
    const current = week([
      session({ id: 'a', startedAt: today, outcome: 'completed' }),
      session({ id: 'b', startedAt: yesterday, outcome: 'completed' }),
      session({ id: 'c', startedAt: twoDaysAgo, outcome: 'completed' }),
    ]);

    expect(computeStats(current, [], today).streakDays).toBe(3);
  });

  it('streak holds through today when today has no session yet but yesterday did', () => {
    const today = new Date(2026, 8, 21, 8, 0, 0).getTime();
    const yesterday = today - DAY_MS;
    const current = week([session({ id: 'a', startedAt: yesterday, outcome: 'completed' })]);

    expect(computeStats(current, [], today).streakDays).toBe(1);
  });

  it('streak is 0 when neither today nor yesterday has a completed session', () => {
    const today = new Date(2026, 8, 21, 8, 0, 0).getTime();
    const threeDaysAgo = today - 3 * DAY_MS;
    const current = week([session({ id: 'a', startedAt: threeDaysAgo, outcome: 'completed' })]);

    expect(computeStats(current, [], today).streakDays).toBe(0);
  });

  it('streak spans across the archive/current-week boundary', () => {
    const today = new Date(2026, 8, 21, 8, 0, 0).getTime(); // Monday, fresh week
    const yesterday = today - DAY_MS; // Sunday, in the archived week
    const current = week([], today);
    const archive = [week([session({ id: 'a', startedAt: yesterday, outcome: 'completed' })])];

    expect(computeStats(current, archive, today).streakDays).toBe(1);
  });
});
