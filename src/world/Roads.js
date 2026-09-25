import * as THREE from 'three';
import { asphaltTexture, concreteTexture } from './textures.js';

const ROAD_Y = 0.06;

// Build a flat ribbon along a polyline, offset +/- width/2 with mitred joints.
// Returns typed arrays for a BufferGeometry (XZ plane, y = ROAD_Y).
export function buildRoadRibbon(path, width) {
  const n = path.length;
  const half = width / 2;
  const left = [];
  const right = [];

  for (let i = 0; i < n; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    const next = path[i + 1];

    let nx;
    let nz;
    if (prev && next) {
      const d1 = norm(cur[0] - prev[0], cur[1] - prev[1]);
      const d2 = norm(next[0] - cur[0], next[1] - cur[1]);
      let mx = d1[0] + d2[0];
      let mz = d1[1] + d2[1];
      const ml = Math.hypot(mx, mz);
      if (ml < 1e-4) {
        nx = -d1[1];
        nz = d1[0];
      } else {
        mx /= ml;
        mz /= ml;
        // miter normal is perpendicular to the average tangent
        const px = -mz;
        const pz = mx;
        // clamp miter length at sharp corners
        const cos = px * -d1[1] + pz * d1[0];
        const scale = Math.min(1 / Math.max(Math.abs(cos), 0.35), 2.5);
        nx = px * scale;
        nz = pz * scale;
      }
    } else {
      const seg = prev
        ? norm(cur[0] - prev[0], cur[1] - prev[1])
        : norm(next[0] - cur[0], next[1] - cur[1]);
      nx = -seg[1];
      nz = seg[0];
    }

    left.push([cur[0] + nx * half, cur[1] + nz * half]);
    right.push([cur[0] - nx * half, cur[1] - nz * half]);
  }

  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  let dist = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    const v = dist / width;
    positions.set([left[i][0], ROAD_Y, left[i][1]], i * 6);
    positions.set([right[i][0], ROAD_Y, right[i][1]], i * 6 + 3);
    uvs.set([0, v], i * 4);
    uvs.set([1, v], i * 4 + 2);
  }

  const indices = new Uint32Array((n - 1) * 6);
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    indices.set([a, c, b, b, c, d], i * 6);
  }

  return { positions, uvs, indices };
}

function norm(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

export function createRoads(campus, registry) {
  const group = new THREE.Group();
  group.name = 'roads';

  const asphaltMat = registry.mat('road-asphalt', () => {
    const tex = asphaltTexture({ repeat: 1, seed: 13 });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // texture already carries the asphalt tone; a coloured tint on top only
    // drove it to near-black in shade. Keep the tint white.
    return new THREE.MeshStandardMaterial({ map: tex, color: '#ffffff', roughness: 0.92 });
  });
  const pathMat = registry.mat('road-path', () => {
    const tex = concreteTexture({ tint: '#c2b49a', repeat: 1, seed: 17 });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, color: '#c8bda6', roughness: 1 });
  });

  const buckets = new Map(); // matKey -> {positions, indices, uvs, offset}
  const push = (key, ribbon) => {
    if (!buckets.has(key)) buckets.set(key, { pos: [], idx: [], uv: [], base: 0 });
    const bk = buckets.get(key);
    const vcount = ribbon.positions.length / 3;
    bk.pos.push(...ribbon.positions);
    bk.uv.push(...ribbon.uvs);
    for (const i of ribbon.indices) bk.idx.push(i + bk.base);
    bk.base += vcount;
  };

  const centreSegments = [];
  for (const road of campus.roads) {
    if (!road.path || road.path.length < 2) continue;
    const ribbon = buildRoadRibbon(road.path, road.width);
    const isPath = road.class === 'footway' || road.class === 'path' || road.class === 'steps';
    push(isPath ? 'path' : 'asphalt', ribbon);
    if ((road.class === 'primary' || road.class === 'secondary') && road.width >= 5.5) {
      centreSegments.push(road.path);
    }
  }

  for (const [key, bk] of buckets) {
    if (!bk.pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bk.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(bk.uv, 2));
    geo.setIndex(bk.idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, key === 'path' ? pathMat : asphaltMat);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // black-and-white painted kerbs along the drivable roads
  const kerbRuns = buildKerbRuns(campus.roads);
  if (kerbRuns.length) {
    const kerbMat = registry.mat('road-kerb', () =>
      new THREE.MeshStandardMaterial({ map: kerbPaintTexture(), roughness: 0.9 }),
    );
    const kerbs = new THREE.Mesh(kerbGeometry(kerbRuns), kerbMat);
    kerbs.name = 'kerbs';
    kerbs.receiveShadow = true;
    group.add(kerbs);
  }

  // dashed centre lines
  if (centreSegments.length) {
    const lineMat = registry.mat('road-centreline', () => new THREE.MeshBasicMaterial({ color: '#e8df9a' }));
    for (const path of centreSegments) {
      let acc = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const dir = [(b[0] - a[0]) / segLen, (b[1] - a[1]) / segLen];
        for (let d = 0; d < segLen; d += 6) {
          if ((Math.floor((acc + d) / 3)) % 2 !== 0) continue;
          const dash = new THREE.Mesh(
            registry.geo('centreline-dash', () => new THREE.PlaneGeometry(0.18, 2.4)),
            lineMat,
          );
          dash.rotation.x = -Math.PI / 2;
          dash.rotation.z = -Math.atan2(dir[1], dir[0]) - Math.PI / 2;
          dash.position.set(a[0] + dir[0] * d, ROAD_Y + 0.01, a[1] + dir[1] * d);
          group.add(dash);
        }
        acc += segLen;
      }
    }
  }

  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
      });
    },
  };
}

