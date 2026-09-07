import { describe, it, expect } from 'vitest';
import { nearestRoadPointTo } from '../../src/world/buildings/Entrance.js';

describe('nearestRoadPointTo', () => {
  it('finds the closest point on the closest road polyline', () => {
    const roads = [
      {
        path: [
          [0, 20],
          [100, 20],
        ],
      },
      {
        path: [
          [0, -50],
          [100, -50],
        ],
      },
    ];
    const p = nearestRoadPointTo([50, 0], roads);
    expect(p[1]).toBeCloseTo(20, 3);
    expect(p[0]).toBeCloseTo(50, 3);
  });

  it('returns null-ish safe fallback with no roads', () => {
    const p = nearestRoadPointTo([5, 5], []);
    expect(p).toEqual([5, 5]);
  });
});
