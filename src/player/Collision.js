import { pointInRing } from '../shared/polygon.mjs';

export function segmentClosestPoint(p, a, b) {
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const apx = p[0] - a[0];
  const apz = p[1] - a[1];
  const len2 = abx * abx + abz * abz || 1e-9;
  let t = (apx * abx + apz * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + abx * t, a[1] + abz * t];
}

// 2D collision: push a capsule (point + radius) out of building footprints and
// keep it inside the campus boundary. Uniform grid broadphase.
export class Collider {
  #cells = new Map();
  #cell = 40;
  #buildings;
  #boundary;

  constructor(buildings, boundary) {
    this.#buildings = (buildings ?? []).map((b) => {
      const ring = b.footprint;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const [x, z] of ring) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
      return { ring, minX, maxX, minZ, maxZ };
    });
    this.#boundary = boundary ?? null;

    this.#buildings.forEach((b, i) => {
      const x0 = Math.floor(b.minX / this.#cell);
      const x1 = Math.floor(b.maxX / this.#cell);
      const z0 = Math.floor(b.minZ / this.#cell);
      const z1 = Math.floor(b.maxZ / this.#cell);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const key = `${cx},${cz}`;
          if (!this.#cells.has(key)) this.#cells.set(key, []);
          this.#cells.get(key).push(i);
        }
      }
    });
  }

  #near(p) {
    const cx = Math.floor(p[0] / this.#cell);
    const cz = Math.floor(p[1] / this.#cell);
    const seen = new Set();
    const out = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.#cells.get(`${cx + dx},${cz + dz}`);
        if (!list) continue;
        for (const i of list) {
          if (!seen.has(i)) {
            seen.add(i);
            out.push(this.#buildings[i]);
          }
        }
      }
    }
    return out;
  }

  resolve(pos, radius = 0.4) {
    let p = [pos[0], pos[1]];

    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.#near(p)) {
        if (p[0] < b.minX - radius || p[0] > b.maxX + radius) continue;
        if (p[1] < b.minZ - radius || p[1] > b.maxZ + radius) continue;
        const inside = pointInRing(p, b.ring);
        // nearest edge point
        let best = null;
        let bestD = Infinity;
        for (let i = 0; i < b.ring.length; i++) {
          const c = segmentClosestPoint(p, b.ring[i], b.ring[(i + 1) % b.ring.length]);
          const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (!best) continue;
        if (inside) {
          // eject toward the nearest edge, then one radius beyond it
          let nx = p[0] - best[0];
          let nz = p[1] - best[1];
          let nl = Math.hypot(nx, nz);
          if (nl < 1e-4) {
            nx = 1;
            nz = 0;
            nl = 1;
          }
          p = [best[0] - (nx / nl) * radius, best[1] - (nz / nl) * radius];
          moved = true;
        } else if (bestD < radius) {
          const nx = p[0] - best[0];
          const nz = p[1] - best[1];
          const nl = Math.hypot(nx, nz) || 1e-6;
          p = [best[0] + (nx / nl) * radius, best[1] + (nz / nl) * radius];
          moved = true;
        }
      }
      if (!moved) break;
    }

    if (this.#boundary && !pointInRing(p, this.#boundary)) {
      let best = null;
      let bestD = Infinity;
      for (let i = 0; i < this.#boundary.length; i++) {
        const c = segmentClosestPoint(
          p,
          this.#boundary[i],
          this.#boundary[(i + 1) % this.#boundary.length],
        );
        const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best) {
        // pull just inside the wall
        const cx = this.#boundary.reduce((s, q) => s + q[0], 0) / this.#boundary.length;
        const cz = this.#boundary.reduce((s, q) => s + q[1], 0) / this.#boundary.length;
        const inx = cx - best[0];
        const inz = cz - best[1];
        const inl = Math.hypot(inx, inz) || 1;
        p = [best[0] + (inx / inl) * (radius + 0.5), best[1] + (inz / inl) * (radius + 0.5)];
      }
    }

    return p;
  }
}
