import { describe, expect, it } from 'vitest';
import { freshStore, parsePersistedStore, validatePersistedStore } from './schema';

describe('validatePersistedStore', () => {
  it('accepts a well-formed store', () => {
    const store = freshStore(1_700_000_000_000);
    expect(validatePersistedStore(store)).toEqual(store);
  });

  it('rejects null/undefined/non-object values without throwing', () => {
    expect(validatePersistedStore(null)).toBeNull();
    expect(validatePersistedStore(undefined)).toBeNull();
    expect(validatePersistedStore('a string')).toBeNull();
    expect(validatePersistedStore(42)).toBeNull();
    expect(validatePersistedStore([])).toBeNull();
  });

  it('rejects an unknown/future version', () => {
    const store = freshStore();
    expect(validatePersistedStore({ ...store, version: 2 })).toBeNull();
    expect(validatePersistedStore({ ...store, version: 0 })).toBeNull();
  });

  it('rejects malformed nested shapes', () => {
    const store = freshStore();
    expect(validatePersistedStore({ ...store, currentWeek: {} })).toBeNull();
    expect(validatePersistedStore({ ...store, archive: 'nope' })).toBeNull();
    expect(validatePersistedStore({ ...store, settings: { sound: 'yes' } })).toBeNull();
    expect(
      validatePersistedStore({
        ...store,
        currentWeek: { ...store.currentWeek, sessions: [{ id: 1 }] },
      }),
    ).toBeNull();
  });
});

describe('parsePersistedStore', () => {
  it('returns null for missing/corrupt localStorage content without throwing', () => {
    expect(parsePersistedStore(null)).toBeNull();
    expect(parsePersistedStore('')).toBeNull();
    expect(parsePersistedStore('{not valid json')).toBeNull();
    expect(parsePersistedStore('null')).toBeNull();
    expect(parsePersistedStore('"just a string"')).toBeNull();
  });

  it('round-trips a valid store through JSON', () => {
    const store = freshStore(1_700_000_000_000);
    expect(parsePersistedStore(JSON.stringify(store))).toEqual(store);
  });
});
