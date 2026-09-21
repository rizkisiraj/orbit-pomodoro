/**
 * Synthesized completion chime. Two-oscillator Web Audio blip with a short
 * decay envelope — no asset files, distinct tone per `ChimeKind`.
 *
 * The AudioContext is constructed lazily, on the first call, so it is
 * created inside a user gesture (Start / Give up / Skip break are all
 * click-driven) and never trips the browser's autoplay policy.
 */

import type { ChimeKind } from '~/contract/api';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

interface Tone {
  /** Root frequency, Hz. */
  root: number;
  /** Second oscillator frequency, Hz — an interval above the root. */
  fifth: number;
}

const TONES: Record<ChimeKind, Tone> = {
  // Focus end: a settled, resolved interval — the work is banked.
  focusEnd: { root: 523.25, fifth: 659.25 }, // C5, E5
  // Break end: a step down — softer, less consequential.
  breakEnd: { root: 392.0, fifth: 493.88 }, // G4, B4
};

const CHIME_DURATION_S = 0.55;

/** Plays a short synthesized blip. No-op if Web Audio is unavailable. */
export function playChime(kind: ChimeKind): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const { root, fifth } = TONES[kind];

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + CHIME_DURATION_S);
  gain.connect(ctx.destination);

  [root, fifth].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    const start = now + i * 0.04;
    osc.start(start);
    osc.stop(now + CHIME_DURATION_S);
  });
}
