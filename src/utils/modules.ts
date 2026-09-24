/**
 * Derives what the station renders from the list of completed sessions.
 * Pure: sessions in, geometry out. No React, no DOM.
 */
import { KINDS, pad2 } from '../constants';
import { progressFor } from './milestones';
import { pctX, pctY, slotFor } from './slots';
import type { Link, ModuleKind, Session, Slot, StationModule } from '../types';

/** The module type for position `index`, cycling through KINDS. */
export function kindFor(index: number): ModuleKind {
  return KINDS[index % KINDS.length];
}

/** e.g. "SOLAR-01", the suffix incrementing every full pass of the 8 types. */
export function codeFor(index: number): string {
  return `${kindFor(index).code}-${pad2(Math.floor(index / KINDS.length) + 1)}`;
}

/**
 * How many modules were docked before the build currently on screen.
 *
 * The lattice only has 36 slots, so rendering every completed session would
 * put module 37 back on slot 0, stacked on top of the first one. A full
 * station is the end of a build, not the end of the station.
 */
export function buildOffset(count: number): number {
  return count - progressFor(count).inStation;
}

export function modulesFor(completed: Session[], newestId: string | null): StationModule[] {
  const offset = buildOffset(completed.length);
  return completed.slice(offset).map((session, i) => {
    // Slot is build-relative, so each build lays out from the core outwards
    // again. Kind and code stay absolute: a module's identity never repeats,
    // and it keeps matching what LogView prints for the same session.
    const slot = slotFor(i);
    const kind = kindFor(offset + i);
    return {
      id: session.id,
      left: pctX(slot.x),
      top: pctY(slot.y),
      glyph: kind.glyph,
      code: codeFor(offset + i),
      status: kind.status,
      isNew: session.id === newestId,
    };
  });
}

/** One connector per docked module, parent point first. Same slice as `modulesFor`. */
export function linksFor(completed: Session[]): Link[] {
  return completed.slice(buildOffset(completed.length)).map((_, i) => {
    const slot = slotFor(i);
    return {
      x1: Math.round(slot.px),
      y1: Math.round(slot.py),
      x2: Math.round(slot.x),
      y2: Math.round(slot.y),
    };
  });
}

/**
 * The slot the next module will dock into, within the current build. At a
 * full build `inStation` is 36 and slotFor wraps it back to slot 0 — which is
 * exactly where the next build starts.
 */
export function nextSlotFor(count: number): Slot {
  return slotFor(progressFor(count).inStation);
}