// ---- painted kerbs ---------------------------------------------------------

const KERB_H = 0.16;
const KERB_W = 0.24;

function segDist(x, z, a, b) {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
  return Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
}

// Kerb lines along both edges of every drivable road, resampled every ~1 m
// and cut wherever the line runs over another road (junctions, crossings).
// Returns runs of [x, z, s] points (s = distance along, for the paint).
export function buildKerbRuns(roads, step = 1) {
  const drivable = roads.filter(
    (r) => r.path?.length >= 2 && r.width >= 4 && !['footway', 'path', 'steps'].includes(r.class),
  );
  // padded bounding boxes: cheap reject before the per-segment distance test
  const boxes = drivable.map((r) => {
    const pad = r.width / 2 + 0.6;
    const xs = r.path.map((p) => p[0]);
    const zs = r.path.map((p) => p[1]);
    return [Math.min(...xs) - pad, Math.min(...zs) - pad, Math.max(...xs) + pad, Math.max(...zs) + pad];
  });
  const runs = [];
  drivable.forEach((road, ri) => {
    const off = road.width / 2 + KERB_W / 2;
    for (const side of [-1, 1]) {
      let run = [];
      let s = 0;
      const flush = () => {
        if (run.length >= 3) runs.push(run);
        run = [];
      };
      for (let i = 0; i < road.path.length - 1; i++) {
        const a = road.path[i];
        const b = road.path[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 1e-6) continue;
        const dx = (b[0] - a[0]) / len;
        const dz = (b[1] - a[1]) / len;
        const nx = -dz * side;
        const nz = dx * side;
        for (let d = 0; d < len; d += step) {
          const x = a[0] + dx * d + nx * off;
          const z = a[1] + dz * d + nz * off;
          const onOther = drivable.some(
            (o, oi) =>
              oi !== ri &&
              x >= boxes[oi][0] &&
              z >= boxes[oi][1] &&
              x <= boxes[oi][2] &&
              z <= boxes[oi][3] &&
              o.path.some((p, k) => k < o.path.length - 1 && segDist(x, z, p, o.path[k + 1]) < o.width / 2 + 0.6),
          );
          if (onOther) flush();
          else run.push([x, z, s + d]);
        }
        s += len;
      }
      flush();
    }
  });
  return runs;
}

// Raised strip (road-facing side + top) along each run, UV.u = metres / 2 so
// a two-texel black/white texture paints 1 m bands.
function kerbGeometry(runs) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (const run of runs) {
    for (let i = 0; i < run.length - 1; i++) {
      const [x0, z0, s0] = run[i];
      const [x1, z1, s1] = run[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len > 3) continue; // a gap in the run (segment boundary jump)
      const nx = -(z1 - z0) / (len || 1);
      const nz = (x1 - x0) / (len || 1);
      const hw = KERB_W / 2;
      const quad = (p) => {
        const base = pos.length / 3;
        for (const [x, y, z, u, v] of p) {
          pos.push(x, y, z);
          uv.push(u, v);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        idx.push(base, base + 2, base + 1, base, base + 3, base + 2); // double-sided
      };
      // top
      quad([
        [x0 - nx * hw, KERB_H, z0 - nz * hw, s0 / 2, 0],
        [x1 - nx * hw, KERB_H, z1 - nz * hw, s1 / 2, 0],
        [x1 + nx * hw, KERB_H, z1 + nz * hw, s1 / 2, 1],
        [x0 + nx * hw, KERB_H, z0 + nz * hw, s0 / 2, 1],
      ]);
      // both vertical faces
      for (const k of [-hw, hw]) {
        quad([
          [x0 + nx * k, 0, z0 + nz * k, s0 / 2, 0],
          [x1 + nx * k, 0, z1 + nz * k, s1 / 2, 0],
          [x1 + nx * k, KERB_H, z1 + nz * k, s1 / 2, 1],
          [x0 + nx * k, KERB_H, z0 + nz * k, s0 / 2, 1],
        ]);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function kerbPaintTexture() {
  const data = new Uint8Array([28, 28, 30, 255, 236, 234, 226, 255]);
  const tex = new THREE.DataTexture(data, 2, 1);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
