/**
 * ISO week rollover. Pure: takes a store, returns a store (same reference if
 * no rollover is due). `store.ts` wires this into the `rolloverIfNeeded`
 * store action.
 */

import { ARCHIVE_MAX_WEEKS, isoWeekKey } from '~/contract/constants';
import type { PersistedStore } from '~/contract/types';
import { freshWeek } from './schema';

/**
 * Seals `currentWeek` into `archive` (newest first) and starts a fresh week
 * whenever the ISO week key for `now` differs from the current week's key.
 * Empty weeks are sealed too — an empty week is still data. Trims the
 * archive to `ARCHIVE_MAX_WEEKS`. Returns the same `store` reference when no
 * rollover is due, so callers can skip a persist write.
 */
export function rolloverIfNeeded(store: PersistedStore, now: number = Date.now()): PersistedStore {
  const currentKey = isoWeekKey(now);
  if (store.currentWeek.isoWeek === currentKey) {
    return store;
  }

  const archive = [store.currentWeek, ...store.archive].slice(0, ARCHIVE_MAX_WEEKS);

  return {
    ...store,
    currentWeek: freshWeek(now),
    archive,
  };
}
