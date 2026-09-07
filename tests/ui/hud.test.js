import { describe, it, expect } from 'vitest';
import { nearestLabel, headingToCompass } from '../../src/ui/HUD.js';

const campus = {
  buildings: [
    { name: 'Central Library', centroid: [0, 0] },
    { name: 'Admin', centroid: [200, 0] },
  ],
  pois: [{ name: 'Hostel Zone', type: 'zone', x: 500, z: 0 }],
};

describe('HUD helpers', () => {
  it('names the nearby building', () => {
    expect(nearestLabel([5, 3], campus)).toBe('Central Library');
  });
  it('falls back to zone then default', () => {
    expect(nearestLabel([505, 3], campus)).toBe('Hostel Zone');
    expect(nearestLabel([5000, 0], campus)).toBe('SVNIT Campus');
  });
  it('compass cardinal', () => {
    expect(headingToCompass(0)).toBe('N');
    expect(['E', 'W']).toContain(headingToCompass(Math.PI / 2));
  });
});
