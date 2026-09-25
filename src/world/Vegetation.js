import * as THREE from 'three';
import { mulberry32, hashString } from '../core/rng.js';
import { pointInRing } from '../shared/polygon.mjs';
import { SPECIES, hedgeSegment } from './plantModels.js';
import { Settings } from '../core/Settings.js';
import { gateFrame } from './gateFrame.js';

// Blue-noise-ish scatter with rejection. Deterministic for a given seed.
export function scatterPoints({ bounds, count, seed = 1, reject, minSpacing = 6 }) {
  const rnd = mulberry32(seed);
  const out = [];
  const cell = minSpacing;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const tries = count * 12;

  for (let i = 0; i < tries && out.length < count; i++) {
    const x = bounds.minX + rnd() * spanX;
    const z = bounds.minZ + rnd() * spanZ;
    if (reject && reject(x, z)) continue;
    let ok = true;
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1 && ok; dx++) {
      for (let dz = -1; dz <= 1 && ok; dz++) {
        const list = grid.get(`${cx + dx},${cz + dz}`);
        if (list) {
          for (const p of list) {
            if (Math.hypot(p[0] - x, p[1] - z) < minSpacing) {
              ok = false;
              break;
            }
          }
        }
      }
    }
    if (!ok) continue;
    const p = [x, z];
    out.push(p);
    const kk = key(x, z);
    if (!grid.has(kk)) grid.set(kk, []);
    grid.get(kk).push(p);
  }
  return out;
}

// trees are instanced (a few draw calls), so even 'low' keeps a green campus
const DENSITY = { low: 0.3, medium: 0.5, high: 1, ultra: 1.6 };

// Per-tree canopy tint, returned as an [r, g, b] MULTIPLIER centred on 1.0.
// It is written into `InstancedMesh.instanceColor`, which the shader multiplies
// against `material.color` (the leaf green). Returning an absolute leaf colour
// here would square the green and crush every canopy to near-black — so every
// channel must stay close to white. `rr` is a 0..1 PRNG.
export function canopyTint(rr) {
  const shade = 0.82 + rr() * 0.34; // 0.82 .. 1.16 brightness
  const warm = (rr() - 0.5) * 0.06; // faint warm/cool cast per tree
  return [shade * (1 + warm), shade, shade * (1 - warm)];
}

