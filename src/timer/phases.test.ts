import { describe, expect, it } from 'vitest';
import {
  FOCUS_MIN,
  GRACE_PERIOD_MS,
  LONG_BREAK_MIN,
  MINUTE_MS,
  SET_LENGTH,
  SHORT_BREAK_MIN,
} from '~/contract/constants';
import {
  advanceIfExpired,
  durationMsFor,
  isInGracePeriod,
  nextPhase,
  progressFor,
  remainingMs,
  type DeadlineState,
} from './phases';

describe('durationMsFor', () => {
  it('returns the right duration per phase', () => {
    expect(durationMsFor('idle')).toBe(0);
    expect(durationMsFor('focus')).toBe(FOCUS_MIN * MINUTE_MS);
    expect(durationMsFor('shortBreak')).toBe(SHORT_BREAK_MIN * MINUTE_MS);
    expect(durationMsFor('longBreak')).toBe(LONG_BREAK_MIN * MINUTE_MS);
  });
});

describe('nextPhase', () => {
  it('sends focus to shortBreak and increments setPosition, except on the 4th', () => {
    expect(nextPhase('focus', 0)).toEqual({ phase: 'shortBreak', setPosition: 1 });
    expect(nextPhase('focus', 1)).toEqual({ phase: 'shortBreak', setPosition: 2 });
    expect(nextPhase('focus', 2)).toEqual({ phase: 'shortBreak', setPosition: 3 });
  });

  it('sends the 4th completed focus to a longBreak and resets setPosition to 0', () => {
    expect(nextPhase('focus', SET_LENGTH - 1)).toEqual({ phase: 'longBreak', setPosition: 0 });
  });

  it('sends shortBreak back to focus, keeping setPosition', () => {
    expect(nextPhase('shortBreak', 2)).toEqual({ phase: 'focus', setPosition: 2 });
  });

  it('sends longBreak back to focus with setPosition reset to 0', () => {
    expect(nextPhase('longBreak', 0)).toEqual({ phase: 'focus', setPosition: 0 });
  });
});

describe('remainingMs / progressFor', () => {
  it('remainingMs is 0 with no deadline and clamps at 0 in the past', () => {
    expect(remainingMs(null, 1000)).toBe(0);
    expect(remainingMs(500, 1000)).toBe(0);
    expect(remainingMs(1500, 1000)).toBe(500);
  });

  it('progressFor is 0 for idle regardless of deadline', () => {
    expect(progressFor('idle', 1500, 1000)).toBe(0);
  });

  it('progressFor tracks elapsed fraction of the phase duration', () => {
    const total = durationMsFor('focus');
    const start = 0;
    const deadline = start + total;
    expect(progressFor('focus', deadline, start)).toBe(0);
    expect(progressFor('focus', deadline, start + total / 2)).toBeCloseTo(0.5);
    expect(progressFor('focus', deadline, deadline)).toBe(1);
    // Never exceeds 1 even past the deadline.
    expect(progressFor('focus', deadline, deadline + 10_000)).toBe(1);
  });
});

describe('isInGracePeriod', () => {
  const deadline = 1_000_000;
  const startedAt = deadline - durationMsFor('focus');

  it('is true just after a focus phase starts', () => {
    expect(isInGracePeriod('focus', deadline, startedAt + 1000)).toBe(true);
  });

  it('is false once GRACE_PERIOD_MS has elapsed', () => {
    expect(isInGracePeriod('focus', deadline, startedAt + GRACE_PERIOD_MS)).toBe(false);
    expect(isInGracePeriod('focus', deadline, startedAt + GRACE_PERIOD_MS - 1)).toBe(true);
  });

  it('is always false outside of focus', () => {
    expect(isInGracePeriod('shortBreak', deadline, startedAt)).toBe(false);
    expect(isInGracePeriod('idle', null, startedAt)).toBe(false);
  });
});

describe('advanceIfExpired — deadline correctness', () => {
  it('does nothing before the deadline', () => {
    const state = { phase: 'focus' as const, deadline: 10_000, setPosition: 0 };
    expect(advanceIfExpired(state, 9_999)).toBeNull();
  });

  it('does nothing while idle', () => {
    expect(advanceIfExpired({ phase: 'idle', deadline: null, setPosition: 0 }, 9_999_999)).toBeNull();
  });

  it('advances exactly one phase the instant the deadline passes', () => {
    const state = { phase: 'focus' as const, deadline: 10_000, setPosition: 0 };
    const advanced = advanceIfExpired(state, 10_000);
    expect(advanced).toEqual({
      phase: 'shortBreak',
      setPosition: 1,
      deadline: 10_000 + durationMsFor('shortBreak'),
    });
  });

  it('clock-jump: a huge jump past the deadline still fires exactly one transition', () => {
    const state = { phase: 'focus' as const, deadline: 10_000, setPosition: 0 };
    const farFuture = 10_000 + 1000 * durationMsFor('longBreak'); // absurdly far past
    const advanced = advanceIfExpired(state, farFuture);
    expect(advanced).not.toBeNull();
    expect(advanced!.phase).toBe('shortBreak');

    // Re-running with the SAME `now` against the freshly advanced state must
    // be a no-op: the new deadline is derived from `now`, so it is always in
    // the future relative to it. This is what prevents a burst of transitions
    // when a tab wakes up long after its deadline passed.
    const second = advanceIfExpired(advanced!, farFuture);
    expect(second).toBeNull();
  });

  it('walks a full 25/5/25/5/25/5/25/15 cycle one expiry at a time', () => {
    let state: DeadlineState = { phase: 'focus', deadline: 0, setPosition: 0 };
    const seen: Array<{ phase: string; setPosition: number }> = [];
    let now = 0;
    for (let i = 0; i < 8; i++) {
      now = state.deadline!;
      const advanced = advanceIfExpired(state, now)!;
      seen.push({ phase: advanced.phase, setPosition: advanced.setPosition });
      state = advanced;
    }
    expect(seen.map((s) => s.phase)).toEqual([
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'longBreak',
      'focus',
    ]);
    expect(seen[6]).toEqual({ phase: 'longBreak', setPosition: 0 });
    expect(seen[7]).toEqual({ phase: 'focus', setPosition: 0 });
  });
});
