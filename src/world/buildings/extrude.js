import * as THREE from 'three';
import { ringCentroid, longestEdgeAngle, ensureWinding } from '../../shared/polygon.mjs';

const LEVEL_HEIGHT = 3.4;

// Build walls (outward-facing, per-floor UV.v) + a flat cap for a footprint ring.
// Non-indexed BufferGeometry with explicit normals for crisp wall shading.
export function extrudeFootprint(ring, height, opts = {}) {
  const r = ensureWinding(ring, true);
  // courtyards wind clockwise, so the same edge normal points into the court
  const holes = (opts.holes ?? []).map((h) => ensureWinding(h, false));
  const plinth = opts.plinthHeight ?? 0;

  const positions = [];
  const normals = [];
  const uvs = [];

  // Walls: outer ring, then each courtyard
  const wallVertStart = 0;
  for (const loop of [r, ...holes]) {
    const n = loop.length;
    let perim = 0;
    for (let i = 0; i < n; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % n];
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
      // two triangles, counter-clockwise seen from outside (along +normal):
      // (a,y0)-(b,y1)-(b,y0) and (a,y0)-(a,y1)-(b,y1)
      const p = [
        [a[0], y0, a[1], u0, 0],
        [b[0], y1, b[1], u1, height / LEVEL_HEIGHT],
        [b[0], y0, b[1], u1, 0],
        [a[0], y0, a[1], u0, 0],
        [a[0], y1, a[1], u0, height / LEVEL_HEIGHT],
        [b[0], y1, b[1], u1, height / LEVEL_HEIGHT],
      ];
      for (const [x, y, z, u, v] of p) {
        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        uvs.push(u, v);
      }
    }
  }

  const wallVertCount = positions.length / 3 - wallVertStart;

  // Cap (roof slab), open over courtyards. Try earcut; fall back to a centroid
  // fan (outer ring only) if it fails or returns nothing.
  const capVertStart = positions.length / 3;
  const contour = r.map(([x, z]) => new THREE.Vector2(x, z));
  const holeContours = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  const allPts = contour.concat(...holeContours);
  const [cx, cz] = ringCentroid(r);
  let tris;
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, holeContours) ?? [];
  } catch {
    tris = [];
  }
  if (tris.length) {
    for (const [i0, i1, i2] of tris) {
      // earcut winds in the x/y plane; mapped onto x/z that can face down and
      // get back-face culled (roofs vanished from above). Force +Y facing.
      const a = allPts[i0];
      const b = allPts[i1];
      const c = allPts[i2];
      const up = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y) > 0;
      for (const idx of up ? [i0, i1, i2] : [i0, i2, i1]) {
        const v = allPts[idx];
        positions.push(v.x, height, v.y);
        normals.push(0, 1, 0);
        uvs.push((v.x - cx) / 20, (v.y - cz) / 20);
      }
    }
  } else {
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      positions.push(cx, height, cz, b[0], height, b[1], a[0], height, a[1]);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      uvs.push(0, 0, (b[0] - cx) / 20, (b[1] - cz) / 20, (a[0] - cx) / 20, (a[1] - cz) / 20);
    }
  }

  const capVertCount = positions.length / 3 - capVertStart;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // group 0 = walls (facade material), group 1 = roof cap (roof-slab material)
  geo.addGroup(wallVertStart, wallVertCount, 0);
  if (capVertCount > 0) geo.addGroup(capVertStart, capVertCount, 1);
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
