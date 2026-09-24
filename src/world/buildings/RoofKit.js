import * as THREE from 'three';
import { mulberry32 } from '../../core/rng.js';
import { footprintBounds } from './extrude.js';

// Rooftop clutter: water tanks, stair headroom, AC units, solar panels, vents,
// parapet, and (for tall named blocks) a sign frame. Weighted by category.
export function populateRoof(group, { footprint, height, category, seed = 1, registry }) {
  const rnd = mulberry32(seed);
  const { w, d, cx, cz, angle } = footprintBounds(footprint);
  const roof = new THREE.Group();
  roof.name = 'roof';
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const place = (lx, lz) => [cx + lx * c - lz * s, cz + lx * s + lz * c];

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
    const [px, pz] = place((rnd() - 0.5) * w * 0.6, (rnd() - 0.5) * d * 0.6);
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
  const [sx, sz] = place(-w * 0.28, -d * 0.28);
  stair.position.set(sx, height + 1.8, sz);
  stair.castShadow = true;
  roof.add(stair);

  // a couple of AC condensers
  const acGeo = registry.geo('roof-ac', () => new THREE.BoxGeometry(0.9, 0.7, 0.9));
  for (let i = 0; i < 2; i++) {
    const ac = new THREE.Mesh(acGeo, mats.metal);
    const [px, pz] = place((rnd() - 0.5) * w * 0.7, (rnd() - 0.5) * d * 0.7);
    ac.position.set(px, height + 0.85, pz);
    roof.add(ac);
  }

  // one solar array
  if (['academic', 'hostel', 'library', 'admin'].includes(category) && rnd() < 0.8) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, w * 0.5), 0.08, 2.4), mats.solar);
    const [px, pz] = place(w * 0.05, -d * 0.1);
    panel.position.set(px, height + 0.95, pz);
    panel.rotation.set(-0.35, angle, 0);
    roof.add(panel);
  }

  group.add(roof);
  return roof;
}
