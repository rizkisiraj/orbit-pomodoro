import { describe, expect, test } from 'vitest';
import { SEAL_POINTS, STATION_SIZE, milestoneAt, progressFor } from './milestones';
import { RINGS } from '../constants';

/**
 * Everything here is expressed against RINGS rather than literal counts. The
 * ring sizes are a design dial that has already been turned once (6/12/18 ->
 * 4/8/12); baking 36 into the assertions just means rewriting the suite every
 * time it moves.
 */
const [SEAL_0, SEAL_1, SEAL_2] = SEAL_POINTS;

describe('station size', () => {
  test('derives from RINGS, not a hardcoded constant', () => {
    expect(STATION_SIZE).toBe(RINGS.reduce((n, r) => n + r.n, 0));
    expect(STATION_SIZE).toBe(SEAL_POINTS[SEAL_POINTS.length - 1]);
  });

  test('seals once per ring, cumulatively', () => {
    expect(SEAL_POINTS).toHaveLength(RINGS.length);
    expect(SEAL_0).toBe(RINGS[0].n);
    expect(SEAL_1).toBe(RINGS[0].n + RINGS[1].n);
  });
});

describe('milestoneAt', () => {
  test('is null for a module that does not seal a ring', () => {
    for (let n = 1; n <= STATION_SIZE; n++) {
      if (SEAL_POINTS.includes(n)) continue;
      expect(milestoneAt(n)).toBeNull();
    }
  });

  test('fires exactly on each seal boundary', () => {
    expect(milestoneAt(SEAL_0)).toMatchObject({ ring: 0, title: 'RING 1 SEALED' });
    expect(milestoneAt(SEAL_1)).toMatchObject({ ring: 1, title: 'RING 2 SEALED' });
    expect(milestoneAt(SEAL_2)).toMatchObject({ ring: 2, title: 'STATION COMPLETE' });
  });

  test('is null for module 0', () => {
    expect(milestoneAt(0)).toBeNull();
  });

  test('treats negative or non-finite counts as zero', () => {
    expect(milestoneAt(-5)).toBeNull();
    expect(milestoneAt(NaN)).toBeNull();
    expect(milestoneAt(Infinity)).toBeNull();
  });

  test('fires again on the first seal of the second build', () => {
    expect(milestoneAt(STATION_SIZE + SEAL_0)).toMatchObject({ ring: 0, title: 'RING 1 SEALED' });
  });

  test('seals the second build outright', () => {
    expect(milestoneAt(STATION_SIZE * 2)).toMatchObject({ ring: 2, title: 'STATION COMPLETE' });
  });
});

describe('progressFor', () => {
  test('count 0 is the start of station 1, empty', () => {
    const p = progressFor(0);
    expect(p.stationNumber).toBe(1);
    expect(p.inStation).toBe(0);
    expect(p.tier).toBe('OUTPOST');
    expect(p.next).toMatchObject({ at: SEAL_0 });
    expect(p.toNext).toBe(SEAL_0);
  });

  test('a full build stays on that station, not a wrapped 0', () => {
    const p = progressFor(STATION_SIZE);
    expect(p.stationNumber).toBe(1);
    expect(p.inStation).toBe(STATION_SIZE);
    expect(p.toNext).toBe(0);
    expect(p.next).toBeNull();
  });

  test('the next module rolls over into station 2', () => {
    const p = progressFor(STATION_SIZE + 1);
    expect(p.stationNumber).toBe(2);
    expect(p.inStation).toBe(1);
    expect(p.toNext).toBe(SEAL_0 - 1);
    expect(p.next).toMatchObject({ at: SEAL_0, ring: 0 });
  });

  test('a count far past one build lands mid-build in a later station', () => {
    // Two full builds, then one module short of the last ring sealing again.
    const n = STATION_SIZE * 2 + (SEAL_2 - 1);
    const p = progressFor(n);
    expect(p.stationNumber).toBe(3);
    expect(p.inStation).toBe(SEAL_2 - 1);
    expect(p.next).toMatchObject({ at: SEAL_2, ring: 2 });
    expect(p.toNext).toBe(1);
  });

  test('tier thresholds follow the build size', () => {
    const third = STATION_SIZE / 3;
    expect(progressFor(0).tier).toBe('OUTPOST');
    expect(progressFor(third - 1).tier).toBe('OUTPOST');
    expect(progressFor(third).tier).toBe('STATION');
    expect(progressFor(STATION_SIZE - 1).tier).toBe('STATION');
    expect(progressFor(STATION_SIZE).tier).toBe('COLONY');
    expect(progressFor(STATION_SIZE * 2 - 1).tier).toBe('COLONY');
    expect(progressFor(STATION_SIZE * 2).tier).toBe('FLEET');
    expect(progressFor(STATION_SIZE * 20).tier).toBe('FLEET');
  });

  test('clamps negative or non-finite counts to zero', () => {
    expect(progressFor(-10)).toEqual(progressFor(0));
    expect(progressFor(NaN)).toEqual(progressFor(0));
    expect(progressFor(Infinity).stationNumber).toBeGreaterThan(0);
  });
});
