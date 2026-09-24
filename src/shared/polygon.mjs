// Pure 2D polygon helpers shared by the build pipeline and the runtime.
// A Ring is Vec2[] ([x, z] metres), not closed (first point not repeated).

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

export function ringCentroid(ring) {
  let cx = 0;
  let cz = 0;
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    const cross = x1 * z2 - x2 * z1;
    a += cross;
    cx += (x1 + x2) * cross;
    cz += (z1 + z2) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    const m = ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    return [m[0] / ring.length, m[1] / ring.length];
  }
  a *= 3;
  return [cx / a, cz / a];
}

export function pointInRing(p, ring) {
  const [px, pz] = p;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const hit = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function ensureWinding(ring, ccw = true) {
  const positive = ringArea(ring) > 0;
  return positive === ccw ? ring : [...ring].reverse();
}

export function dedupeRing(ring, eps = 0.01) {
  const out = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > eps) out.push([p[0], p[1]]);
  }
  while (
    out.length > 1 &&
    Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps
  ) {
    out.pop();
  }
  return out;
}

function perpDist(p, a, b) {
  const [px, pz] = p;
  const [ax, az] = a;
  const [bx, bz] = b;
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1e-9;
  return Math.abs((px - ax) * dz - (pz - az) * dx) / len;
}

export function simplifyRing(ring, eps = 0.35) {
  if (ring.length < 4) return ring;
  const keep = new Array(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(ring[i], ring[s], ring[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps && idx !== -1) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : ring;
}

// Andrew's monotone chain convex hull. Returns a CCW ring.
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return ensureWinding(lower.concat(upper), true);
}

// Minimum-area-ish oriented bounding rectangle aligned to the longest edge of
// the hull. Returns a 4-point CCW ring.
export function orientedBox(ring) {
  const hull = convexHull(ring);
  const angle = longestEdgeAngle(hull);
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  const [cx, cz] = ringCentroid(hull);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of hull) {
    const dx = x - cx;
    const dz = z - cz;
    const rx = dx * c - dz * s;
    const rz = dx * s + dz * c;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minZ = Math.min(minZ, rz);
    maxZ = Math.max(maxZ, rz);
  }
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const corner = (rx, rz) => [cx + rx * ca - rz * sa, cz + rx * sa + rz * ca];
  return [
    corner(minX, minZ),
    corner(maxX, minZ),
    corner(maxX, maxZ),
    corner(minX, maxZ),
  ];
}

// Clamp an oriented box's half-extents, keeping centroid + orientation.
export function clampOrientedBox(ring, maxLong = 95, maxShort = 60) {
  const box = orientedBox(ring);
  const [cx, cz] = ringCentroid(box);
  const angle = longestEdgeAngle(box);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  let halfL = 0;
  let halfS = 0;
  for (const [x, z] of box) {
    const dx = x - cx;
    const dz = z - cz;
    halfL = Math.max(halfL, Math.abs(dx * c - dz * s));
    halfS = Math.max(halfS, Math.abs(dx * s + dz * c));
  }
  halfL = Math.min(halfL, maxLong / 2);
  halfS = Math.min(halfS, maxShort / 2);
  const corner = (rx, rz) => [cx + rx * ca - rz * sa, cz + rx * sa + rz * ca];
  return [
    corner(-halfL, -halfS),
    corner(halfL, -halfS),
    corner(halfL, halfS),
    corner(-halfL, halfS),
  ];
}

export function longestEdgeAngle(ring) {
  let best = 0;
  let angle = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len > best) {
      best = len;
      angle = Math.atan2(z2 - z1, x2 - x1);
    }
  }
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

// Proper crossing of segments ab and cd (touching at endpoints doesn't count).
function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

// True when no two non-adjacent edges of the ring cross.
export function isSimpleRing(ring) {
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // shares vertex 0
      if (segmentsCross(a, b, ring[j], ring[(j + 1) % n])) return false;
    }
  }
  return true;
}

// Join open polylines (multipolygon member ways) end-to-end into closed rings.
// Points are compared with `eq`; returns rings without the repeated closing
// point. Polylines that never close are dropped.
export function stitchRings(lines, eq = (p, q) => p[0] === q[0] && p[1] === q[1]) {
  const pool = lines.filter((l) => l.length >= 2).map((l) => [...l]);
  const rings = [];
  while (pool.length) {
    let ring = pool.shift();
    let grew = true;
    while (!eq(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      const tail = ring[ring.length - 1];
      for (let i = 0; i < pool.length; i++) {
        const l = pool[i];
        if (eq(l[0], tail)) ring = ring.concat(l.slice(1));
        else if (eq(l[l.length - 1], tail)) ring = ring.concat([...l].reverse().slice(1));
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && eq(ring[0], ring[ring.length - 1])) rings.push(ring.slice(0, -1));
  }
  return rings;
}
