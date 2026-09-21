import { FOCUS_MIN, MINUTE_MS } from '../contract/constants';
import type { TimerApi } from '../contract/api';

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export interface TimerProps {
  timer: TimerApi;
}

/**
 * The readout. Tabular-figure mono, thin weight, wide tracking — the only
 * large type on screen. Idle shows the full focus duration rather than 0:00
 * (PRD §5.1).
 */
export function Timer({ timer }: TimerProps) {
  const displayMs = timer.phase === 'idle' ? FOCUS_MIN * MINUTE_MS : timer.remainingMs;

  return (
    <div
      className="select-none font-mono font-thin tabular-nums tracking-[0.08em] text-ink"
      style={{ fontSize: 'clamp(3rem, 13vw, 6.5rem)', fontVariantNumeric: 'tabular-nums' }}
      role="timer"
      aria-live="off"
      aria-label={`${formatMs(displayMs)} remaining`}
    >
      {formatMs(displayMs)}
    </div>
  );
}
