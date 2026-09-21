/**
 * Pure phase-transition table and deadline math. No React, no I/O.
 *
 * Everything here is deliberately side-effect free so it can be tested
 * directly and reused by `useTimer` without duplicating the rules.
 */

import { GRACE_PERIOD_MS, MINUTE_MS, PHASE_MINUTES, SET_LENGTH } from '~/contract/constants';
import type { Phase } from '~/contract/types';

/** Full phase duration in ms (0 for idle). */
export function durationMsFor(phase: Phase): number {
  return PHASE_MINUTES[phase] * MINUTE_MS;
}

export interface PhaseTransition {
  phase: Phase;
  setPosition: number;
}

/**
 * What phase (and set position) follows the *completion* of `current`.
 * Only meaningful for 'focus' | 'shortBreak' | 'longBreak' — idle has no
 * natural successor, it only leaves via an explicit `start()`.
 */
export function nextPhase(current: Phase, setPosition: number): PhaseTransition {
  switch (current) {
    case 'focus': {
      const completed = setPosition + 1;
      return completed >= SET_LENGTH
        ? { phase: 'longBreak', setPosition: 0 }
        : { phase: 'shortBreak', setPosition: completed };
    }
    case 'shortBreak':
      return { phase: 'focus', setPosition };
    case 'longBreak':
      return { phase: 'focus', setPosition: 0 };
    case 'idle':
    default:
      return { phase: 'idle', setPosition };
  }
}

/** Milliseconds left until `deadline`, clamped to 0. 0 when there is no deadline. */
export function remainingMs(deadline: number | null, now: number): number {
  if (deadline === null) return 0;
  return Math.max(0, deadline - now);
}

/** 0..1 elapsed through `phase`, given its `deadline`. 0 for idle / no deadline. */
export function progressFor(phase: Phase, deadline: number | null, now: number): number {
  if (phase === 'idle' || deadline === null) return 0;
  const total = durationMsFor(phase);
  if (total <= 0) return 0;
  const elapsed = total - remainingMs(deadline, now);
  return Math.min(1, Math.max(0, elapsed / total));
}

/** The epoch ms a focus phase with this `deadline` must have started at. */
export function focusStartedAt(deadline: number): number {
  return deadline - durationMsFor('focus');
}

/** True while a running focus phase is still young enough to cancel for free. */
export function isInGracePeriod(phase: Phase, deadline: number | null, now: number): boolean {
  if (phase !== 'focus' || deadline === null) return false;
  return now - focusStartedAt(deadline) < GRACE_PERIOD_MS;
}

export interface DeadlineState {
  phase: Phase;
  deadline: number | null;
  setPosition: number;
}

/**
 * If `now` has passed `state.deadline`, returns the single next state
 * (phase + setPosition + a fresh deadline computed from `now`). Returns
 * `null` if nothing has expired yet.
 *
 * Deliberately advances exactly one phase per call, no matter how far past
 * the deadline `now` is (tab throttling, sleep, a huge system clock jump).
 * The new deadline is always in the future relative to `now`, so calling
 * this again with the same `now` returns `null` — callers get one
 * transition per stale deadline, never a burst of catch-up transitions.
 */
export function advanceIfExpired(state: DeadlineState, now: number): DeadlineState | null {
  if (state.phase === 'idle' || state.deadline === null) return null;
  if (now < state.deadline) return null;
  const { phase, setPosition } = nextPhase(state.phase, state.setPosition);
  return { phase, setPosition, deadline: now + durationMsFor(phase) };
}
