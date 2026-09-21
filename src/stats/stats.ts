/**
 * Pure stats computation over the persisted store shape. No React, no DOM.
 */

import { dayIndex } from '~/contract/constants';
import type { ComputeStats } from '~/contract/api';
import type { Session, Week } from '~/contract/types';

const DAY_MS = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function minutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => (s.outcome === 'completed' ? sum + s.durationMin : sum), 0);
}

function counts(sessions: Session[]): { completed: number; abandoned: number } {
  let completed = 0;
  let abandoned = 0;
  for (const s of sessions) {
    if (s.outcome === 'completed') completed++;
    else abandoned++;
  }
  return { completed, abandoned };
}

/**
 * Streak = consecutive calendar days, ending today, with >= 1 completed
 * session. If today has no completed session yet, the streak still holds
 * through yesterday (the day isn't over) rather than resetting to 0.
 */
function computeStreak(allSessions: Session[], now: number): number {
  const daySet = new Set<number>();
  for (const s of allSessions) {
    if (s.outcome === 'completed') daySet.add(startOfDay(s.startedAt));
  }

  let cursor = startOfDay(now);
  if (!daySet.has(cursor)) {
    cursor -= DAY_MS;
  }

  let streak = 0;
  while (daySet.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

export const computeStats: ComputeStats = (current, archive, now = Date.now()) => {
  const archiveSessions: Session[] = archive.flatMap((w: Week) => w.sessions);
  const allSessions = [...current.sessions, ...archiveSessions];

  const allCounts = counts(allSessions);

  const perDay = Array.from({ length: 7 }, () => 0);
  for (const s of current.sessions) {
    if (s.outcome === 'completed') {
      perDay[dayIndex(s.startedAt)]++;
    }
  }

  const startedTotal = allCounts.completed + allCounts.abandoned;

  return {
    sessionsThisWeek: current.sessions.length,
    sessionsAllTime: allSessions.length,
    minutesThisWeek: minutes(current.sessions),
    minutesAllTime: minutes(allSessions),
    streakDays: computeStreak(allSessions, now),
    completionRate: startedTotal === 0 ? 0 : allCounts.completed / startedTotal,
    perDay,
  };
};
