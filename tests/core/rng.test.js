import { describe, it, expect } from 'vitest';
import { mulberry32, hashString } from '../../src/core/rng.js';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('outputs are in [0,1)', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('hashString is stable and varies', () => {
    expect(hashString('Central library')).toBe(hashString('Central library'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
