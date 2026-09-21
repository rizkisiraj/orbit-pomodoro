import type { TimerApi } from '../contract/api';

export interface ControlsProps {
  timer: TimerApi;
  /** Current intent draft, passed through to `start()` from the idle state. */
  pendingLabel?: string;
}

/**
 * Start / Give up / Skip break. Only the one legal action for the current
 * phase renders. `give up` is a plain text link — never button chrome —
 * because quitting should not look like a feature. During the grace period
 * it reads "cancel" instead, since it costs nothing yet.
 */
export function Controls({ timer, pendingLabel }: ControlsProps) {
  if (timer.phase === 'idle') {
    return (
      <button
        type="button"
        onClick={() => timer.start(pendingLabel)}
        className="rounded-full border border-accent px-8 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.2em] text-ink transition-colors duration-300 ease-orbit hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Start
      </button>
    );
  }

  if (timer.phase === 'focus') {
    return (
      <button
        type="button"
        onClick={() => timer.giveUp()}
        className="bg-transparent p-2 font-sans text-xs text-dim underline decoration-faint underline-offset-4 transition-colors duration-300 ease-orbit hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {timer.inGracePeriod ? 'cancel' : 'give up'}
      </button>
    );
  }

  // shortBreak / longBreak
  return (
    <button
      type="button"
      onClick={() => timer.skipBreak()}
      className="bg-transparent p-2 font-sans text-xs text-dim underline decoration-faint underline-offset-4 transition-colors duration-300 ease-orbit hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      skip break
    </button>
  );
}
