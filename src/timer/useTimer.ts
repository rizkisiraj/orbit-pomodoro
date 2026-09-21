/**
 * The pomodoro phase machine. Deadline-driven: `remainingMs` is always
 * `deadline - Date.now()`, never an accumulated tick count, so it cannot
 * drift under tab throttling, sleep, or backgrounding.
 *
 * Structure follows TanStack Query's hook ergonomics: one hook returns
 * reactive state plus a small set of stable action callbacks. No context,
 * no provider.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FOCUS_MIN } from '~/contract/constants';
import type { Phase, Session, TimerApi } from '~/contract/types';
import {
  advanceIfExpired,
  durationMsFor,
  isInGracePeriod,
  nextPhase,
  progressFor,
  remainingMs,
} from './phases';

const STORAGE_KEY = 'orbit.timer.v1';

interface CoreState {
  phase: Phase;
  deadline: number | null;
  setPosition: number;
  label: string;
  /** The in-progress (or just-resolved) focus session's id, if any. */
  sessionId: string | null;
  /** Epoch ms the current focus phase started at, if any. */
  startedAt: number | null;
}

const IDLE_STATE: CoreState = {
  phase: 'idle',
  deadline: null,
  setPosition: 0,
  label: '',
  sessionId: null,
  startedAt: null,
};

/**
 * Everything that can happen to a phase, in enough detail for a caller to
 * build a `Session` and decide what to do with it (recordSession, award a
 * moon/ring, play a chime, fire a notification).
 *
 * This is NOT part of the frozen `TimerApi` contract — `TimerState` alone
 * cannot distinguish "break completed naturally" from "break skipped" (both
 * just look like phase becoming 'focus' to an outside observer), and it
 * carries no session id/timestamps for `recordSession`. Exposing it as an
 * optional callback keeps `useTimer()` callable with zero arguments (so it
 * still satisfies `UseTimer = () => TimerApi` structurally) while giving
 * integration what it needs. See the final report for how to wire this up.
 */
export type PhaseEndEvent =
  | { type: 'focusCompleted'; session: Session }
  | { type: 'focusAbandoned'; session: Session }
  | { type: 'focusCancelled' }
  | { type: 'shortBreakCompleted' }
  | { type: 'shortBreakSkipped' }
  | { type: 'longBreakCompleted' }
  | { type: 'longBreakSkipped' };

export interface UseTimerOptions {
  onPhaseEnd?: (event: PhaseEndEvent) => void;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildSession(current: CoreState, now: number, outcome: Session['outcome']): Session | null {
  if (!current.sessionId || current.startedAt === null) return null;
  return {
    id: current.sessionId,
    startedAt: current.startedAt,
    endedAt: now,
    durationMin: FOCUS_MIN,
    label: current.label,
    outcome,
    moons: 0,
    hasRing: false,
  };
}

function loadPersisted(): CoreState {
  if (typeof localStorage === 'undefined') return IDLE_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE_STATE;
    const parsed = JSON.parse(raw) as Partial<CoreState>;
    if (
      typeof parsed.phase !== 'string' ||
      typeof parsed.setPosition !== 'number' ||
      typeof parsed.label !== 'string'
    ) {
      return IDLE_STATE;
    }
    return {
      phase: parsed.phase as Phase,
      deadline: typeof parsed.deadline === 'number' ? parsed.deadline : null,
      setPosition: parsed.setPosition,
      label: parsed.label,
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
    };
  } catch {
    return IDLE_STATE;
  }
}

function persist(state: CoreState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — the machine keeps
    // working in-memory, it just won't survive a reload.
  }
}

/**
 * Resolves state loaded from a previous tab session. A persisted 'focus'
 * phase always resolves here — never silently completes on load, since we
 * cannot trust an unattended tab's clock: it's a free cancel if still
 * inside grace, otherwise an abandon.
 */
function resolveOnLoad(
  state: CoreState,
  now: number,
  emit: (event: PhaseEndEvent) => void,
): CoreState {
  if (state.phase !== 'focus') return state;
  if (state.deadline !== null && isInGracePeriod('focus', state.deadline, now)) {
    emit({ type: 'focusCancelled' });
  } else {
    const session = buildSession(state, now, 'abandoned');
    if (session) emit({ type: 'focusAbandoned', session });
  }
  return { ...IDLE_STATE, setPosition: state.setPosition };
}

