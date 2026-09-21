/**
 * Shared vocabulary for the Orbital Station app.
 * Shapes follow design_handoff_orbital_station/README.md §State management.
 */

export type Phase = 'idle' | 'focus' | 'break' | 'long';

export type Outcome = 'completed' | 'aborted';

export type ViewName = 'station' | 'log' | 'stats';

export interface Session {
  id: string;
  /** epoch ms — must always be finite; non-finite records are dropped on load. */
  startedAt: number;
  endedAt: number;
  durationMin: number;
  /** '' when no intent was set. */
  label: string;
  outcome: Outcome;
}

export interface PersistedStore {
  version: 1;
  /** Chronological. */
  sessions: Session[];
}

/** A docking position on one of the three elliptical rings. */
export interface Slot {
  ring: number;
  deg: number;
  x: number;
  y: number;
  /** Connector origin — core edge for ring 0, nearest previous-ring slot otherwise. */
  px: number;
  py: number;
}

export interface ModuleKind {
  code: string;
  status: string;
  /** Single SVG path, viewBox -16 -16 32 32. */
  glyph: string;
}

/** A docked module, ready to render. */
export interface StationModule {
  id: string;
  /** CSS percentage strings, positioned against the 900x590 stage. */
  left: string;
  top: string;
  glyph: string;
  /** e.g. "SOLAR-01" */
  code: string;
  status: string;
  /** True for 1800ms after docking — drives the accent stroke and st-dock. */
  isNew: boolean;
}

/** Connector between a module and its parent. */
export interface Link {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
}

export interface Stats {
  /** All-time docked modules. */
  modules: number;
  /** All-time focus minutes. */
  focusMinutes: number;
  /** Completed cycles inside the current ISO week. */
  weekCompleted: number;
  /** Every session ever started, completed or aborted. */
  started: number;
  /** 0-100, completed / started. */
  completionPct: number;
  /** Exactly 7 entries, Mon..Sun, completed sessions per day this week. */
  dayCounts: number[];
}
