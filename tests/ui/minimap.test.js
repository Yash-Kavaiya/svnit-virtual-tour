import { describe, it, expect } from 'vitest';
import { worldToMap } from '../../src/ui/Minimap.js';

const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

describe('worldToMap', () => {
  it('centre maps to centre', () => {
    expect(worldToMap({ x: 0, z: 0 }, bounds, 200)).toEqual({ mx: 100, my: 100 });
  });
  it('+z goes down the canvas', () => {
    expect(worldToMap({ x: 0, z: 100 }, bounds, 200).my).toBeGreaterThan(100);
  });
  it('+x goes right', () => {
    expect(worldToMap({ x: 100, z: 0 }, bounds, 200).mx).toBeGreaterThan(100);
  });
});
