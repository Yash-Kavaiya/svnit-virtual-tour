import { describe, it, expect } from 'vitest';
import { tieredSeatRows } from '../../src/interiors/LectureHallInterior.js';

describe('tieredSeatRows', () => {
  it('each row rises and steps back', () => {
    const t = tieredSeatRows({ rows: 3, seatsPerRow: 4, rise: 0.35, run: 0.9, seatW: 0.6 });
    expect(t).toHaveLength(12);
    const r0 = t[0];
    const r1 = t[4];
    expect(r1.y).toBeGreaterThan(r0.y);
    expect(Math.abs(r1.z) - Math.abs(r0.z)).toBeCloseTo(0.9, 5);
  });

  it('seats within a row share y and z', () => {
    const t = tieredSeatRows({ rows: 2, seatsPerRow: 5, rise: 0.3, run: 0.8, seatW: 0.55 });
    expect(t[0].y).toBe(t[4].y);
    expect(t[0].z).toBe(t[4].z);
    expect(t[1].x - t[0].x).toBeCloseTo(0.55, 5);
  });
});
