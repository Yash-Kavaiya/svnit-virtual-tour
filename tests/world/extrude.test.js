import { describe, it, expect } from 'vitest';
import { extrudeFootprint, footprintBounds } from '../../src/world/buildings/extrude.js';

const RECT = [
  [0, 0],
  [20, 0],
  [20, 10],
  [0, 10],
];

describe('extrudeFootprint', () => {
  it('produces a geometry whose bounding box matches the footprint and height', () => {
    const g = extrudeFootprint(RECT, 12);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    expect(max.y - min.y).toBeCloseTo(12, 3);
    expect(max.x - min.x).toBeCloseTo(20, 3);
    expect(max.z - min.z).toBeCloseTo(10, 3);
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
  });

  it('has UVs', () => {
    const g = extrudeFootprint(RECT, 9);
    expect(g.getAttribute('uv')).toBeTruthy();
  });
});

describe('footprintBounds', () => {
  it('reads width/depth/orientation of a wide rectangle', () => {
    const b = footprintBounds(RECT);
    expect(b.w).toBeCloseTo(20, 3);
    expect(b.d).toBeCloseTo(10, 3);
    expect(Math.abs(b.angle)).toBeLessThan(0.01);
    expect(b.cx).toBeCloseTo(10, 3);
    expect(b.cz).toBeCloseTo(5, 3);
  });
});
