import { describe, it, expect } from 'vitest';
import { lodLevel } from '../../src/world/buildings/lod.js';

describe('lodLevel', () => {
  it('near is full, far is mid (high quality)', () => {
    expect(lodLevel(20, 'high')).toBe('full');
    expect(lodLevel(300, 'high')).toBe('mid');
    expect(lodLevel(2000, 'high')).toBe('mid');
  });
  it('low quality shortens the full range', () => {
    expect(lodLevel(90, 'low')).toBe('mid');
    expect(lodLevel(40, 'low')).toBe('full');
  });
  it('ultra keeps full detail further out', () => {
    expect(lodLevel(200, 'ultra')).toBe('full');
  });
});