export function useTimer(options: UseTimerOptions = {}): TimerApi {
  const onPhaseEndRef = useRef(options.onPhaseEnd);
  onPhaseEndRef.current = options.onPhaseEnd;
  const emit = useCallback((event: PhaseEndEvent) => onPhaseEndRef.current?.(event), []);

  const [core, setCore] = useState<CoreState>(() => loadPersisted());
  const coreRef = useRef(core);
  coreRef.current = core;

  const [, forceRender] = useState(0);

  // Resolve any stale 'focus' state left over from a previous tab session.
  // Done in an effect (not the lazy initializer) so firing `onPhaseEnd` is a
  // proper side effect, not something happening during render.
  const resolvedOnLoad = useRef(false);
  useEffect(() => {
    if (resolvedOnLoad.current) return;
    resolvedOnLoad.current = true;
    const resolved = resolveOnLoad(coreRef.current, Date.now(), emit);
    if (resolved !== coreRef.current) {
      coreRef.current = resolved;
      setCore(resolved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persist(core);
  }, [core]);

  const applyExpiry = useCallback(
    (now: number) => {
      const current = coreRef.current;
      const advanced = advanceIfExpired(
        { phase: current.phase, deadline: current.deadline, setPosition: current.setPosition },
        now,
      );
      if (!advanced) return;

      if (current.phase === 'focus') {
        const session = buildSession(current, now, 'completed');
        if (session) emit({ type: 'focusCompleted', session });
      } else if (current.phase === 'shortBreak') {
        emit({ type: 'shortBreakCompleted' });
      } else if (current.phase === 'longBreak') {
        emit({ type: 'longBreakCompleted' });
      }

      const next: CoreState =
        advanced.phase === 'focus'
          ? {
              phase: 'focus',
              deadline: advanced.deadline,
              setPosition: advanced.setPosition,
              label: '',
              sessionId: newSessionId(),
              startedAt: now,
            }
          : {
              ...current,
              phase: advanced.phase,
              deadline: advanced.deadline,
              setPosition: advanced.setPosition,
            };

      coreRef.current = next;
      setCore(next);
    },
    [emit],
  );

  // requestAnimationFrame loop drives the display and catches expiry.
  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') return;
    let raf = 0;
    const tick = () => {
      applyExpiry(Date.now());
      forceRender((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyExpiry]);

  // Backgrounding/throttling can pause rAF; recompute immediately on return.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (!document.hidden) applyExpiry(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [applyExpiry]);

  const start = useCallback((label = '') => {
    const current = coreRef.current;
    if (current.phase !== 'idle') return;
    const now = Date.now();
    const next: CoreState = {
      phase: 'focus',
      deadline: now + durationMsFor('focus'),
      setPosition: current.setPosition,
      label,
      sessionId: newSessionId(),
      startedAt: now,
    };
    coreRef.current = next;
    setCore(next);
  }, []);

  const giveUp = useCallback(() => {
    const current = coreRef.current;
    if (current.phase !== 'focus') return;
    const now = Date.now();
    const grace = current.deadline !== null && isInGracePeriod('focus', current.deadline, now);
    if (grace) {
      emit({ type: 'focusCancelled' });
    } else {
      const session = buildSession(current, now, 'abandoned');
      if (session) emit({ type: 'focusAbandoned', session });
    }
    const next: CoreState = { ...IDLE_STATE, setPosition: current.setPosition };
    coreRef.current = next;
    setCore(next);
  }, [emit]);

  const skipBreak = useCallback(() => {
    const current = coreRef.current;
    if (current.phase !== 'shortBreak' && current.phase !== 'longBreak') return;
    const now = Date.now();
    emit({ type: current.phase === 'shortBreak' ? 'shortBreakSkipped' : 'longBreakSkipped' });
    const { phase, setPosition } = nextPhase(current.phase, current.setPosition);
    const next: CoreState = {
      phase,
      deadline: now + durationMsFor(phase),
      setPosition,
      label: '',
      sessionId: newSessionId(),
      startedAt: now,
    };
    coreRef.current = next;
    setCore(next);
  }, [emit]);

  const now = Date.now();
  return {
    phase: core.phase,
    remainingMs: remainingMs(core.deadline, now),
    deadline: core.deadline,
    progress: progressFor(core.phase, core.deadline, now),
    setPosition: core.setPosition,
    label: core.label,
    inGracePeriod: isInGracePeriod(core.phase, core.deadline, now),
    start,
    giveUp,
    skipBreak,
  };
}
