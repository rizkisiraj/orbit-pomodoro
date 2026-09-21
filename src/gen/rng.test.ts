import { describe, expect, it } from 'vitest';
import { mulberry32, seedFrom } from './rng';

describe('seedFrom + mulberry32', () => {
  it('is deterministic for the same string', () => {
    const a = mulberry32(seedFrom('session-abc'));
    const b = mulberry32(seedFrom('session-abc'));
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different strings', () => {
    const a = mulberry32(seedFrom('session-abc'));
    const b = mulberry32(seedFrom('session-xyz'));
    expect(a()).not.toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(seedFrom('range-check'));
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
