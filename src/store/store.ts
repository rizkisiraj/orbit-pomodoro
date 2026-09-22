/**
 * Persistence. One JSON blob under `orbital.v1`, written on phase transitions
 * only — never per frame or per tick.
 *
 * Boot must never throw: corrupt, absent or unknown-version storage silently
 * yields an empty station. Sessions with a non-finite `startedAt` are dropped
 * defensively (guards against earlier bad writes) and the cleaned list re-saved.
 */
import { create } from 'zustand';
import { STORAGE_KEY } from '../constants';
import type { PersistedStore, Session } from '../types';

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    Number.isFinite(s.startedAt) &&
    Number.isFinite(s.endedAt) &&
    Number.isFinite(s.durationMin) &&
    typeof s.label === 'string' &&
    (s.outcome === 'completed' || s.outcome === 'aborted')
  );
}

export function parseStore(raw: string | null): PersistedStore {
  if (!raw) return { version: 1, sessions: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { version: 1, sessions: [] };
    const candidate = parsed as Partial<PersistedStore>;
    if (candidate.version !== 1 || !Array.isArray(candidate.sessions)) {
      return { version: 1, sessions: [] };
    }
    return { version: 1, sessions: candidate.sessions.filter(isSession) };
  } catch {
    return { version: 1, sessions: [] };
  }
}

function read(): PersistedStore {
  if (typeof localStorage === 'undefined') return { version: 1, sessions: [] };
  return parseStore(localStorage.getItem(STORAGE_KEY));
}

function write(store: PersistedStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked (private mode). The session still runs; only
    // persistence is lost, which is not worth crashing the app over.
  }
}

interface StoreState {
  sessions: Session[];
  /** Appends a finished session and persists. */
  addSession(session: Session): void;
  /** Drops all history. */
  reset(): void;
}

const initial = read();
// Re-save on boot so a list cleaned of bad records does not linger on disk.
write(initial);

export const useStore = create<StoreState>()((set, get) => ({
  sessions: initial.sessions,

  addSession(session) {
    const sessions = [...get().sessions, session];
    set({ sessions });
    write({ version: 1, sessions });
  },

  reset() {
    set({ sessions: [] });
    write({ version: 1, sessions: [] });
  },
}));

/** Completed sessions only, in order — these are the docked modules. */
export function completedOf(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.outcome === 'completed');
}
