import { describe, it, expect } from 'vitest';
import { fuzzyFilter } from '../../src/ui/Directory.js';

const items = [
  { name: 'Central Library' },
  { name: 'Civil Engineering Department' },
  { name: 'Computer Engineering Department' },
];

describe('fuzzyFilter', () => {
  it('matches subsequences', () => {
    const r = fuzzyFilter('ced', items).map((i) => i.name);
    expect(r).toContain('Civil Engineering Department');
  });
  it('ranks contiguous matches first', () => {
    expect(fuzzyFilter('comp', items)[0].name).toBe('Computer Engineering Department');
  });
  it('empty query returns all', () => {
    expect(fuzzyFilter('', items)).toHaveLength(3);
  });
  it('no match returns empty', () => {
    expect(fuzzyFilter('zzzz', items)).toHaveLength(0);
  });
});
