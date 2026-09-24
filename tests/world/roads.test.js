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

describe('buildKerbRuns', () => {
  it('lines both edges and breaks at a crossing road', async () => {
    const { buildKerbRuns } = await import('../../src/world/Roads.js');
    const straight = [{ class: 'residential', width: 6, path: [[0, 0], [40, 0]] }];
    const runs = buildKerbRuns(straight);
    expect(runs).toHaveLength(2);
    for (const run of runs) expect(Math.abs(Math.abs(run[0][1]) - 3.12)).toBeLessThan(1e-6);
    const crossed = [...straight, { class: 'residential', width: 6, path: [[20, -30], [20, 30]] }];
    const cut = buildKerbRuns(crossed).filter((r) => Math.abs(r[0][1]) < 4 && r.length > 2);
    // each edge of the first road splits either side of the crossing
    expect(cut.length).toBe(4);
    for (const run of cut) for (const [x] of run) expect(Math.abs(x - 20)).toBeGreaterThan(3);
  });
});
