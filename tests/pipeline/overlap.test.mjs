import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pointInRing } from '../../src/shared/polygon.mjs';

const campus = JSON.parse(
  readFileSync(new URL('../../src/data/campus.generated.json', import.meta.url)),
);

// Grid-sampled overlap area (m²) of footprint b inside footprint a.
function overlapArea(a, b, step = 1.5) {
  const bb = (r) => [
    Math.min(...r.map((p) => p[0])),
    Math.min(...r.map((p) => p[1])),
    Math.max(...r.map((p) => p[0])),
    Math.max(...r.map((p) => p[1])),
  ];
  const [ax0, az0, ax1, az1] = bb(a);
  const [bx0, bz0, bx1, bz1] = bb(b);
  // sample only where the two bounding boxes intersect
  const x0 = Math.max(ax0, bx0);
  const x1 = Math.min(ax1, bx1);
  const z0 = Math.max(az0, bz0);
  const z1 = Math.min(az1, bz1);
  let hits = 0;
  for (let x = x0; x <= x1; x += step) {
    for (let z = z0; z <= z1; z += step) {
      if (pointInRing([x, z], a) && pointInRing([x, z], b)) hits++;
    }
  }
  return hits * step * step;
}

describe('generated campus', () => {
  it('has no buildings standing inside one another', () => {
    const B = campus.buildings;
    const clashes = [];
    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const [a, b] = [B[i], B[j]];
        if (Math.hypot(a.centroid[0] - b.centroid[0], a.centroid[1] - b.centroid[1]) > 160)
          continue;
        const area = overlapArea(a.footprint, b.footprint);
        if (area > 10) clashes.push(`${a.name} x ${b.name}: ${area} m²`);
      }
    }
    expect(clashes).toEqual([]);
  });
});
