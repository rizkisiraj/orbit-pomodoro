/**
 * Seeded PRNG utilities. Pure, dependency-free, no React/Three imports.
 *
 * `seedFrom` turns an arbitrary string (a session id) into a 32-bit seed
 * (xmur3-style string hash). `mulberry32` turns that seed into a fast,
 * deterministic 0..1 number generator. Together: same id -> same sequence
 * of numbers, forever.
 */

import type { Mulberry32, SeedFrom } from '~/contract/api';

/** xmur3-style string hash -> 32-bit unsigned seed. */
export const seedFrom: SeedFrom = (text) => {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
};

/** Mulberry32: seed -> generator of deterministic numbers in [0, 1). */
export const mulberry32: Mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
