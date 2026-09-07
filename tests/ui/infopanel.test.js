// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderInfo } from '../../src/ui/InfoPanel.js';

const rec = {
  name: 'Central Library',
  category: 'library',
  meta: {
    department: undefined,
    established: 1968,
    floors: 3,
    description: 'Central library of SVNIT.',
    hasInterior: true,
  },
};

describe('renderInfo', () => {
  it('shows name, established, floors and an Enter button when an interior exists', () => {
    const n = renderInfo(rec);
    expect(n.textContent).toMatch(/Central Library/);
    expect(n.textContent).toMatch(/1968/);
    expect(n.textContent).toMatch(/library/i);
    expect(n.querySelector('[data-action="enter"]')).toBeTruthy();
  });

  it('hides the Enter button without an interior', () => {
    const n = renderInfo({ ...rec, meta: { ...rec.meta, hasInterior: false } });
    expect(n.querySelector('[data-action="enter"]')).toBeFalsy();
  });

  it('shows the department when present', () => {
    const n = renderInfo({
      name: 'Mechanical Engineering Department',
      category: 'academic',
      meta: { department: 'Mechanical Engineering', floors: 3 },
    });
    expect(n.textContent).toMatch(/Mechanical Engineering/);
  });
});
