import { describe, it, expect } from 'vitest';
import { makeProjector, metersPerDegree } from '../../scripts/lib/geo.mjs';

const ORIGIN = { lat: 21.163, lon: 72.785 };

describe('geo', () => {
  it('origin maps to (0,0)', () => {
    const p = makeProjector(ORIGIN);
    const [x, z] = p.toXZ(ORIGIN);
    expect(Math.abs(x)).toBeLessThan(1e-6);
    expect(Math.abs(z)).toBeLessThan(1e-6);
  });

  it('round-trips within 0.5 m over a 1.5 km span', () => {
    const p = makeProjector(ORIGIN);
    const pt = { lat: 21.17, lon: 72.793 };
    const back = p.toLatLon(p.toXZ(pt));
    const { mx, mz } = metersPerDegree(ORIGIN.lat);
    const errE = Math.abs(back.lon - pt.lon) * mx;
    const errN = Math.abs(back.lat - pt.lat) * mz;
    expect(errE).toBeLessThan(0.5);
    expect(errN).toBeLessThan(0.5);
  });

  it('north is -Z, east is +X', () => {
    const p = makeProjector(ORIGIN);
    const north = p.toXZ({ lat: ORIGIN.lat + 0.001, lon: ORIGIN.lon });
    const east = p.toXZ({ lat: ORIGIN.lat, lon: ORIGIN.lon + 0.001 });
    expect(north[1]).toBeLessThan(0);
    expect(east[0]).toBeGreaterThan(0);
  });
});
