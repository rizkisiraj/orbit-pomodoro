/**
 * Two-oscillator Web Audio chime — base frequency plus its 1.5x, sine,
 * gain ramped up over 20ms then exponentially down over ~1.3s. No asset files.
 */
import { CHIME_BREAK_HZ, CHIME_FOCUS_HZ } from './constants';

export type ChimeKind = 'focusEnd' | 'breakEnd';

let context: AudioContext | null = null;

/** Lazy — constructing an AudioContext before a user gesture is blocked. */
function audioContext(): AudioContext | null {
  try {
    context ??= new AudioContext();
    return context;
  } catch {
    return null;
  }
}

export function playChime(kind: ChimeKind): void {
  const ctx = audioContext();
  if (!ctx) return;

  const base = kind === 'focusEnd' ? CHIME_FOCUS_HZ : CHIME_BREAK_HZ;
  const t = ctx.currentTime;

  [base, base * 1.5].forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    // exponentialRamp cannot touch zero, hence the 0.0001 floor.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07 / (i + 1), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.4);
  });
}
