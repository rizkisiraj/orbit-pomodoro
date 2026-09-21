/**
 * DEV-ONLY seeding. Stripped from production builds by the import.meta.env.DEV
 * guard at the call site in main.tsx.
 *
 * Visit http://localhost:5173/?seed=6 to fill localStorage with six weeks of
 * plausible history, then reload without the param. `?seed=0` clears it.
 *
 * Why this exists: the app only looks like the pitch once there is history to
 * look at, and waiting six real weeks to evaluate the design is not an option.
 */
import {
  ARCHIVE_MAX_WEEKS,
  FOCUS_MIN,
  STORAGE_KEY,
  hueForWeek,
  isoWeekKey,
  weekStart,
} from '~/contract/constants';
import type { PersistedStore, Session, Week } from '~/contract/types';

const LABELS = [
  'refactor auth layer',
  'orbit math',
  'read Kepler paper',
  '',
  'shader experiments',
  'PRD review',
  'write tests',
  'design pass on archive',
  '',
  'inbox zero',
  'fix bloom threshold',
  'perf profiling',
];

/** Sessions per week, index 0 = current week. A realistic run: good weeks,
 *  a heavy week, and one bad week where almost nothing happened. */
const SESSIONS_PER_WEEK = [9, 14, 6, 20, 11, 3];

function buildWeek(weeksAgo: number, count: number): Week {
  const start = weekStart(Date.now() - weeksAgo * 7 * 86_400_000);
  const key = isoWeekKey(start);
  const sessions: Session[] = [];

  for (let i = 0; i < count; i++) {
    // Spread across Mon–Fri, a few per day, starting mid-morning.
    const day = Math.min(6, Math.floor(i / 3));
    const hour = 9 + (i % 3) * 3;
    const startedAt = start + day * 86_400_000 + hour * 3_600_000 + (i % 5) * 60_000;

    // ~1 in 7 abandoned, so the completion rate in Stats is not a fake 100%.
    const abandoned = i % 7 === 6;

    sessions.push({
      id: `seed-w${weeksAgo}-s${i}`,
      startedAt,
      endedAt: startedAt + FOCUS_MIN * 60_000,
      durationMin: FOCUS_MIN,
      label: LABELS[(i + weeksAgo * 3) % LABELS.length],
      outcome: abandoned ? 'abandoned' : 'completed',
      moons: abandoned ? 0 : i % 4 === 3 ? 2 : i % 3 === 0 ? 1 : 0,
      hasRing: !abandoned && (i + 1) % 4 === 0,
    });
  }

  return { isoWeek: key, baseHue: hueForWeek(key), startedAt: start, sessions };
}

export function seedWeeks(count: number): void {
  if (count <= 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const weeks = Array.from({ length: Math.min(count, ARCHIVE_MAX_WEEKS + 1) }, (_, i) =>
    buildWeek(i, SESSIONS_PER_WEEK[i % SESSIONS_PER_WEEK.length]),
  );

  const store: PersistedStore = {
    version: 1,
    currentWeek: weeks[0],
    archive: weeks.slice(1), // newest first, matching the store's own ordering
    settings: { sound: true, notifications: true },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Reads ?seed=N, seeds, then strips the param so a reload does not re-seed. */
export function applySeedFromUrl(): boolean {
  const param = new URLSearchParams(window.location.search).get('seed');
  if (param === null) return false;

  seedWeeks(Number(param) || 0);
  window.history.replaceState({}, '', window.location.pathname);
  return true;
}
