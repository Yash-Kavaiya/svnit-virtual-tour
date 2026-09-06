import { describe, it, expect } from 'vitest';
import { arrivalTransform } from '../../src/player/Teleport.js';

describe('arrivalTransform', () => {
  it('stands ~6 m back from the target toward faceTowards, eye height', () => {
    const t = arrivalTransform({ x: 0, z: 0 }, { x: 0, z: 100 });
    expect(t.pos[1]).toBeCloseTo(1.7, 5);
    // faceTowards is +z, so we stand on the +z side of the target
    expect(t.pos[2]).toBeGreaterThan(0);
    expect(Math.hypot(t.pos[0], t.pos[2])).toBeCloseTo(6, 1);
  });

  it('faces back toward the target', () => {
    const t = arrivalTransform({ x: 10, z: 0 }, { x: 90, z: 0 });
    // we stand at +x of the target; forward (-sin, -cos) should point toward -x
    const fx = -Math.sin(t.heading);
    expect(fx).toBeLessThan(-0.6);
  });

  it('falls back to a default facing when no faceTowards given', () => {
    const t = arrivalTransform({ x: 0, z: 0 });
    expect(Number.isFinite(t.heading)).toBe(true);
    expect(t.pos).toHaveLength(3);
  });
});
