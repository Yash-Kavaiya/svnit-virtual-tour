import { describe, it, expect } from 'vitest';
import { samplePath, pathDuration } from '../../src/tour/keyframes.js';

const keys = [
  { t: 0, pos: [0, 2, 0], look: [10, 2, 0] },
  { t: 2, pos: [0, 2, 20], look: [10, 2, 20] },
  { t: 4, pos: [20, 2, 20], look: [30, 2, 20] },
];

describe('keyframes', () => {
  it('duration is the last t', () => {
    expect(pathDuration(keys)).toBe(4);
  });

  it('samples endpoints exactly', () => {
    expect(samplePath(keys, 0).pos[2]).toBeCloseTo(0, 3);
    expect(samplePath(keys, 4).pos[0]).toBeCloseTo(20, 3);
  });

  it('interpolates the middle within range', () => {
    const mid = samplePath(keys, 1);
    expect(mid.pos[2]).toBeGreaterThan(0);
    expect(mid.pos[2]).toBeLessThan(20);
  });

  it('clamps out-of-range time', () => {
    expect(samplePath(keys, -5).pos[2]).toBeCloseTo(0, 3);
    expect(samplePath(keys, 99).pos[0]).toBeCloseTo(20, 3);
  });

  it('returns finite look targets', () => {
    const s = samplePath(keys, 2.5);
    expect(s.look.every(Number.isFinite)).toBe(true);
  });
});
