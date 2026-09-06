import { describe, it, expect } from 'vitest';
import { FACADE_PARAMS } from '../../src/world/buildings/FacadeMaterial.js';

describe('FACADE_PARAMS', () => {
  it('covers every facade family used by the pipeline', () => {
    for (const k of ['academic', 'admin', 'library', 'hostel', 'workshop', 'utility', 'residence', 'gate']) {
      expect(FACADE_PARAMS[k]).toBeTruthy();
      expect(FACADE_PARAMS[k].glazingRatio).toBeGreaterThan(0);
    }
  });

  it('library is more glazed than utility', () => {
    expect(FACADE_PARAMS.library.glazingRatio).toBeGreaterThan(FACADE_PARAMS.utility.glazingRatio);
  });

  it('hostels and academic blocks have sunshades (chhajja)', () => {
    expect(FACADE_PARAMS.academic.hasChhajja).toBe(true);
    expect(FACADE_PARAMS.hostel.hasChhajja).toBe(true);
  });
});
