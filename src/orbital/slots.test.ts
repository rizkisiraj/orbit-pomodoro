import { describe, expect, test } from 'vitest';
import { SLOTS, pctX, pctY, slotFor } from './slots';
import { CORE_R, RINGS } from './constants';

describe('the module lattice', () => {
  test('has one slot per ring position', () => {
    expect(SLOTS).toHaveLength(RINGS.reduce((n, r) => n + r.n, 0));
    expect(SLOTS).toHaveLength(36);
  });

  test('fills rings in order, innermost first', () => {
    const rings = SLOTS.map((s) => s.ring);
    expect(rings.slice(0, 6).every((r) => r === 0)).toBe(true);
    expect(rings.slice(6, 18).every((r) => r === 1)).toBe(true);
    expect(rings.slice(18).every((r) => r === 2)).toBe(true);
  });

  test('emits opposite pairs so the station stays balanced', () => {
    // Ring 0 has 6 slots at 60 degrees apart; consecutive emitted slots must
    // sit 180 degrees apart, which is what keeps any count symmetrical.
    for (let i = 0; i < 6; i += 2) {
      const delta = Math.abs(SLOTS[i].deg - SLOTS[i + 1].deg);
      expect(delta).toBeCloseTo(180, 6);
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
    expect(slotFor(36)).toBe(SLOTS[0]);
    expect(slotFor(37)).toBe(SLOTS[1]);
  });

  test('maps the origin to the centre of the stage', () => {
    expect(pctX(0)).toBe('50.000%');
    expect(pctY(0)).toBe('50.000%');
  });
});
