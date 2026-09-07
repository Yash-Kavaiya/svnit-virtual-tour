import { describe, it, expect } from 'vitest';
import { buildRoadRibbon } from '../../src/world/Roads.js';

describe('buildRoadRibbon', () => {
  it('straight 100 m x 8 m ribbon has 4 verts and 2 tris', () => {
    const r = buildRoadRibbon(
      [
        [0, 0],
        [100, 0],
      ],
      8,
    );
    expect(r.positions.length).toBe(4 * 3);
    expect(r.indices.length).toBe(6);
  });

  it('follows a bend without producing NaNs', () => {
    const r = buildRoadRibbon(
      [
        [0, 0],
        [50, 0],
        [50, 50],
      ],
      6,
    );
    expect(r.positions.length).toBe(6 * 3);
    expect([...r.positions].every(Number.isFinite)).toBe(true);
  });

  it('offsets rim points by half width on a straight run', () => {
    const r = buildRoadRibbon(
      [
        [0, 0],
        [10, 0],
      ],
      4,
    );
    // rim z coords should be +/-2
    const zs = [r.positions[2], r.positions[5], r.positions[8], r.positions[11]].sort((a, b) => a - b);
    expect(zs[0]).toBeCloseTo(-2, 5);
    expect(zs[3]).toBeCloseTo(2, 5);
  });
});
