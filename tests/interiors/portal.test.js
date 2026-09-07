import { describe, it, expect } from 'vitest';
import { computeReturn } from '../../src/interiors/InteriorBase.js';

describe('computeReturn', () => {
  it('stores the transform, nudged back from the door, at eye height', () => {
    const r = computeReturn({ x: 10, y: 1.7, z: 5 }, Math.PI / 2);
    expect(r.returnHeading).toBeCloseTo(Math.PI / 2, 5);
    expect(r.returnPos.y).toBeCloseTo(1.7, 5);
    // nudged opposite the facing direction (forward at yaw = (-sin,-cos))
    const back = Math.hypot(r.returnPos.x - 10, r.returnPos.z - 5);
    expect(back).toBeGreaterThan(1);
    expect(back).toBeLessThan(4);
  });
});
