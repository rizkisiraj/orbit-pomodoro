import { describe, expect, test } from 'vitest';
import { buildOffset, codeFor, linksFor, modulesFor, nextSlotFor } from './modules';
import { SLOTS } from './slots';
import { RINGS } from '../constants';
import type { Session } from '../types';

const SIZE = RINGS.reduce((n, r) => n + r.n, 0);

function sessions(n: number): Session[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    startedAt: i * 1000,
    endedAt: i * 1000 + 500,
    durationMin: 25,
    label: '',
    outcome: 'completed' as const,
  }));
}

/** What actually broke: two cards absolutely positioned at the same point. */
function overlaps(list: { left: string; top: string }[]): boolean {
  const seen = new Set<string>();
  for (const m of list) {
    const key = `${m.left},${m.top}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

describe('the station renders one build at a time', () => {
  test('shows every module while the first build is filling', () => {
    expect(buildOffset(0)).toBe(0);
    expect(buildOffset(5)).toBe(0);
    expect(modulesFor(sessions(5), null)).toHaveLength(5);
  });

  test('shows the whole station on the module that completes a build', () => {
    // The payoff moment: a full lattice must still be fully on screen.
    expect(buildOffset(SIZE)).toBe(0);
    expect(modulesFor(sessions(SIZE), null)).toHaveLength(SIZE);
  });

  test('starts a fresh build on the module after a full station', () => {
    expect(buildOffset(SIZE + 1)).toBe(SIZE);
    const modules = modulesFor(sessions(SIZE + 1), null);
    expect(modules).toHaveLength(1);
    // Back at the first slot, not stacked on whatever was there before.
    expect(modules[0].left).toBe(modulesFor(sessions(1), null)[0].left);
    expect(modules[0].top).toBe(modulesFor(sessions(1), null)[0].top);
  });

  test('never stacks two modules on one slot', () => {
    // Regression: slotFor wraps at 36, so rendering all completed sessions put
    // module 37 back on slot 0 on top of module 1.
    for (const count of [SIZE - 1, SIZE, SIZE + 1, SIZE + 5, SIZE * 2, SIZE * 2 + 3, 100]) {
      expect(overlaps(modulesFor(sessions(count), null))).toBe(false);
    }
  });

  test('keeps module codes absolute so they never repeat across builds', () => {
    const first = modulesFor(sessions(1), null)[0];
    const afterWrap = modulesFor(sessions(SIZE + 1), null)[0];
    expect(afterWrap.code).not.toBe(first.code);
    // LogView prints codeFor(index) against the absolute index; the station
    // has to agree with it for the same session.
    expect(afterWrap.code).toBe(codeFor(SIZE));
  });

  test('draws one connector per rendered module', () => {
    for (const count of [0, 5, SIZE, SIZE + 1, 100]) {
      expect(linksFor(sessions(count))).toHaveLength(modulesFor(sessions(count), null).length);
    }
  });

  test('still flags the newest module after slicing', () => {
    const list = sessions(SIZE + 3);
    const modules = modulesFor(list, list[list.length - 1].id);
    expect(modules.filter((m) => m.isNew)).toHaveLength(1);
    expect(modules[modules.length - 1].isNew).toBe(true);
  });
});

describe('the next-dock indicator', () => {
  test('points at the slot the next module will take', () => {
    expect(nextSlotFor(0)).toBe(SLOTS[0]);
    expect(nextSlotFor(3)).toBe(SLOTS[3]);
  });

  test('returns to the first slot once a build is full', () => {
    // Regression: this used slotFor(completed.length), which past a full
    // station pointed at a slot that was already occupied.
    expect(nextSlotFor(SIZE)).toBe(SLOTS[0]);
    expect(nextSlotFor(SIZE + 1)).toBe(SLOTS[1]);
    expect(nextSlotFor(SIZE * 2)).toBe(SLOTS[0]);
  });
});
