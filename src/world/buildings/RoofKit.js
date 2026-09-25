import * as THREE from 'three';
import { mulberry32 } from '../../core/rng.js';
import { footprintBounds } from './extrude.js';
import { pointInRing } from '../../shared/polygon.mjs';

function edgeDist(x, z, a, b) {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
  return Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
}

// Rooftop clutter: water tanks, stair headroom, AC units, solar panels, vents,
// parapet, and (for tall named blocks) a sign frame. Weighted by category.
export function populateRoof(group, { footprint, holes = [], height, category, seed = 1, registry }) {
  const rnd = mulberry32(seed);
  const { w, d, cx, cz, angle } = footprintBounds(footprint);
  const roof = new THREE.Group();
  roof.name = 'roof';
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // a point is usable when it is on the slab: inside the outline, out of any
  // courtyard, and >= 1.5 m from every edge (concave wings, L/U shapes)
  const clear = (x, z) => {
    if (!pointInRing([x, z], footprint) || holes.some((h) => pointInRing([x, z], h))) return false;
    for (const loop of [footprint, ...holes]) {
      for (let i = 0; i < loop.length; i++) {
        if (edgeDist(x, z, loop[i], loop[(i + 1) % loop.length]) < 1.5) return false;
      }
    }
    return true;
  };
  // local offset -> world, nudged toward random on-roof spots if it misses
  const place = (lx, lz) => {
    let p = [cx + lx * c - lz * s, cz + lx * s + lz * c];
    for (let k = 0; k < 12 && !clear(p[0], p[1]); k++) {
      const rx = (rnd() - 0.5) * w * 0.9;
      const rz = (rnd() - 0.5) * d * 0.9;
      p = [cx + rx * c - rz * s, cz + rx * s + rz * c];
    }
    return clear(p[0], p[1]) ? p : null;
  };

  const mats = {
    // black rotomoulded (Sintex-style) tanks, as on most Indian rooftops
    tank: registry.mat('roof-tank', () => new THREE.MeshStandardMaterial({ color: '#1e1f22', roughness: 0.6 })),
    metal: registry.mat('roof-metal', () => new THREE.MeshStandardMaterial({ color: '#b9bdc2', roughness: 0.5, metalness: 0.3 })),
    box: registry.mat('roof-box', () => new THREE.MeshStandardMaterial({ color: '#cfc7b6', roughness: 0.9 })),
    solar: registry.mat('roof-solar', () => new THREE.MeshStandardMaterial({ color: '#1b2b45', roughness: 0.3, metalness: 0.4 })),
  };

  // (parapet + cornice are built by facadeDetails.buildRoofCrown)

  // water tanks on shared instanced meshes-worth of geometry (few, so plain)
  const tanks = category === 'hostel' ? 2 + Math.floor(rnd() * 2) : rnd() < 0.6 ? 1 : 0;
  const tankGeo = registry.geo('roof-tank', () => new THREE.CylinderGeometry(0.72, 0.8, 1.5, 12));
  const standGeo = registry.geo('roof-stand', () => new THREE.BoxGeometry(1.8, 1.0, 1.8));
  for (let i = 0; i < tanks; i++) {
    const spot = place((rnd() - 0.5) * w * 0.6, (rnd() - 0.5) * d * 0.6);
    if (!spot) continue;
    const [px, pz] = spot;
    const tank = new THREE.Mesh(tankGeo, mats.tank);
    tank.position.set(px, height + 1.75, pz);
    const stand = new THREE.Mesh(standGeo, mats.metal);
    stand.position.set(px, height + 0.5, pz);
    tank.castShadow = true;
    roof.add(stand, tank);
  }

  // stair headroom
  const stair = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(4, w * 0.3), 2.6, Math.min(4, d * 0.3)),
    mats.box,
  );
  const stairSpot = place(-w * 0.28, -d * 0.28);
  if (stairSpot) {
    stair.position.set(stairSpot[0], height + 1.8, stairSpot[1]);
    stair.castShadow = true;
    roof.add(stair);
  }

  // a couple of AC condensers
  const acGeo = registry.geo('roof-ac', () => new THREE.BoxGeometry(0.9, 0.7, 0.9));
  for (let i = 0; i < 2; i++) {
    const spot = place((rnd() - 0.5) * w * 0.7, (rnd() - 0.5) * d * 0.7);
    if (!spot) continue;
    const ac = new THREE.Mesh(acGeo, mats.metal);
    ac.position.set(spot[0], height + 0.85, spot[1]);
    roof.add(ac);
  }

  // one solar array
  if (['academic', 'hostel', 'library', 'admin'].includes(category) && rnd() < 0.8) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, w * 0.5), 0.08, 2.4), mats.solar);
    const spot = place(w * 0.05, -d * 0.1);
    if (spot) {
      panel.position.set(spot[0], height + 0.95, spot[1]);
      panel.rotation.set(-0.35, angle, 0);
      roof.add(panel);
    }
  }

  group.add(roof);
  return roof;
}
