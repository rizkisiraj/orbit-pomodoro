// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { parseStore } from './store';
import { computeStats } from '../utils/stats';
import { codeFor } from '../utils/modules';
import type { Session } from '../types';

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'a',
    startedAt: Date.now(),
    endedAt: Date.now() + 1000,
    durationMin: 25,
    label: '',
    outcome: 'completed',
    ...over,
  };
}

describe('parseStore never throws on boot', () => {
  test('handles absent storage', () => {
    expect(parseStore(null)).toEqual({ version: 1, sessions: [] });
  });

  test('handles malformed JSON', () => {
    expect(parseStore('{ not json at all')).toEqual({ version: 1, sessions: [] });
  });

  test('handles an unknown version', () => {
    expect(parseStore(JSON.stringify({ version: 99, sessions: [session()] }))).toEqual({
      version: 1,
      sessions: [],
    });
  });

  test('drops sessions with a non-finite startedAt', () => {
    const raw = JSON.stringify({
      version: 1,
      sessions: [session({ id: 'good' }), { ...session({ id: 'bad' }), startedAt: null }],
    });
    const parsed = parseStore(raw);
    expect(parsed.sessions.map((s) => s.id)).toEqual(['good']);
  });
});

describe('module codes', () => {
  test('cycle through the eight types and increment the suffix per pass', () => {
    expect(codeFor(0)).toBe('ARRAY-01');
    expect(codeFor(7)).toBe('RES-01');
    expect(codeFor(8)).toBe('ARRAY-02');
    expect(codeFor(16)).toBe('ARRAY-03');
  });
});

describe('telemetry', () => {
  test('counts only completed sessions as modules but all as started', () => {
    const stats = computeStats([
      session({ id: '1' }),
      session({ id: '2' }),
      session({ id: '3', outcome: 'aborted' }),
    ]);
    expect(stats.modules).toBe(2);
    expect(stats.started).toBe(3);
    expect(stats.completionPct).toBe(67);
    expect(stats.focusMinutes).toBe(50);
  });

  test('reports seven day buckets even with no history', () => {
    expect(computeStats([]).dayCounts).toHaveLength(7);
    expect(computeStats([]).completionPct).toBe(0);
  });

  test('excludes sessions from before this week', () => {
    const lastWeek = Date.now() - 9 * 86_400_000;
    const stats = computeStats([session({ id: 'old', startedAt: lastWeek })]);
    expect(stats.modules).toBe(1);
    expect(stats.weekCompleted).toBe(0);
  });
});
