import { describe, it, expect } from 'vitest';
import { lodLevel } from '../../src/world/buildings/lod.js';

describe('lodLevel', () => {
  it('near is full, mid is mid, far is far (high quality)', () => {
    expect(lodLevel(20, 'high')).toBe('full');
    expect(lodLevel(300, 'high')).toBe('mid');
    expect(lodLevel(900, 'high')).toBe('far');
  });
  it('low quality shortens the full range', () => {
    expect(lodLevel(120, 'low')).not.toBe('full');
  });
  it('ultra keeps full detail further out', () => {
    expect(lodLevel(200, 'ultra')).toBe('full');
  });
});
