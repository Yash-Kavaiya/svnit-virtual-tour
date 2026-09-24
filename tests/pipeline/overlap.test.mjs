import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pointInRing } from '../../src/shared/polygon.mjs';

const campus = JSON.parse(readFileSync(new URL('../../src/data/campus.generated.json', import.meta.url)));

// Grid-sampled overlap area (m²) of footprint b inside footprint a.
function overlapArea(a, b, step = 1.5) {
  const xs = a.map((p) => p[0]);
  const zs = a.map((p) => p[1]);
  let hits = 0;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
    for (let z = Math.min(...zs); z <= Math.max(...zs); z += step) {
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
        if (Math.hypot(a.centroid[0] - b.centroid[0], a.centroid[1] - b.centroid[1]) > 160) continue;
        const area = overlapArea(a.footprint, b.footprint);
        if (area > 10) clashes.push(`${a.name} x ${b.name}: ${area} m²`);
      }
    }
    expect(clashes).toEqual([]);
  });
});
