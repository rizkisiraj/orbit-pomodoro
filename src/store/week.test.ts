import { describe, expect, it } from 'vitest';
import { ARCHIVE_MAX_WEEKS, isoWeekKey } from '~/contract/constants';
import type { PersistedStore, Week } from '~/contract/types';
import { freshStore } from './schema';
import { rolloverIfNeeded } from './week';

function weekAt(ts: number, sessions: Week['sessions'] = []): Week {
  return { isoWeek: isoWeekKey(ts), baseHue: 205, startedAt: ts, sessions };
}

describe('rolloverIfNeeded', () => {
  it('returns the same reference when still within the current week', () => {
    const now = Date.UTC(2026, 8, 21, 12, 0, 0); // a Monday-ish mid-week moment
    const store = freshStore(now);
    const result = rolloverIfNeeded(store, now + 60_000);
    expect(result).toBe(store);
  });

  it('seals the current week into the archive and starts a fresh one', () => {
    const weekOneStart = Date.UTC(2026, 8, 14); // within 2026-W38ish
    const weekTwoStart = weekOneStart + 8 * 86_400_000; // safely into next week
    const store: PersistedStore = {
      version: 1,
      currentWeek: weekAt(weekOneStart, [
        {
          id: 's1',
          startedAt: weekOneStart,
          endedAt: weekOneStart + 1_500_000,
          durationMin: 25,
          label: '',
          outcome: 'completed',
          moons: 0,
          hasRing: false,
        },
      ]),
      archive: [],
      settings: { sound: true, notifications: true },
    };

    const result = rolloverIfNeeded(store, weekTwoStart);
    expect(result).not.toBe(store);
    expect(result.currentWeek.isoWeek).toBe(isoWeekKey(weekTwoStart));
    expect(result.currentWeek.sessions).toEqual([]);
    expect(result.archive).toHaveLength(1);
    expect(result.archive[0]).toEqual(store.currentWeek);
  });

  it('archives empty weeks too', () => {
    const weekOneStart = Date.UTC(2026, 8, 14);
    const weekTwoStart = weekOneStart + 8 * 86_400_000;
    const store: PersistedStore = {
      version: 1,
      currentWeek: weekAt(weekOneStart, []),
      archive: [],
      settings: { sound: true, notifications: true },
    };

    const result = rolloverIfNeeded(store, weekTwoStart);
    expect(result.archive).toHaveLength(1);
    expect(result.archive[0].sessions).toEqual([]);
  });

  it('rolls over across a year boundary', () => {
    const lastWeekOf2025 = Date.UTC(2025, 11, 29); // Mon Dec 29 2025, ISO 2026-W01 actually
    const nextWeek = lastWeekOf2025 + 8 * 86_400_000;
    const store: PersistedStore = {
      version: 1,
      currentWeek: weekAt(lastWeekOf2025, []),
      archive: [],
      settings: { sound: true, notifications: true },
    };

    const result = rolloverIfNeeded(store, nextWeek);
    expect(result.currentWeek.isoWeek).not.toBe(store.currentWeek.isoWeek);
    expect(result.archive[0].isoWeek).toBe(store.currentWeek.isoWeek);
  });

  it('trims the archive to ARCHIVE_MAX_WEEKS, newest first', () => {
    const now = Date.UTC(2026, 8, 21);
    const existingArchive: Week[] = Array.from({ length: ARCHIVE_MAX_WEEKS }, (_, i) =>
      weekAt(now - (i + 2) * 7 * 86_400_000, []),
    );
    const store: PersistedStore = {
      version: 1,
      currentWeek: weekAt(now - 7 * 86_400_000, []),
      archive: existingArchive,
      settings: { sound: true, notifications: true },
    };

    const result = rolloverIfNeeded(store, now);
    expect(result.archive).toHaveLength(ARCHIVE_MAX_WEEKS);
    expect(result.archive[0]).toEqual(store.currentWeek);
  });
});
