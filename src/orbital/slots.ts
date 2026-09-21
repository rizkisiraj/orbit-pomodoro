/**
 * The module lattice.
 *
 * Slots are emitted as opposite pairs within each ring (i, i+n/2, i+1, ...),
 * rings filling 0 -> 1 -> 2. Module k always takes slot k of this flattened
 * list, which is what keeps the station symmetrical at every count. Never
 * place modules randomly — see README §Module lattice, "the balance rule".
 */
import { CORE_R, RINGS, VH, VW } from './constants';
import type { Slot } from './types';

function buildSlots(): Slot[] {
  const slots: Slot[] = [];

  RINGS.forEach((ring, ri) => {
    const list: Slot[] = [];
    for (let i = 0; i < ring.n; i++) {
      const deg = ring.off + (360 / ring.n) * i;
      const rad = (deg * Math.PI) / 180;
      list.push({
        ring: ri,
        deg,
        x: Math.cos(rad) * ring.rx,
        y: Math.sin(rad) * ring.ry,
        px: 0,
        py: 0,
      });
    }

    // Opposite-pair ordering.
    const order: Slot[] = [];
    for (let i = 0; i < Math.ceil(ring.n / 2); i++) {
      order.push(list[i]);
      const opposite = list[i + ring.n / 2];
      if (opposite) order.push(opposite);
    }

    for (const slot of order) {
      if (ri === 0) {
        // Ring 0 connects to the core edge, along the slot's own bearing.
        const len = Math.hypot(slot.x, slot.y);
        slot.px = (slot.x / len) * CORE_R;
        slot.py = (slot.y / len) * CORE_R;
      } else {
        // Outer rings connect to the nearest slot by angle in the ring inside.
        let best: Slot | null = null;
        let bestDelta = Infinity;
        for (const parent of slots) {
          if (parent.ring !== ri - 1) continue;
          const delta = Math.abs((((parent.deg - slot.deg + 540) % 360) - 180));
          if (delta < bestDelta) {
            bestDelta = delta;
            best = parent;
          }
        }
        slot.px = best ? best.x : 0;
        slot.py = best ? best.y : 0;
      }
      slots.push(slot);
    }
  });

  return slots;
}

/** 36 slots: 6 + 12 + 18. Built once at module load. */
export const SLOTS: Slot[] = buildSlots();

/** Stage-relative percentage for an SVG x coordinate. */
export function pctX(x: number): string {
  return `${(((x + VW / 2) / VW) * 100).toFixed(3)}%`;
}

/** Stage-relative percentage for an SVG y coordinate. */
export function pctY(y: number): string {
  return `${(((y + VH / 2) / VH) * 100).toFixed(3)}%`;
}

/** The slot module `index` occupies, wrapping once the lattice is full. */
export function slotFor(index: number): Slot {
  return SLOTS[index % SLOTS.length];
}
