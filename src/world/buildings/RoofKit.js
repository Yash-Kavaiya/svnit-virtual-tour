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
    tank: registry.mat('roof-tank', () => new THREE.MeshStandardMaterial({ color: '#3f5f8a', roughness: 0.7 })),
    metal: registry.mat('roof-metal', () => new THREE.MeshStandardMaterial({ color: '#b9bdc2', roughness: 0.5, metalness: 0.3 })),
    box: registry.mat('roof-box', () => new THREE.MeshStandardMaterial({ color: '#cfc7b6', roughness: 0.9 })),
    solar: registry.mat('roof-solar', () => new THREE.MeshStandardMaterial({ color: '#1b2b45', roughness: 0.3, metalness: 0.4 })),
  };

  // parapet
  const parGeo = new THREE.BoxGeometry(w, 1.0, 0.25);
  for (const [len, lx, lz, rot] of [
    [w, 0, d / 2, 0],
    [w, 0, -d / 2, 0],
    [d, w / 2, 0, Math.PI / 2],
    [d, -w / 2, 0, Math.PI / 2],
  ]) {
    const seg = new THREE.Mesh(
      rot ? new THREE.BoxGeometry(len, 1.0, 0.25) : parGeo,
      mats.box,
    );
    const [px, pz] = place(lx, lz);
    seg.position.set(px, height + 0.5, pz);
    seg.rotation.y = angle + rot;
    roof.add(seg);
  }

  const tanks = category === 'hostel' ? 2 + Math.floor(rnd() * 3) : rnd() < 0.7 ? 1 : 0;
  for (let i = 0; i < tanks; i++) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 12), mats.tank);
    const [px, pz] = place((rnd() - 0.5) * w * 0.7, (rnd() - 0.5) * d * 0.7);
    tank.position.set(px, height + 1.35, pz);
    // stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.8), mats.metal);
    stand.position.set(px, height + 0.5, pz);
    tank.castShadow = true;
    roof.add(stand, tank);
  }

  // stair headroom
  const stair = new THREE.Mesh(new THREE.BoxGeometry(Math.min(4, w * 0.3), 2.6, Math.min(4, d * 0.3)), mats.box);
  const [sx, sz] = place(-w * 0.28, -d * 0.28);
  stair.position.set(sx, height + 1.8, sz);
  stair.castShadow = true;
  roof.add(stair);

  // AC condensers
  const acs = 2 + Math.floor(rnd() * 4);
  const acGeo = registry.geo('roof-ac', () => new THREE.BoxGeometry(0.9, 0.7, 0.9));
  for (let i = 0; i < acs; i++) {
    const ac = new THREE.Mesh(acGeo, mats.metal);
    const [px, pz] = place((rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * d * 0.8);
    ac.position.set(px, height + 0.85, pz);
    roof.add(ac);
  }

  // solar panels (academic / hostel / library)
  if (['academic', 'hostel', 'library', 'admin'].includes(category) && rnd() < 0.85) {
    const rows = 1 + Math.floor(rnd() * 3);
    for (let r = 0; r < rows; r++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, w * 0.5), 0.08, 1.6), mats.solar);
      const [px, pz] = place(w * 0.05, -d * 0.1 + r * 2.2 - rows);
      panel.position.set(px, height + 0.9, pz);
      panel.rotation.set(-0.35, angle, 0);
      roof.add(panel);
    }
  }

  // vent pipes
  const ventGeo = registry.geo('roof-vent', () => new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6));
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(ventGeo, mats.metal);
    const [px, pz] = place((rnd() - 0.5) * w * 0.6, (rnd() - 0.5) * d * 0.6);
    v.position.set(px, height + 1.1, pz);
    roof.add(v);
  }

  group.add(roof);
  return roof;
}
