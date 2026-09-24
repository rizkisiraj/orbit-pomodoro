import { describe, expect, test } from 'vitest';
import { SLOTS, pctX, pctY, slotFor } from './slots';
import { CORE_R, RINGS } from '../constants';

// Ring sizes are a design dial (6/12/18 -> 4/8/12 so far), so everything here
// is expressed against RINGS rather than the counts it happens to produce.
const SIZE = RINGS.reduce((n, r) => n + r.n, 0);

describe('the module lattice', () => {
  test('has one slot per ring position', () => {
    expect(SLOTS).toHaveLength(SIZE);
  });

  test('fills rings in order, innermost first', () => {
    const rings = SLOTS.map((s) => s.ring);
    let from = 0;
    RINGS.forEach((ring, ri) => {
      expect(rings.slice(from, from + ring.n).every((r) => r === ri)).toBe(true);
      from += ring.n;
    });
    expect(from).toBe(SIZE);
  });

  test('emits opposite pairs so the station stays balanced', () => {
    // Consecutive emitted slots sit 180 degrees apart, which is what keeps any
    // count symmetrical. Every ring has an even slot count, so this holds
    // throughout the lattice, not just the inner ring.
    let from = 0;
    for (const ring of RINGS) {
      for (let i = from; i < from + ring.n; i += 2) {
        const delta = Math.abs(SLOTS[i].deg - SLOTS[i + 1].deg);
        expect(delta).toBeCloseTo(180, 6);
      }
      from += ring.n;
    }
  });

  test('ring 0 connects to the core edge', () => {
    for (const slot of SLOTS.filter((s) => s.ring === 0)) {
      expect(Math.hypot(slot.px, slot.py)).toBeCloseTo(CORE_R, 6);
    }
  });

  test('outer rings connect to a slot in the ring inside them', () => {
    const inner = new Map<string, true>();
    for (const s of SLOTS) inner.set(`${s.x.toFixed(4)},${s.y.toFixed(4)}`, true);
    for (const slot of SLOTS.filter((s) => s.ring > 0)) {
      expect(inner.has(`${slot.px.toFixed(4)},${slot.py.toFixed(4)}`)).toBe(true);
    }
  });

  test('module positions are stable and wrap past a full lattice', () => {
    expect(slotFor(0)).toBe(SLOTS[0]);
    expect(slotFor(SIZE)).toBe(SLOTS[0]);
    expect(slotFor(SIZE + 1)).toBe(SLOTS[1]);
  });

  test('maps the origin to the centre of the stage', () => {
    expect(pctX(0)).toBe('50.000%');
    expect(pctY(0)).toBe('50.000%');
  });
});
