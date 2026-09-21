/**
 * SHARED CONTRACT — types.
 *
 * OWNED BY: the human / orchestrator. Agents MUST NOT edit this file.
 * If you need a change here, stop and report it instead of editing.
 *
 * Every module boundary in the app is expressed in this file. The logic
 * agents implement against it; the view agents render against it. Neither
 * side needs the other to exist in order to start.
 */

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export type Phase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export type Outcome = 'completed' | 'abandoned';

/** Reactive timer state. Recomputed each animation frame from `deadline`. */
export interface TimerState {
  phase: Phase;
  /** Milliseconds left in the current phase. 0 when idle. */
  remainingMs: number;
  /** Epoch ms when the current phase ends. `null` when idle. */
  deadline: number | null;
  /** 0..1 elapsed through the current phase. Drives scene accretion. */
  progress: number;
  /** Completed focus sessions in the current set of 4. Range 0..3. */
  setPosition: number;
  /** The intent text for the running (or just-finished) focus session. */
  label: string;
  /** True while a focus session is young enough to cancel for free. */
  inGracePeriod: boolean;
}

export interface TimerActions {
  /** Begins a focus phase. Ignored unless phase is 'idle'. */
  start(label?: string): void;
  /** Abandons the running focus phase. Shatters the protoplanet. */
  giveUp(): void;
  /** Ends a break early. No moon, no penalty. */
  skipBreak(): void;
}

export type TimerApi = TimerState & TimerActions;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface Session {
  /** uuid. Doubles as the deterministic render seed — never regenerate it. */
  id: string;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  /** '' when the user skipped the intent prompt. */
  label: string;
  outcome: Outcome;
  /** 0..3, incremented by completed short breaks. */
  moons: number;
  /** Awarded by a completed long break. */
  hasRing: boolean;
}

export interface Week {
  /** ISO week key, e.g. "2026-W39". */
  isoWeek: string;
  /** 0..360, from the fixed palette. Drives every colour in the scene. */
  baseHue: number;
  startedAt: number;
  sessions: Session[];
}

export interface Settings {
  sound: boolean;
  notifications: boolean;
}

export interface PersistedStore {
  version: 1;
  currentWeek: Week;
  /** Newest first, trimmed to the last 52 weeks. */
  archive: Week[];
  settings: Settings;
}

// ---------------------------------------------------------------------------
// Procedural generation
// ---------------------------------------------------------------------------

export type Surface = 'banded' | 'cratered' | 'smooth' | 'fault';

export interface MoonParams {
  orbitRadius: number;
  /** Radians per second. */
  orbitSpeed: number;
  radius: number;
  startAngle: number;
  inclination: number;
}

/**
 * Everything the scene needs to draw one planet. Fully derived from
 * `Session.id` + orbit index + week hue, so it is stable across reloads
 * and identical when replaying an archived week.
 */
export interface PlanetParams {
  id: string;
  /** Orbit slot, 0-based, in session order. */
  index: number;
  orbitRadius: number;
  /** Radians per second. Negative values are legal (retrograde). */
  orbitSpeed: number;
  /** Radians, roughly ±0.14. */
  inclination: number;
  startAngle: number;
  bodyRadius: number;
  /** Icosahedron detail level, 1 or 2. */
  detail: number;
  /** 0..360. */
  hue: number;
  surface: Surface;
  hasRing: boolean;
  moons: MoonParams[];
  /** Passed through for hover captions. */
  label: string;
  startedAt: number;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface Stats {
  sessionsThisWeek: number;
  sessionsAllTime: number;
  minutesThisWeek: number;
  minutesAllTime: number;
  /** Consecutive days, ending today, with at least one completed session. */
  streakDays: number;
  /** completed / (completed + abandoned). 0 when nothing has started. */
  completionRate: number;
  /** Exactly 7 entries, Monday..Sunday, completed sessions per day. */
  perDay: number[];
}
