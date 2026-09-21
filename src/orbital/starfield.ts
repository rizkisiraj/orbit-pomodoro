/**
 * Deterministic starfield. Generated once from a fixed seed so the sky is
 * identical on every load — it is scenery, not data. Static, no twinkle.
 */
import { STARFIELD_COUNT, STARFIELD_SEED } from './constants';
import type { Star } from './types';

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(): Star[] {
  const rnd = mulberry32(STARFIELD_SEED);
  const stars: Star[] = [];
  for (let i = 0; i < STARFIELD_COUNT; i++) {
    stars.push({
      x: Math.round((rnd() - 0.5) * 870),
      y: Math.round((rnd() - 0.5) * 565),
      r: rnd() > 0.8 ? 1.7 : 1,
      o: Number((0.16 + rnd() * 0.32).toFixed(2)),
    });
  }
  return stars;
}

export const STARS: Star[] = buildStars();
