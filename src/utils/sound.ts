/**
 * All audio, synthesized through Web Audio — no asset files, nothing to
 * license, works offline (README §Assets: "None").
 *
 * Two families:
 *  - chimes, which mark a phase ending and are meant to be heard from across
 *    the room;
 *  - ticks, which are haptics. A tick should register as feedback and never as
 *    a sound you notice; they are ~40ms and roughly a tenth the gain.
 */
import { CHIME_BREAK_HZ, CHIME_FOCUS_HZ } from '../constants';

export type ChimeKind = 'focusEnd' | 'breakEnd';

/** `press` is the primary action; `soft` is everything else. */
export type TickKind = 'press' | 'soft';

let context: AudioContext | null = null;
let enabled = true;

/** Single source of truth for muting, so every caller honours one setting. */
export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Lazy: constructing an AudioContext before a user gesture is blocked, and a
 * suspended context stays silent, so resume on the first sound we play.
 */
function audioContext(): AudioContext | null {
  if (!enabled) return null;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
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
    // exponentialRamp cannot reach zero, hence the 0.0001 floor.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07 / (i + 1), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.4);
  });
}

const TICKS: Record<TickKind, { hz: number; gain: number; ms: number }> = {
  // A short downward blip — reads as a switch closing rather than a beep.
  press: { hz: 660, gain: 0.05, ms: 60 },
  soft: { hz: 440, gain: 0.03, ms: 40 },
};

export function playTick(kind: TickKind = 'soft'): void {
  const ctx = audioContext();
  if (!ctx) return;

  const { hz, gain: peak, ms } = TICKS[kind];
  const t = ctx.currentTime;
  const dur = ms / 1000;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  // Triangle rather than sine: a touch more edge, so it cuts through at a low
  // volume without needing to be louder.
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(hz, t);
  osc.frequency.exponentialRampToValueAtTime(hz * 0.7, t + dur);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
