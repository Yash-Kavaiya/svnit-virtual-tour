import { describe, it, expect } from 'vitest';
import { scatterPoints } from '../../src/world/Vegetation.js';

describe('scatterPoints', () => {
  it('respects rejection and spacing, deterministic by seed', () => {
    const bounds = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    const reject = (x) => x < 50; // left half forbidden
    const a = scatterPoints({ bounds, count: 50, seed: 7, reject, minSpacing: 4 });
    const b = scatterPoints({ bounds, count: 50, seed: 7, reject, minSpacing: 4 });
    expect(a).toEqual(b);
    expect(a.every(([x]) => x >= 50)).toBe(true);
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        expect(Math.hypot(a[i][0] - a[j][0], a[i][1] - a[j][1])).toBeGreaterThan(3.9);
      }
    }
  });

  it('returns at most `count` points', () => {
    const bounds = { minX: 0, maxX: 20, minZ: 0, maxZ: 20 };
    const pts = scatterPoints({ bounds, count: 200, seed: 1, minSpacing: 5 });
    expect(pts.length).toBeLessThanOrEqual(200);
    expect(pts.length).toBeGreaterThan(0);
  });
});
