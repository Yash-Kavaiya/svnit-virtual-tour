import { describe, it, expect } from 'vitest';
import {
  classifyBuilding,
  estimateHeight,
  LEVEL_HEIGHT,
  PARAPET,
} from '../../scripts/lib/classify.mjs';

describe('classifyBuilding', () => {
  it('library by amenity tag', () => {
    expect(classifyBuilding({ tags: { amenity: 'library' }, name: 'Central library' })).toBe(
      'library',
    );
  });
  it('hostel by dormitory building tag', () => {
    expect(classifyBuilding({ tags: { building: 'dormitory' }, name: 'Gajjar Bhavan H4' })).toBe(
      'hostel',
    );
  });
  it('hostel by Bhavan name even without tag', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'Tagor Bhavan' })).toBe('hostel');
  });
  it('academic by Department name', () => {
    expect(
      classifyBuilding({
        tags: { building: 'yes', office: 'educational_institution' },
        name: 'Mechanical Engineering Department',
      }),
    ).toBe('academic');
  });
  it('admin by name', () => {
    expect(classifyBuilding({ tags: { building: 'office' }, name: 'Administration Building' })).toBe(
      'admin',
    );
  });
  it('workshop by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'SVNIT Workshop' })).toBe('workshop');
  });
  it('lab by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'Material Testing Lab' })).toBe('lab');
  });
  it('health by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'SVNIT Dispensary' })).toBe('health');
  });
  it('unknown falls back to utility', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: '' })).toBe('utility');
  });
});

describe('estimateHeight', () => {
  it('uses known levels', () => {
    const r = estimateHeight('hostel', 9);
    expect(r.levels).toBe(9);
    expect(r.height).toBeCloseTo(9 * LEVEL_HEIGHT + PARAPET, 5);
  });
  it('academic default is 4 levels', () => {
    expect(estimateHeight('academic').levels).toBe(4);
  });
  it('workshop default is a tall single storey', () => {
    const r = estimateHeight('workshop');
    expect(r.levels).toBe(1);
    expect(r.height).toBeGreaterThanOrEqual(7);
  });
});
