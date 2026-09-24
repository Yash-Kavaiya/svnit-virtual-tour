import { describe, it, expect } from 'vitest';
import { gateFrame } from '../../src/world/gateFrame.js';

const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

describe('gateFrame', () => {
  it('points perpendicular to the wall, into campus', () => {
    // gate on the north wall (z = -100), wall running along x
    for (const wallAngle of [0, Math.PI]) {
      const f = gateFrame({ x: 10, z: -100, width: 16, wallAngle }, bounds);
      expect(f.inx).toBeCloseTo(0, 6);
      expect(f.inz).toBeCloseTo(1, 6);
      expect(f.halfOpening).toBeGreaterThan(8);
    }
  });
  it('falls back to facing the campus centre', () => {
    const f = gateFrame({ x: 100, z: 0 }, bounds);
    expect(f.inx).toBeCloseTo(-1, 6);
    expect(f.inz).toBeCloseTo(0, 6);
  });
});

describe('wallRuns', () => {
  it('cuts the gate opening out of the boundary wall', async () => {
    const { wallRuns } = await import('../../src/world/Ground.js');
    const square = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    expect(wallRuns(square)).toHaveLength(4);
    const runs = wallRuns(square, [{ x: 50, z: 0, r: 10 }]);
    expect(runs).toHaveLength(5);
    const [first, second] = runs;
    expect(first[1][0]).toBeCloseTo(40, 6);
    expect(second[0][0]).toBeCloseTo(60, 6);
  });
});

describe('onPavement', () => {
  it('flags road surface, the gate approach and the statue island', async () => {
    const { onPavement } = await import('../../src/world/StreetKit.js');
    const campus = {
      bounds,
      roads: [
        {
          width: 6,
          path: [
            [-50, 0],
            [50, 0],
          ],
        },
      ],
      gates: [{ x: 0, z: -100, width: 16, wallAngle: 0 }],
      pois: [{ type: 'statue', x: 40, z: 40 }],
    };
    expect(onPavement(campus, 10, 2)).toBe(true); // on the road
    expect(onPavement(campus, 10, 5)).toBe(false); // verge
    expect(onPavement(campus, 3, -95)).toBe(true); // gate carriageway
    expect(onPavement(campus, 42, 41)).toBe(true); // statue island
    expect(onPavement(campus, 60, 60)).toBe(false);
  });
});
