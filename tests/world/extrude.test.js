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

  it('splits walls and roof cap into separate material groups', () => {
    const g = extrudeFootprint(RECT, 10);
    const mats = g.groups.map((gr) => gr.materialIndex).sort();
    expect(mats).toEqual([0, 1]); // 0 = facade walls, 1 = roof slab
    const total = g.getAttribute('position').count;
    const covered = g.groups.reduce((s, gr) => s + gr.count, 0);
    expect(covered).toBe(total); // every vertex belongs to exactly one group
  });

  it('winds wall triangles to face along their outward normals', () => {
    for (const ring of [RECT, [...RECT].reverse()]) {
      const g = extrudeFootprint(ring, 10);
      const walls = g.groups.find((gr) => gr.materialIndex === 0);
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      for (let i = walls.start; i < walls.start + walls.count; i += 3) {
        const u = [p.getX(i + 1) - p.getX(i), p.getY(i + 1) - p.getY(i), p.getZ(i + 1) - p.getZ(i)];
        const v = [p.getX(i + 2) - p.getX(i), p.getY(i + 2) - p.getY(i), p.getZ(i + 2) - p.getZ(i)];
        const gx = u[1] * v[2] - u[2] * v[1];
        const gz = u[0] * v[1] - u[1] * v[0];
        expect(gx * n.getX(i) + gz * n.getZ(i)).toBeGreaterThan(0);
        // and that normal points out of the footprint (RECT centre is 10,5)
        const mx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
        const mz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        expect((mx - 10) * n.getX(i) + (mz - 5) * n.getZ(i)).toBeGreaterThan(0);
      }
    }
  });

  it('winds every roof-cap triangle to face up, whatever the input winding', () => {
    for (const ring of [RECT, [...RECT].reverse()]) {
      const g = extrudeFootprint(ring, 10);
      const cap = g.groups.find((gr) => gr.materialIndex === 1);
      const p = g.getAttribute('position');
      for (let i = cap.start; i < cap.start + cap.count; i += 3) {
        const ux = p.getX(i + 1) - p.getX(i);
        const uz = p.getZ(i + 1) - p.getZ(i);
        const vx = p.getX(i + 2) - p.getX(i);
        const vz = p.getZ(i + 2) - p.getZ(i);
        expect(uz * vx - ux * vz).toBeGreaterThan(0); // y of (b-a)x(c-a)
      }
    }
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
