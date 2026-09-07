import { describe, it, expect } from 'vitest';
import { buildCampus } from '../../scripts/build-campus-data.mjs';
import { validateCampusData } from '../../src/data/schema.mjs';

const FIXTURE = {
  elements: [
    {
      type: 'way',
      id: 1,
      tags: { amenity: 'university', name: 'Sardar Vallabhbhai National Institute of Technology' },
      geometry: [
        { lat: 21.16, lon: 72.782 },
        { lat: 21.16, lon: 72.789 },
        { lat: 21.167, lon: 72.789 },
        { lat: 21.167, lon: 72.782 },
      ],
    },
    {
      type: 'way',
      id: 10,
      tags: {
        building: 'yes',
        name: 'Mechanical Engineering Department',
        office: 'educational_institution',
      },
      geometry: [
        { lat: 21.163, lon: 72.785 },
        { lat: 21.163, lon: 72.7853 },
        { lat: 21.1633, lon: 72.7853 },
        { lat: 21.1633, lon: 72.785 },
      ],
    },
    {
      type: 'way',
      id: 11,
      tags: { building: 'dormitory', name: 'Gajjar Bhavan H4', 'building:levels': '5' },
      geometry: [
        { lat: 21.161, lon: 72.786 },
        { lat: 21.161, lon: 72.7864 },
        { lat: 21.1613, lon: 72.7864 },
        { lat: 21.1613, lon: 72.786 },
      ],
    },
    {
      type: 'way',
      id: 20,
      tags: { highway: 'primary', name: 'Main Ave' },
      geometry: [
        { lat: 21.16, lon: 72.785 },
        { lat: 21.167, lon: 72.786 },
      ],
    },
    {
      type: 'way',
      id: 30,
      tags: { natural: 'water', name: 'University Lake' },
      geometry: [
        { lat: 21.1645, lon: 72.7875 },
        { lat: 21.1645, lon: 72.788 },
        { lat: 21.165, lon: 72.788 },
        { lat: 21.165, lon: 72.7875 },
      ],
    },
    {
      type: 'node',
      id: 40,
      tags: { memorial: 'statue', name: 'Sardar Vallabhbhai Statue' },
      lat: 21.1635,
      lon: 72.7855,
    },
    {
      type: 'way',
      id: 99,
      tags: { building: 'yes', name: 'Outside Mall' },
      geometry: [
        { lat: 21.19, lon: 72.8 },
        { lat: 21.19, lon: 72.801 },
        { lat: 21.191, lon: 72.801 },
        { lat: 21.191, lon: 72.8 },
      ],
    },
  ],
};

const EMPTY_CURATED = { buildings: {}, extraBuildings: [], gates: [], zones: [] };

describe('buildCampus', () => {
  const campus = buildCampus(FIXTURE, { curated: EMPTY_CURATED });

  it('produces schema-valid output', () => {
    const v = validateCampusData(campus);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });
  it('clips buildings outside the campus polygon', () => {
    expect(campus.buildings.find((b) => b.name === 'Outside Mall')).toBeUndefined();
  });
  it('keeps and classifies campus buildings', () => {
    const mech = campus.buildings.find((b) => b.name.includes('Mechanical'));
    expect(mech.category).toBe('academic');
    const gajjar = campus.buildings.find((b) => b.name.includes('Gajjar'));
    expect(gajjar.category).toBe('hostel');
    expect(gajjar.levels).toBe(5);
  });
  it('footprints are metric and near origin', () => {
    const mech = campus.buildings.find((b) => b.name.includes('Mechanical'));
    for (const [x, z] of mech.footprint) {
      expect(Math.abs(x)).toBeLessThan(1500);
      expect(Math.abs(z)).toBeLessThan(1500);
    }
  });
  it('captures water and pois', () => {
    expect(campus.water.length).toBe(1);
    expect(campus.pois.find((p) => /Statue/.test(p.name))).toBeTruthy();
  });
  it('is deterministic', () => {
    const again = buildCampus(FIXTURE, { curated: EMPTY_CURATED });
    expect(JSON.stringify(again)).toBe(JSON.stringify(campus));
  });
});

describe('buildCampus curated overlay', () => {
  const curated = {
    buildings: {},
    gates: [],
    zones: [],
    extraBuildings: [
      {
        id: 'x-canteen',
        name: 'SVNIT Canteen',
        category: 'dining',
        levels: 2,
        // near the FIXTURE boundary centroid, given directly in local metres
        footprintXZ: [
          [10, 10],
          [40, 10],
          [40, 34],
          [10, 34],
        ],
        meta: { description: 'test canteen' },
      },
    ],
  };
  const campus = buildCampus(FIXTURE, { curated });

  it('places a footprintXZ extraBuilding without lat/lon', () => {
    const c = campus.buildings.find((b) => b.name === 'SVNIT Canteen');
    expect(c).toBeTruthy();
    expect(c.category).toBe('dining');
    expect(c.meta.facade).toBe('dining');
    expect(c.levels).toBe(2);
  });
  it('stays schema-valid with the overlay', () => {
    expect(validateCampusData(campus).ok).toBe(true);
  });
});
