import { describe, it, expect } from 'vitest';
import { distanceGain } from '../../src/audio/synth.js';

describe('distanceGain', () => {
  it('is 1 at zero distance and 0 past max, monotonic decreasing', () => {
    expect(distanceGain(0, 100)).toBeCloseTo(1, 5);
    expect(distanceGain(100, 100)).toBeCloseTo(0, 5);
    expect(distanceGain(200, 100)).toBe(0);
    expect(distanceGain(30, 100)).toBeGreaterThan(distanceGain(60, 100));
  });
});
