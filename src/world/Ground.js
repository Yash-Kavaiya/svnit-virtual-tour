import * as THREE from 'three';
import { gateFrame } from './gateFrame.js';
import { grassTexture, concreteTexture } from './textures.js';
import { ensureWinding } from '../shared/polygon.mjs';

// Build a THREE.Shape whose local Y = -worldZ, so after `rotation.x = -PI/2`
// (which maps localY -> -worldZ) the polygon lands at the correct world XZ.
function shapeFromRing(ring) {
  const s = new THREE.Shape();
  ring.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

export function createGround(campus, registry) {
  const group = new THREE.Group();
  group.name = 'ground';

  const { bounds } = campus;
  const w = bounds.maxX - bounds.minX + 900;
  const d = bounds.maxZ - bounds.minZ + 900;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  // Base ground plane
  const groundTex = registry.tex('grass-base', () =>
    grassTexture({ base: '#6e8043', repeat: Math.max(w, d) / 6, seed: 21 }),
  );
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, -0.05, cz);
  ground.receiveShadow = true;
  group.add(ground);

  // Campus land pad — slightly lusher grass inside the boundary.
  // `ShapeGeometry` UVs are raw metres, so `repeat` is tiles-per-metre: 0.2
  // gives a ~5 m grass tile. (A boundary-scaled value here tiled hundreds of
  // times per metre and moired down to a flat, muddy mush.)
  const padTex = registry.tex('grass-pad', () =>
    grassTexture({ base: '#647c3d', repeat: 0.2, seed: 42 }),
  );
  const padShape = shapeFromRing(ensureWinding(campus.boundary, true));
  const pad = new THREE.Mesh(
    new THREE.ShapeGeometry(padShape),
    new THREE.MeshStandardMaterial({ map: padTex, roughness: 1 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0;
  pad.receiveShadow = true;
  group.add(pad);

  // Green polygons (parks/gardens) — read them as manicured lawn quadrangles:
  // a touch BRIGHTER and lusher than the surrounding campus pad, textured so
  // they never flatten into a dark slab dropped on the terrain.
  const greenTex = registry.tex('grass-green', () =>
    grassTexture({ base: '#6d8440', repeat: 0.25, seed: 63 }),
  );
  const greenMat = new THREE.MeshStandardMaterial({ map: greenTex, roughness: 1 });
  for (const g of campus.greens ?? []) {
    if (!g.polygon || g.polygon.length < 3) continue;
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeFromRing(g.polygon)), greenMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.03;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Sports grounds — bare earth / turf ovals
  const turfMat = new THREE.MeshStandardMaterial({ color: '#6f8a3c', roughness: 1 });
  const clayMat = new THREE.MeshStandardMaterial({ color: '#b5744a', roughness: 1 });
  for (const gr of campus.grounds ?? []) {
    if (!gr.polygon || gr.polygon.length < 3) continue;
    const isCourt = /tennis|basketball|volleyball/i.test(`${gr.name} ${gr.sport}`);
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shapeFromRing(gr.polygon)),
      isCourt ? clayMat : turfMat,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.04;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Perimeter wall along the boundary
  group.add(buildBoundaryWall(campus.boundary, registry, gateGaps(campus)));

  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    },
  };
}

// Gate openings as { x, z, r }: the wall is cut within r metres of each.
function gateGaps(campus) {
  return (campus.gates ?? []).map((g) => ({
    x: g.x,
    z: g.z,
    r: gateFrame(g, campus.bounds).halfOpening,
  }));
}

// Boundary edges as [a, b] wall runs, with gate openings cut out.
export function wallRuns(boundary, gaps = []) {
  const runs = [];
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i];
    const b = boundary[(i + 1) % boundary.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    let cuts = [];
    for (const g of gaps) {
      const t = ((g.x - a[0]) * dx + (g.z - a[1]) * dz) / (len * len);
      const off = Math.abs((g.x - a[0]) * dz - (g.z - a[1]) * dx) / len;
      if (off > g.r) continue;
      const half = Math.sqrt(g.r * g.r - off * off) / len;
      if (t + half < 0 || t - half > 1) continue;
      cuts.push([t - half, t + half]);
    }
    cuts = cuts.sort((p, q) => p[0] - q[0]);
    let t0 = 0;
    const at = (t) => [a[0] + dx * t, a[1] + dz * t];
    for (const [c0, c1] of cuts) {
      if (c0 > t0) runs.push([at(t0), at(Math.min(c0, 1))]);
      t0 = Math.max(t0, c1);
    }
    if (t0 < 1) runs.push([at(t0), b]);
  }
  return runs;
}

function buildBoundaryWall(boundary, registry, gaps = []) {
  const wall = new THREE.Group();
  wall.name = 'boundary-wall';
  const height = 2.4;
  const thick = 0.35;
  const mat = registry.mat('wall', () => {
    const tex = concreteTexture({ tint: '#c8b48f', repeat: 6, seed: 9 });
    return new THREE.MeshStandardMaterial({ map: tex, color: '#cdb898', roughness: 0.95 });
  });
  const pierMat = registry.mat('wall-pier', () => new THREE.MeshStandardMaterial({ color: '#b7a077', roughness: 0.9 }));

  const segGeoCache = new Map();
  for (const [a, b] of wallRuns(boundary, gaps)) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    const key = Math.round(len);
    let geo = segGeoCache.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(len, height, thick);
      segGeoCache.set(key, geo);
    }
    const seg = new THREE.Mesh(geo, mat);
    seg.position.set((a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2);
    seg.rotation.y = -Math.atan2(dz, dx);
    seg.castShadow = true;
    seg.receiveShadow = true;
    wall.add(seg);

    // piers every ~20 m
    const piers = Math.max(1, Math.floor(len / 20));
    const pierGeo = registry.geo('wall-pier-geo', () => new THREE.BoxGeometry(0.6, height + 0.5, 0.6));
    for (let p = 0; p <= piers; p++) {
      const t = p / piers;
      const pier = new THREE.Mesh(pierGeo, pierMat);
      pier.position.set(a[0] + dx * t, (height + 0.5) / 2, a[1] + dz * t);
      pier.castShadow = true;
      wall.add(pier);
    }
  }
  return wall;
}
