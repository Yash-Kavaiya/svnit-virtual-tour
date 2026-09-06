import * as THREE from 'three';
import { ringCentroid, longestEdgeAngle, ensureWinding } from '../../shared/polygon.mjs';

const LEVEL_HEIGHT = 3.4;

// Build walls (outward-facing, per-floor UV.v) + a flat cap for a footprint ring.
// Non-indexed BufferGeometry with explicit normals for crisp wall shading.
export function extrudeFootprint(ring, height, opts = {}) {
  const r = ensureWinding(ring, true);
  const n = r.length;
  const plinth = opts.plinthHeight ?? 0;

  const positions = [];
  const normals = [];
  const uvs = [];

  // Walls
  let perim = 0;
  for (let i = 0; i < n; i++) {
    const a = r[i];
    const b = r[(i + 1) % n];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const len = Math.hypot(ex, ez) || 1e-6;
    // outward normal for CCW ring (in x/z), viewed from +Y down: (ez, -ex)/len
    const nx = ez / len;
    const nz = -ex / len;
    const u0 = perim / 4;
    const u1 = (perim + len) / 4;
    perim += len;

    const y0 = 0;
    const y1 = height;
    // two triangles: (a,y0)-(b,y0)-(b,y1) and (a,y0)-(b,y1)-(a,y1)
    const p = [
      [a[0], y0, a[1], u0, 0],
      [b[0], y0, b[1], u1, 0],
      [b[0], y1, b[1], u1, height / LEVEL_HEIGHT],
      [a[0], y0, a[1], u0, 0],
      [b[0], y1, b[1], u1, height / LEVEL_HEIGHT],
      [a[0], y1, a[1], u0, height / LEVEL_HEIGHT],
    ];
    for (const [x, y, z, u, v] of p) {
      positions.push(x, y, z);
      normals.push(nx, 0, nz);
      uvs.push(u, v);
    }
  }

  // Cap (roof slab) — triangulate the polygon
  const contour = r.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const [cx, cz] = ringCentroid(r);
  for (const [i0, i1, i2] of tris) {
    for (const idx of [i0, i1, i2]) {
      const v = contour[idx];
      positions.push(v.x, height, v.y);
      normals.push(0, 1, 0);
      uvs.push((v.x - cx) / 20, (v.y - cz) / 20);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.userData.plinth = plinth;
  return geo;
}

export function footprintBounds(ring) {
  const angle = longestEdgeAngle(ring);
  const [cx, cz] = ringCentroid(ring);
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    const dx = x - cx;
    const dz = z - cz;
    const rx = dx * c - dz * s;
    const rz = dx * s + dz * c;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minZ = Math.min(minZ, rz);
    maxZ = Math.max(maxZ, rz);
  }
  return { w: maxX - minX, d: maxZ - minZ, cx, cz, angle };
}
