import { describe, it, expect } from 'vitest';
import { stickVector } from '../../src/player/MobileControls.js';

describe('stickVector', () => {
  it('centre is zero', () => {
    expect(stickVector({ x: 0, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('clamps to the unit circle', () => {
    const v = stickVector({ x: 0, y: 0 }, { x: 200, y: 0 }, 48);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });
  it('scales within the radius', () => {
    const v = stickVector({ x: 0, y: 0 }, { x: 24, y: 0 }, 48);
    expect(v.x).toBeCloseTo(0.5, 5);
  });
});
