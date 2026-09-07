import { describe, it, expect } from 'vitest';
import { validateCampusData } from '../../src/data/schema.mjs';

const minimal = {
  origin: { lat: 21.163, lon: 72.785 },
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
  boundary: [
    [-10, -10],
    [10, -10],
    [10, 10],
    [-10, 10],
  ],
  buildings: [
    {
      id: 'w1',
      name: 'Central library',
      category: 'library',
      footprint: [
        [0, 0],
        [8, 0],
        [8, 12],
        [0, 12],
      ],
      centroid: [4, 6],
      height: 14,
      levels: 3,
      orientation: 0,
      meta: { facade: 'library', accent: '#b5451f', roof: 'flat', hasInterior: true },
    },
  ],
  roads: [
    {
      class: 'primary',
      width: 7,
      path: [
        [-10, 0],
        [10, 0],
      ],
    },
  ],
  water: [],
  greens: [],
  grounds: [],
  pois: [],
  gates: [],
};

describe('validateCampusData', () => {
  it('accepts a minimal valid campus', () => {
    expect(validateCampusData(minimal).ok).toBe(true);
  });
  it('rejects a building with < 3 footprint points', () => {
    const bad = structuredClone(minimal);
    bad.buildings[0].footprint = [
      [0, 0],
      [1, 1],
    ];
    const r = validateCampusData(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/footprint/);
  });
  it('rejects an unknown category', () => {
    const bad = structuredClone(minimal);
    bad.buildings[0].category = 'castle';
    expect(validateCampusData(bad).ok).toBe(false);
  });
});
