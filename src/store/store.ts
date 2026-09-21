/**
 * Zustand store over localStorage. One JSON blob under STORAGE_KEY, written
 * only on phase transitions (recordSession / addMoonToLatest / addRingToLatest
 * / rolloverIfNeeded / setSettings) — never per frame.
 *
 * Boot is defensive: corrupt or unknown-version localStorage falls back to a
 * fresh store silently. Nothing here ever throws on boot.
 */

import { create } from 'zustand';
import { MAX_MOONS_PER_PLANET, STORAGE_KEY } from '~/contract/constants';
import type { StoreState } from '~/contract/api';
import type { PersistedStore, Session, Settings, Week } from '~/contract/types';
import { freshStore, parsePersistedStore } from './schema';
import { rolloverIfNeeded as rolloverStore } from './week';

function loadInitialStore(): PersistedStore {
  if (typeof localStorage === 'undefined') {
    return freshStore();
  }
  try {
    const parsed = parsePersistedStore(localStorage.getItem(STORAGE_KEY));
    return parsed ?? freshStore();
  } catch {
    return freshStore();
  }
}

function persist(store: PersistedStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full, disabled, or unavailable (private mode). Losing a write
    // is preferable to throwing during a timer transition.
  }
}

export const useStore = create<StoreState>()((set, get) => ({
  ...loadInitialStore(),

  recordSession(session: Session) {
    const state = get();
    const currentWeek: Week = {
      ...state.currentWeek,
      sessions: [...state.currentWeek.sessions, session],
    };
    const next: PersistedStore = { ...extractPersisted(state), currentWeek };
    set(next);
    persist(next);
  },

  addMoonToLatest() {
    const state = get();
    const sessions = state.currentWeek.sessions;
    const latestIndex = lastCompletedIndex(sessions);
    if (latestIndex === -1) return;

    const target = sessions[latestIndex];
    if (target.moons >= MAX_MOONS_PER_PLANET) return;

    const nextSessions = sessions.slice();
    nextSessions[latestIndex] = { ...target, moons: target.moons + 1 };
    const currentWeek: Week = { ...state.currentWeek, sessions: nextSessions };
    const next: PersistedStore = { ...extractPersisted(state), currentWeek };
    set(next);
    persist(next);
  },

  addRingToLatest() {
    const state = get();
    const sessions = state.currentWeek.sessions;
    const latestIndex = lastCompletedIndex(sessions);
    if (latestIndex === -1) return;

    const target = sessions[latestIndex];
    if (target.hasRing) return;

    const nextSessions = sessions.slice();
    nextSessions[latestIndex] = { ...target, hasRing: true };
    const currentWeek: Week = { ...state.currentWeek, sessions: nextSessions };
    const next: PersistedStore = { ...extractPersisted(state), currentWeek };
    set(next);
    persist(next);
  },

  rolloverIfNeeded(now?: number) {
    const state = get();
    const current = extractPersisted(state);
    const rolled = rolloverStore(current, now);
    if (rolled === current) return; // no rollover due; skip the write
    set(rolled);
    persist(rolled);
  },

  setSettings(patch: Partial<Settings>) {
    const state = get();
    const next: PersistedStore = {
      ...extractPersisted(state),
      settings: { ...state.settings, ...patch },
    };
    set(next);
    persist(next);
  },
}));

function extractPersisted(state: StoreState): PersistedStore {
  return {
    version: state.version,
    currentWeek: state.currentWeek,
    archive: state.archive,
    settings: state.settings,
  };
}

function lastCompletedIndex(sessions: Session[]): number {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].outcome === 'completed') return i;
  }
  return -1;
}

export function useCurrentWeek(): Week {
  return useStore((s) => s.currentWeek);
}

export function useArchive(): Week[] {
  return useStore((s) => s.archive);
}

export function useSettings(): Settings {
  return useStore((s) => s.settings);
}
