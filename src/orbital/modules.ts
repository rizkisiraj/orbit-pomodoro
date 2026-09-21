/**
 * Derives what the station renders from the list of completed sessions.
 * Pure: sessions in, geometry out. No React, no DOM.
 */
import { KINDS, pad2 } from './constants';
import { pctX, pctY, slotFor } from './slots';
import type { Link, ModuleKind, Session, StationModule } from './types';

/** The module type for position `index`, cycling through KINDS. */
export function kindFor(index: number): ModuleKind {
  return KINDS[index % KINDS.length];
}

/** e.g. "SOLAR-01", the suffix incrementing every full pass of the 8 types. */
export function codeFor(index: number): string {
  return `${kindFor(index).code}-${pad2(Math.floor(index / KINDS.length) + 1)}`;
}

export function modulesFor(completed: Session[], newestId: string | null): StationModule[] {
  return completed.map((session, i) => {
    const slot = slotFor(i);
    const kind = kindFor(i);
    return {
      id: session.id,
      left: pctX(slot.x),
      top: pctY(slot.y),
      glyph: kind.glyph,
      code: codeFor(i),
      status: kind.status,
      isNew: session.id === newestId,
    };
  });
}

/** One connector per docked module, parent point first. */
export function linksFor(completed: Session[]): Link[] {
  return completed.map((_, i) => {
    const slot = slotFor(i);
    return {
      x1: Math.round(slot.px),
      y1: Math.round(slot.py),
      x2: Math.round(slot.x),
      y2: Math.round(slot.y),
    };
  });
}