export function createVegetation(campus, registry) {
  const group = new THREE.Group();
  group.name = 'vegetation';

  const density = DENSITY[Settings.get('quality')] ?? 1;
  if (density === 0) return { group, dispose() {} };

  const { bounds, buildings, roads, water } = campus;

  // rejection: too close to a building wall, inside water, or on a road.
  // Hero buildings (library / admin / auditorium) keep a wider forecourt so
  // their facades and entrances are never buried in trees.
  const HERO = new Set(['library', 'admin', 'auditorium']);
  const buildingRings = buildings.map((b) => ({
    ring: b.footprint,
    holes: b.holes ?? [],
    pad: HERO.has(b.category) ? 15 : 6.5,
  }));
  const waterRings = (water ?? []).map((w) => w.polygon);
  // spawn point plus the gate carriageway and forecourt stay clear
  const spawnSpots = (campus.gates ?? []).flatMap((g) => {
    const { inx, inz } = gateFrame(g, bounds);
    return [-12, 0, 14, 28].map((d) => [g.x + inx * d, g.z + inz * d]);
  });

  const reject = (x, z) => {
    for (const s of spawnSpots) if (Math.hypot(x - s[0], z - s[1]) < 14) return true;
    for (const { ring, holes, pad } of buildingRings) {
      const court = holes.find((h) => pointInRing([x, z], h));
      if (court) {
        // a courtyard garden: fine, if clear of the courtyard walls
        for (let i = 0; i < court.length; i++) {
          if (distToSeg(x, z, court[i], court[(i + 1) % court.length]) < 4.5) return true;
        }
        continue;
      }
      if (pointInRing([x, z], ring)) return true;
      for (let i = 0; i < ring.length; i++) {
        if (distToSeg(x, z, ring[i], ring[(i + 1) % ring.length]) < pad) return true;
      }
    }
    for (const r of waterRings) if (pointInRing([x, z], r)) return true;
    for (const road of roads) {
      for (let i = 0; i < road.path.length - 1; i++) {
        if (distToSeg(x, z, road.path[i], road.path[i + 1]) < road.width / 2 + 1.2) return true;
      }
    }
    return false;
  };

  // --- avenue trees along roads
  const avenue = [];
  for (const road of roads) {
    if (road.width < 4) continue;
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = road.path[i];
      const b = road.path[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dirx = (b[0] - a[0]) / (len || 1);
      const dirz = (b[1] - a[1]) / (len || 1);
      const nx = -dirz;
      const nz = dirx;
      const gap = 16;
      for (let d = 6; d < len; d += gap) {
        for (const side of [-1, 1]) {
          const off = road.width / 2 + 2.4;
          const x = a[0] + dirx * d + nx * side * off;
          const z = a[1] + dirz * d + nz * side * off;
          if (!reject(x, z)) avenue.push([x, z]);
        }
      }
    }
  }

  // --- scattered groves (kept airy — a lawned campus, not a forest)
  const scatterCount = Math.round(680 * density);
  const scattered = scatterPoints({
    bounds,
    count: scatterCount,
    seed: 4242,
    reject,
    minSpacing: 11,
  });

  const all = avenue.concat(scattered);
  const rnd = mulberry32(1234);
  const speciesKeys = Object.keys(SPECIES);

  // group placements by species
  const bySpecies = new Map();
  for (const [x, z] of all) {
    const k =
      Math.abs(z) > 400 || x > 300
        ? speciesKeys[Math.floor(rnd() * speciesKeys.length)]
        : rnd() < 0.5
          ? 'neem'
          : rnd() < 0.6
            ? 'gulmohar'
            : rnd() < 0.7
              ? 'ashoka'
              : 'palm';
    if (!bySpecies.has(k)) bySpecies.set(k, []);
    bySpecies.get(k).push([x, z]);
  }

  const dummy = new THREE.Object3D();
  for (const [name, pts] of bySpecies) {
    if (!pts.length) continue;
    const model = SPECIES[name]();
    const trunkMesh = new THREE.InstancedMesh(model.trunk.geometry, model.trunk.material, pts.length);
    const canopyMesh = new THREE.InstancedMesh(
      model.canopy.geometry,
      model.canopy.material.clone(),
      pts.length,
    );
    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;
    const cs = model.canopy.scale ?? [1, 1, 1];
    const tint = new THREE.Color(); // per-instance multiplier — see canopyTint()
    pts.forEach(([x, z], i) => {
      const rr = mulberry32(hashString(`${x},${z}`));
      const s = 0.8 + rr() * 0.7;
      const rot = rr() * Math.PI * 2;
      const lean = (rr() - 0.5) * 0.12;
      dummy.position.set(x, (model.trunk.geometry.parameters.height / 2) * s, z);
      dummy.rotation.set(lean, rot, lean);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, model.canopy.offsetY * s, z);
      dummy.rotation.set(0, rot, 0);
      const cj = 0.92 + rr() * 0.18;
      dummy.scale.set(cs[0] * s * cj, cs[1] * s * (0.95 + rr() * 0.15), cs[2] * s * cj);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i, dummy.matrix);

      tint.setRGB(...canopyTint(rr));
      canopyMesh.setColorAt(i, tint);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
    group.add(trunkMesh, canopyMesh);
  }

  // --- hedges lining primary roads
  const hedge = hedgeSegment();
  const hedgePts = [];
  for (const road of roads) {
    if (road.class !== 'primary' && road.class !== 'secondary') continue;
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = road.path[i];
      const b = road.path[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dirx = (b[0] - a[0]) / (len || 1);
      const dirz = (b[1] - a[1]) / (len || 1);
      for (let d = 0; d < len; d += 2) {
        for (const side of [-1, 1]) {
          const off = road.width / 2 + 0.8;
          hedgePts.push([a[0] + dirx * d - dirz * side * off, a[1] + dirz * d + dirx * side * off, Math.atan2(dirz, dirx)]);
        }
      }
    }
  }
  if (hedgePts.length) {
    const hedgeMesh = new THREE.InstancedMesh(hedge.geometry, hedge.material, hedgePts.length);
    hedgePts.forEach(([x, z, rot], i) => {
      dummy.position.set(x, 0.55, z);
      dummy.rotation.set(0, -rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hedgeMesh.setMatrixAt(i, dummy.matrix);
    });
    hedgeMesh.instanceMatrix.needsUpdate = true;
    hedgeMesh.castShadow = true;
    group.add(hedgeMesh);
  }

  registry.mat('veg-noop', () => new THREE.MeshBasicMaterial());

  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o.isInstancedMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    },
  };
}

function distToSeg(px, pz, a, b) {
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((px - a[0]) * abx + (pz - a[1]) * abz) / (abx * abx + abz * abz || 1)),
  );
  return Math.hypot(a[0] + abx * t - px, a[1] + abz * t - pz);
}
