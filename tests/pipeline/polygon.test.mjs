import { describe, it, expect } from 'vitest';
import {
  ringArea,
  ringCentroid,
  pointInRing,
  ensureWinding,
  dedupeRing,
  simplifyRing,
  longestEdgeAngle,
} from '../../src/shared/polygon.mjs';

const SQUARE = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe('polygon', () => {
  it('area of a 10x10 square', () => {
    expect(ringArea(SQUARE)).toBeCloseTo(100, 5);
    expect(ringArea([...SQUARE].reverse())).toBeCloseTo(-100, 5);
  });
  it('centroid of square', () => {
    expect(ringCentroid(SQUARE)).toEqual([5, 5]);
  });
  it('point in / out', () => {
    expect(pointInRing([5, 5], SQUARE)).toBe(true);
    expect(pointInRing([-1, 5], SQUARE)).toBe(false);
    expect(pointInRing([50, 50], SQUARE)).toBe(false);
  });
  it('ensureWinding flips CW to CCW', () => {
    const cw = [...SQUARE].reverse();
    expect(ringArea(ensureWinding(cw, true))).toBeGreaterThan(0);
  });
  it('dedupeRing removes closing repeat and dupes', () => {
    expect(
      dedupeRing([
        [0, 0],
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ]),
    ).toEqual(SQUARE);
  });
  it('simplifyRing drops a near-collinear point', () => {
    const withMid = [
      [0, 0],
      [5, 0.05],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(simplifyRing(withMid, 0.35).length).toBe(4);
  });
  it('longestEdgeAngle of a wide rectangle is ~0', () => {
    const rect = [
      [0, 0],
      [20, 0],
      [20, 5],
      [0, 5],
    ];
    expect(Math.abs(longestEdgeAngle(rect))).toBeLessThan(0.01);
  });
});
