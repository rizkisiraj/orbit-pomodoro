/**
 * The construction cycle: idle -> focus -> recovery -> idle.
 *
 * Timer correctness: remaining time is always derived from a stored `deadline`
 * timestamp against Date.now(), never from accumulated ticks. The interval only
 * drives repaints, so tab throttling and sleep cannot make the clock drift. A
 * visibilitychange handler recomputes immediately on refocus.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { playChime, setSoundEnabled } from './sound';
import { DOCK_HIGHLIGHT_MS, FOCUS_MIN, GRACE_S, SET_LENGTH, TICK_MS, durationFor } from './constants';
import { notify, requestNotificationPermission } from './notify';
import { completedOf, useStore } from './store';
import type { Phase, Session } from './types';

export type StatusMessage =
  | ''
  | 'CONSTRUCTION ACTIVE'
  | 'RECOVERY CYCLE'
  | 'MODULE ONLINE'
  | 'SYSTEMS NOMINAL'
  | 'CONSTRUCTION ABORTED'
  | 'RECOVERY SKIPPED';

export interface StationOptions {
  /** Runs 25 minutes in 25 seconds. Dev affordance, keep behind a flag. */
  demo?: boolean;
  sound?: boolean;
  notifications?: boolean;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function useStation({
  demo = false,
  sound = true,
  notifications = true,
}: StationOptions = {}) {
  const sessions = useStore((s) => s.sessions);
  const addSession = useStore((s) => s.addSession);

  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(() => durationFor('focus', demo));
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<StatusMessage>('');
  const [newestId, setNewestId] = useState<string | null>(null);
  // Cycle position is a visible HUD readout, so it is state, not a ref.
  const [cycle, setCycle] = useState(() => completedOf(sessions).length % SET_LENGTH);

  const deadlineRef = useRef(0);
  const phaseStartRef = useRef(0);
  const askedRef = useRef(false);
  const dockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Mirrors of state that the interval and event handlers read. Synced in an
   * effect rather than during render — assigning refs while rendering can
   * leave them stale under concurrent rendering. Both consumers (the 250ms
   * poll and user events) run after effects have flushed, so they always see
   * current values.
   */
  const phaseRef = useRef<Phase>('idle');
  const labelRef = useRef('');
  const cycleRef = useRef(cycle);
  useEffect(() => {
    phaseRef.current = phase;
    labelRef.current = label;
    cycleRef.current = cycle;
  }, [phase, label, cycle]);

  // The UI ticks are fired straight from the buttons, so the mute setting has
  // to live in the sound module for both to honour one switch.
  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  const begin = useCallback(
    (next: Exclude<Phase, 'idle'>) => {
      const seconds = durationFor(next, demo);
      deadlineRef.current = Date.now() + seconds * 1000;
      phaseStartRef.current = Date.now();
      setPhase(next);
      setRemaining(seconds);
      setStatus(next === 'focus' ? 'CONSTRUCTION ACTIVE' : 'RECOVERY CYCLE');
    },
    [demo],
  );

  const goIdle = useCallback(
    (message: StatusMessage) => {
      deadlineRef.current = 0;
      setPhase('idle');
      setRemaining(durationFor('focus', demo));
      setStatus(message);
    },
    [demo],
  );

  const complete = useCallback(() => {
    if (phaseRef.current === 'focus') {
      if (sound) playChime('focusEnd');
      if (notifications) notify('Module online', 'A module has docked to the station.');

      // Guard against a remount losing phaseStart: derive it from the duration
      // rather than writing a non-finite timestamp into storage.
      const startedAt = Number.isFinite(phaseStartRef.current) && phaseStartRef.current > 0
        ? phaseStartRef.current
        : Date.now() - durationFor('focus', demo) * 1000;

      const session: Session = {
        id: newId(),
        startedAt,
        endedAt: Date.now(),
        durationMin: FOCUS_MIN,
        label: labelRef.current,
        outcome: 'completed',
      };
      addSession(session);

      setNewestId(session.id);
      if (dockTimeout.current) clearTimeout(dockTimeout.current);
      dockTimeout.current = setTimeout(() => setNewestId(null), DOCK_HIGHLIGHT_MS);

      const nextCycle = (cycleRef.current + 1) % SET_LENGTH;
      cycleRef.current = nextCycle;
      setCycle(nextCycle);
      setLabel('');
      setStatus('MODULE ONLINE');
      // Every fourth completed cycle earns the long recovery.
      begin(nextCycle === 0 ? 'long' : 'break');
      return;
    }

    if (sound) playChime('breakEnd');
    if (notifications) notify('Recovery complete', 'Ready for the next cycle.');
    goIdle('SYSTEMS NOMINAL');
  }, [addSession, begin, demo, goIdle, notifications, sound]);

  // Deadline poll. Cheap, and never the source of truth for elapsed time.
  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current === 'idle') return;
      const left = (deadlineRef.current - Date.now()) / 1000;
      if (left <= 0) {
        complete();
        return;
      }
      setRemaining((prev) => (Math.abs(left - prev) > 0.4 ? left : prev));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [complete]);

  // A backgrounded tab can miss every tick; recompute the moment it returns.
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden || phaseRef.current === 'idle') return;
      const left = (deadlineRef.current - Date.now()) / 1000;
      if (left <= 0) complete();
      else setRemaining(left);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [complete]);

  useEffect(
    () => () => {
      if (dockTimeout.current) clearTimeout(dockTimeout.current);
    },
    [],
  );

  const start = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    // Permission is requested on first start, never on page load.
    if (notifications && !askedRef.current) {
      askedRef.current = true;
      void requestNotificationPermission();
    }
    begin('focus');
  }, [begin, notifications]);

  const abort = useCallback(() => {
    if (phaseRef.current !== 'focus') return;
    const startedAt = Number.isFinite(phaseStartRef.current) ? phaseStartRef.current : Date.now();
    const elapsed = (Date.now() - startedAt) / 1000;

    // Under the grace period it is a free cancel: nothing recorded, nothing lost.
    if (elapsed >= GRACE_S * (demo ? 1 / 60 : 1)) {
      addSession({
        id: newId(),
        startedAt,
        endedAt: Date.now(),
        durationMin: FOCUS_MIN,
        label: labelRef.current,
        outcome: 'aborted',
      });
    }
    goIdle('CONSTRUCTION ABORTED');
  }, [addSession, demo, goIdle]);

  const skip = useCallback(() => {
    if (phaseRef.current !== 'break' && phaseRef.current !== 'long') return;
    goIdle('RECOVERY SKIPPED');
  }, [goIdle]);

  const total = durationFor(phase === 'idle' ? 'focus' : phase, demo);
  const progress = phase === 'idle' ? 0 : Math.min(1, 1 - remaining / total);

  return {
    sessions,
    completed: completedOf(sessions),
    phase,
    remaining,
    progress,
    label,
    setLabel,
    status,
    newestId,
    cycle,
    start,
    abort,
    skip,
  };
}
