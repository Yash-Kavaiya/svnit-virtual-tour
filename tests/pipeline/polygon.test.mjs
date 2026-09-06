import { describe, it, expect } from 'vitest';
import {
  ringArea,
  ringCentroid,
  pointInRing,
  ensureWinding,
  dedupeRing,
  simplifyRing,
  longestEdgeAngle,
  convexHull,
  orientedBox,
  clampOrientedBox,
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

  it('convexHull of a noisy square is ~4 points enclosing all input', () => {
    const noisy = [
      [0, 0],
      [5, 0.4],
      [10, 0],
      [10, 5],
      [10, 10],
      [5, 9.6],
      [0, 10],
      [0.3, 5],
      [4, 4], // interior point — must be dropped
    ];
    const h = convexHull(noisy);
    expect(h.length).toBeLessThanOrEqual(6);
    expect(pointInRing([4, 4], h)).toBe(true);
    expect(ringArea(h)).toBeGreaterThan(90);
  });

  it('orientedBox of a rotated rectangle recovers 4 corners with the right area', () => {
    const rot = Math.PI / 6;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const rect = [
      [-15, -4],
      [15, -4],
      [15, 4],
      [-15, 4],
    ].map(([x, z]) => [x * c - z * s, x * s + z * c]);
    const box = orientedBox(rect);
    expect(box.length).toBe(4);
    expect(Math.abs(ringArea(box))).toBeCloseTo(240, 0);
  });

  it('clampOrientedBox caps the long side', () => {
    const longThin = [
      [0, 0],
      [300, 0],
      [300, 20],
      [0, 20],
    ];
    const box = clampOrientedBox(longThin, 95, 60);
    const b = orientedBox(box);
    const w = Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]);
    expect(w).toBeLessThanOrEqual(95.5);
  });
});
