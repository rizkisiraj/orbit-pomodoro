/**
 * Runtime validation + migration guard for the persisted store. Corrupt or
 * unknown-version localStorage must never throw on boot — any shape that
 * doesn't check out falls back to a fresh store.
 */

import { hueForWeek, isoWeekKey, weekStart } from '~/contract/constants';
import type { PersistedStore, Session, Settings, Week } from '~/contract/types';

const CURRENT_VERSION = 1 as const;

/** A brand-new week starting now, with no sessions. */
export function freshWeek(now: number = Date.now()): Week {
  const key = isoWeekKey(now);
  return {
    isoWeek: key,
    baseHue: hueForWeek(key),
    startedAt: weekStart(now),
    sessions: [],
  };
}

/** A brand-new store, used whenever nothing usable is in localStorage. */
export function freshStore(now: number = Date.now()): PersistedStore {
  return {
    version: CURRENT_VERSION,
    currentWeek: freshWeek(now),
    archive: [],
    settings: { sound: true, notifications: true },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSession(value: unknown): value is Session {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.startedAt === 'number' &&
    typeof value.endedAt === 'number' &&
    typeof value.durationMin === 'number' &&
    typeof value.label === 'string' &&
    (value.outcome === 'completed' || value.outcome === 'abandoned') &&
    typeof value.moons === 'number' &&
    typeof value.hasRing === 'boolean'
  );
}

function isWeek(value: unknown): value is Week {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.isoWeek === 'string' &&
    typeof value.baseHue === 'number' &&
    typeof value.startedAt === 'number' &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isSession)
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isPlainObject(value)) return false;
  return typeof value.sound === 'boolean' && typeof value.notifications === 'boolean';
}

/**
 * Validates an unknown blob (freshly `JSON.parse`d from localStorage) into a
 * `PersistedStore`. Returns `null` for anything corrupt, malformed, or from
 * an unknown/future version — callers should fall back to `freshStore()`.
 * Never throws.
 */
export function validatePersistedStore(value: unknown): PersistedStore | null {
  try {
    if (!isPlainObject(value)) return null;
    if (value.version !== CURRENT_VERSION) return null;
    if (!isWeek(value.currentWeek)) return null;
    if (!Array.isArray(value.archive) || !value.archive.every(isWeek)) return null;
    if (!isSettings(value.settings)) return null;

    return {
      version: CURRENT_VERSION,
      currentWeek: value.currentWeek,
      archive: value.archive,
      settings: value.settings,
    };
  } catch {
    return null;
  }
}

/** Parses a raw localStorage string safely. Never throws. */
export function parsePersistedStore(raw: string | null): PersistedStore | null {
  if (raw == null) return null;
  try {
    return validatePersistedStore(JSON.parse(raw));
  } catch {
    return null;
  }
}
