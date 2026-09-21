import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_MOONS_PER_PLANET, STORAGE_KEY } from '~/contract/constants';
import type { Session } from '~/contract/types';

/** Minimal in-memory localStorage stub — the vitest node env has none. */
function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    startedAt: Date.now(),
    endedAt: Date.now() + 1_500_000,
    durationMin: 25,
    label: '',
    outcome: 'completed',
    moons: 0,
    hasRing: false,
    ...overrides,
  };
}

describe('useStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    vi.resetModules();
  });

  it('boots with a fresh store when localStorage is empty', async () => {
    const { useStore } = await import('./store');
    const state = useStore.getState();
    expect(state.version).toBe(1);
    expect(state.currentWeek.sessions).toEqual([]);
    expect(state.archive).toEqual([]);
  });

  it('never throws on boot with corrupt localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { useStore } = await import('./store');
    expect(() => useStore.getState()).not.toThrow();
    expect(useStore.getState().currentWeek.sessions).toEqual([]);
  });

  it('never throws on boot with an unknown version', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, garbage: true }));
    const { useStore } = await import('./store');
    expect(useStore.getState().version).toBe(1);
  });

  it('recordSession appends a session and persists it', async () => {
    const { useStore } = await import('./store');
    const session = makeSession();
    useStore.getState().recordSession(session);

    expect(useStore.getState().currentWeek.sessions).toContainEqual(session);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(persisted.currentWeek.sessions).toContainEqual(session);
  });

  it('addMoonToLatest increments moons on the newest completed session, capped', async () => {
    const { useStore } = await import('./store');
    useStore.getState().recordSession(makeSession({ id: 'a', startedAt: 1 }));
    useStore.getState().recordSession(makeSession({ id: 'b', startedAt: 2 }));

    for (let i = 0; i < MAX_MOONS_PER_PLANET + 2; i++) {
      useStore.getState().addMoonToLatest();
    }

    const sessions = useStore.getState().currentWeek.sessions;
    expect(sessions.find((s) => s.id === 'b')?.moons).toBe(MAX_MOONS_PER_PLANET);
    expect(sessions.find((s) => s.id === 'a')?.moons).toBe(0);
  });

  it('addRingToLatest flags the newest completed session', async () => {
    const { useStore } = await import('./store');
    useStore.getState().recordSession(makeSession({ id: 'a', startedAt: 1 }));
    useStore.getState().recordSession(makeSession({ id: 'b', startedAt: 2, outcome: 'abandoned' }));

    useStore.getState().addRingToLatest();

    const sessions = useStore.getState().currentWeek.sessions;
    expect(sessions.find((s) => s.id === 'a')?.hasRing).toBe(true);
  });

  it('setSettings patches settings and persists', async () => {
    const { useStore } = await import('./store');
    useStore.getState().setSettings({ sound: false });
    expect(useStore.getState().settings.sound).toBe(false);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(persisted.settings.sound).toBe(false);
  });
});
