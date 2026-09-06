import { describe, it, expect } from 'vitest';
import { integrateFly } from '../../src/player/FlyControls.js';

describe('integrateFly', () => {
  it('accelerates forward then damps back to rest', () => {
    let s = { vel: [0, 0, 0] };
    s = integrateFly(s, { forward: 1, right: 0, up: 0, boost: false }, 0.1);
    expect(Math.hypot(...s.vel)).toBeGreaterThan(0);
    for (let i = 0; i < 400; i++) s = integrateFly(s, { forward: 0, right: 0, up: 0, boost: false }, 0.1);
    expect(Math.hypot(...s.vel)).toBeLessThan(0.05);
  });

  it('caps speed even under sustained boost', () => {
    let s = { vel: [0, 0, 0] };
    for (let i = 0; i < 300; i++) {
      s = integrateFly(s, { forward: 1, right: 1, up: 1, boost: true }, 0.1);
    }
    expect(Math.hypot(...s.vel)).toBeLessThanOrEqual(85);
  });
});
