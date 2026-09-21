/**
 * Telemetry. The station itself is cumulative across all time; only the
 * week row here is week-scoped (ISO week, Monday 00:00 local).
 */
import { DAYS, dayIndex, weekStart } from './constants';
import { completedOf } from './store';
import type { Session, Stats } from './types';

export function computeStats(sessions: Session[], now: number = Date.now()): Stats {
  const done = completedOf(sessions);
  const monday = weekStart(now);
  const weekDone = done.filter((s) => s.startedAt >= monday);

  const dayCounts = DAYS.map(() => 0);
  for (const s of weekDone) {
    dayCounts[dayIndex(s.startedAt)] += 1;
  }

  const started = sessions.length;

  return {
    modules: done.length,
    focusMinutes: done.reduce((total, s) => total + s.durationMin, 0),
    weekCompleted: weekDone.length,
    started,
    completionPct: started ? Math.round((done.length / started) * 100) : 0,
    dayCounts,
  };
}
