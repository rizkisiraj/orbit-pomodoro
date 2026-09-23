/**
 * All audio, synthesized through Web Audio — no asset files, nothing to
 * license, works offline.
 *
 * Two families:
 *  - chimes, which mark a phase ending and are meant to be heard from across
 *    the room;
 *  - ticks, which are haptics. A tick should register as feedback and never as
 *    a sound you notice; they are ~40ms and roughly a tenth the gain.
 */
import { CHIME_BREAK_HZ } from '../constants';

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

let noiseBuffer: AudioBuffer | null = null;

/** Two seconds of white noise, filtered per-use into rumble. Cached because
 *  generating it is the expensive part; playing it is cheap. */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Rocket liftoff, played out into open space: a resonant-noise engine rumble
 * and a rising whoosh that pans across the stereo field like a doppler pass,
 * everything trailing into a cavernous delay, capped by a twinkle of distant
 * stars rather than a hard stop.
 */
function playLaunch(): void {
  const ctx = audioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Echo bus — a long, quiet feedback loop so every source trails off into
  // a cavern instead of stopping dead. That decay is what reads as "vast
  // empty space" rather than a room.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.32;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.42;
  const echoWet = ctx.createGain();
  echoWet.gain.value = 0.5;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(echoWet);
  echoWet.connect(ctx.destination);
  const send = (node: AudioNode) => node.connect(delay);

  // Ignition thump — a short, low sine punch at T+0.
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(90, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  thumpGain.gain.setValueAtTime(0.0001, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.8, t + 0.015);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  send(thumpGain);
  thump.start(t);
  thump.stop(t + 0.4);

  // Engine rumble — noise through a resonant bandpass, its center frequency
  // climbing as the "rocket" clears the pad. The resonance is what turns
  // plain noise into something metallic and sci-fi rather than just static.
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'bandpass';
  rumbleFilter.Q.value = 5;
  rumbleFilter.frequency.setValueAtTime(150, t);
  rumbleFilter.frequency.exponentialRampToValueAtTime(1800, t + 1.1);
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.0001, t);
  rumbleGain.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  noise.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  send(rumbleGain);
  noise.start(t);
  noise.stop(t + 1.3);

  // Whoosh — a sawtooth sweeping up in pitch as the rocket climbs, vibrato
  // giving it an energy-field waver, panning hard left-to-right like a
  // doppler pass overhead.
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweep.type = 'sawtooth';
  sweep.frequency.setValueAtTime(100, t + 0.05);
  sweep.frequency.exponentialRampToValueAtTime(1200, t + 0.95);
  sweepGain.gain.setValueAtTime(0.0001, t + 0.05);
  sweepGain.gain.exponentialRampToValueAtTime(0.25, t + 0.3);
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 6;
  vibratoDepth.gain.value = 15;
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(sweep.frequency);

  const sweepPan = ctx.createStereoPanner();
  sweepPan.pan.setValueAtTime(-0.9, t + 0.05);
  sweepPan.pan.linearRampToValueAtTime(0.9, t + 1.0);

  sweep.connect(sweepGain);
  sweepGain.connect(sweepPan);
  sweepPan.connect(ctx.destination);
  send(sweepPan);
  sweep.start(t + 0.05);
  sweep.stop(t + 1.05);
  vibrato.start(t + 0.05);
  vibrato.stop(t + 1.05);

  // Starlight tail — a handful of bright, randomly-panned blips scattered
  // after liftoff, like distant stars catching the light.
  const stars = [1046.5, 1318.5, 1568, 1975];
  stars.forEach((freq, i) => {
    const start = t + 0.85 + i * 0.13 + Math.random() * 0.05;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(ctx.destination);
    send(pan);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

export function playChime(kind: ChimeKind): void {
  if (kind === 'focusEnd') {
    playLaunch();
    return;
  }
  playSynthesizedChime();
}

function playSynthesizedChime(): void {
  const ctx = audioContext();
  if (!ctx) return;

  const base = CHIME_BREAK_HZ;
  const t = ctx.currentTime;

  [base, base * 1.5].forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    // exponentialRamp cannot reach zero, hence the 0.0001 floor.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.45 / (i + 1), t + 0.02);
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
