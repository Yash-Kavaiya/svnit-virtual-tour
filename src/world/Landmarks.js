import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { gateFrame } from './gateFrame.js';

export function createLandmarks(campus, registry) {
  const group = new THREE.Group();
  group.name = 'landmarks';
  const pickables = [];

  const statuePoi =
    campus.pois.find((p) => p.type === 'statue') ||
    campus.pois.find((p) => /statue|patel|sardar/i.test(p.name));
  if (statuePoi) group.add(makeStatue(statuePoi, campus.gates?.[0]));

  for (const gate of campus.gates ?? []) group.add(makeGate(gate, gateFrame(gate, campus.bounds)));

  // flagpole + fountain at the Central Library Lawn zone
  const lawn = campus.pois.find((p) => /library lawn|central library lawn/i.test(p.name));
  if (lawn) {
    group.add(makeFlagpole(lawn.x + 8, lawn.z));
    group.add(makeFountain(lawn.x - 10, lawn.z + 6));
  }

  group.traverse((o) => {
    if (o.userData && (o.userData.poi || o.userData.landmark)) pickables.push(o);
  });

  registry.mat('landmark-noop', () => new THREE.MeshBasicMaterial());

  return {
    group,
    pickables,
    dispose() {
      group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
      });
    },
  };
}

function makeStatue(poi, faceTo) {
  const g = new THREE.Group();
  g.position.set(poi.x, 0, poi.z);
  // the figure looks out toward the main gate when there is one
  if (faceTo) g.rotation.y = Math.atan2(faceTo.x - poi.x, faceTo.z - poi.z);
  g.userData.poi = poi;

  const granite = new THREE.MeshStandardMaterial({ color: '#5d5750', roughness: 0.55 });
  const sandstone = new THREE.MeshStandardMaterial({ color: '#c8b48f', roughness: 0.95 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#5f4a2c', roughness: 0.42, metalness: 0.7 });
  const kerb = new THREE.MeshStandardMaterial({ color: '#e4ded0', roughness: 0.9 });
  const lawn = new THREE.MeshStandardMaterial({ color: '#5f8f3c', roughness: 1 });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // roundabout island: kerb ring, lawn, marigold bed around the plinth
  add(new THREE.CylinderGeometry(7.2, 7.2, 0.25, 48), kerb, 0, 0.125, 0);
  add(new THREE.CylinderGeometry(6.9, 6.9, 0.3, 48), lawn, 0, 0.15, 0);
  const marigold = [new THREE.MeshStandardMaterial({ color: '#f29a1d', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#f6c929', roughness: 0.8 })];
  // dense low marigold bed: a dark-green hedge ring studded with blooms
  const hedge = new THREE.MeshStandardMaterial({ color: '#2f5a26', roughness: 1 });
  add(new THREE.TorusGeometry(4.55, 0.42, 6, 48), hedge, 0, 0.3, 0).rotation.x = Math.PI / 2;
  const bloomGeo = new THREE.IcosahedronGeometry(0.1, 0);
  const dummy = new THREE.Object3D();
  marigold.forEach((mat, k) => {
    const n = 160;
    const im = new THREE.InstancedMesh(bloomGeo, mat, n);
    for (let i = 0; i < n; i++) {
      const t = ((i + k * 0.5) / n) * Math.PI * 2;
      const r = 4.55 + Math.sin(i * 7.3 + k) * 0.32;
      dummy.position.set(Math.cos(t) * r, 0.62 + ((i * 13) % 5) * 0.02, Math.sin(t) * r);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    g.add(im);
  });

  // stepped granite base, sandstone pedestal with cornice
  for (let i = 0; i < 3; i++) {
    const s = 4.4 - i * 0.8;
    add(new THREE.BoxGeometry(s, 0.35, s), granite, 0, 0.47 + i * 0.35, 0);
  }
  add(new THREE.BoxGeometry(2.1, 3.2, 2.1), sandstone, 0, 2.95, 0);
  add(new THREE.BoxGeometry(2.5, 0.3, 2.5), granite, 0, 4.7, 0);
  add(new THREE.BoxGeometry(2.3, 0.25, 2.3), sandstone, 0, 4.97, 0);

  // standing figure (~1.4x life size): dhoti, kurta, shawl over the left shoulder
  const fig = new THREE.Group();
  const part = (geo, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, bronze);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    fig.add(m);
    return m;
  };
  for (const sx of [-0.14, 0.14]) part(new THREE.BoxGeometry(0.22, 0.14, 0.36), sx, 0.07, 0.06); // feet
  part(new THREE.CylinderGeometry(0.34, 0.46, 1.25, 12), 0, 0.72, 0); // dhoti
  part(new THREE.CylinderGeometry(0.36, 0.34, 0.95, 12), 0, 1.8, 0); // kurta torso
  part(new THREE.CylinderGeometry(0.3, 0.37, 0.18, 12), 0, 2.32, 0); // shoulders
  const shawl = part(new THREE.CylinderGeometry(0.39, 0.5, 1.2, 12, 1, true, -0.4, 3.4), 0, 1.75, 0, 0, 0.12);
  shawl.material = bronze;
  part(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 8), 0, 2.46, 0); // neck
  part(new THREE.SphereGeometry(0.2, 14, 12), 0, 2.68, 0.01); // head
  part(new THREE.CylinderGeometry(0.075, 0.07, 0.95, 8), -0.45, 1.85, 0.02, 0, 0.1); // left arm, down
  part(new THREE.CylinderGeometry(0.075, 0.07, 0.55, 8), 0.43, 2.05, 0.05, 0, -0.2); // right upper arm
  part(new THREE.CylinderGeometry(0.065, 0.06, 0.5, 8), 0.5, 1.72, 0.2, -1.1, 0); // right forearm forward
  fig.scale.setScalar(1.4);
  fig.position.y = 5.1;
  g.add(fig);

  for (const [side, txt, size] of [
    [1, 'SARDAR VALLABHBHAI PATEL', 0.2],
    [-1, '31 OCTOBER 1875 – 15 DECEMBER 1950', 0.13],
  ]) {
    const plaque = new Text();
    plaque.text = txt;
    plaque.fontSize = size;
    plaque.maxWidth = 1.8;
    plaque.textAlign = 'center';
    plaque.color = '#e8d9a8';
    plaque.anchorX = 'center';
    plaque.anchorY = 'middle';
    plaque.position.set(0, 3.1, side * 1.06);
    if (side < 0) plaque.rotation.y = Math.PI;
    plaque.sync();
    g.add(plaque);
  }

  g.userData.landmark = { name: 'Sardar Vallabhbhai Patel Statue', kind: 'memorial' };
  return g;
}

function makeGate(gate, { inx, inz }) {
  const g = new THREE.Group();
  g.position.set(gate.x, 0, gate.z);
  g.rotation.y = Math.atan2(inx, inz); // local +z points into campus

  const masonry = new THREE.MeshStandardMaterial({ color: '#c9a877', roughness: 0.95 });
  const stone = new THREE.MeshStandardMaterial({ color: '#8c6f4e', roughness: 0.9 });
  const boardMat = new THREE.MeshStandardMaterial({ color: '#6b1f1f', roughness: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.5, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#7f9ea6', roughness: 0.2, metalness: 0.3 });
  const w = gate.width ?? 14;
  const box = (sx, sy, sz, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // main piers: stone base, rendered shaft, projecting capital
  for (const sx of [-w / 2 - 1, w / 2 + 1]) {
    box(2.6, 1.2, 2.6, stone, sx, 0.6, 0);
    box(2.2, 6.4, 2.2, masonry, sx, 4.4, 0);
    box(2.8, 0.5, 2.8, stone, sx, 7.85, 0);
  }
  // name board spanning the carriageway, readable from both sides
  box(w + 4.4, 2.2, 0.7, boardMat, 0, 6.6, 0);
  box(w + 5, 0.3, 1.1, stone, 0, 7.85, 0);
  for (const side of [1, -1]) {
    const lines = [
      ['SARDAR VALLABHBHAI NATIONAL INSTITUTE OF TECHNOLOGY', 0.52, 6.95],
      ['SURAT  ·  ESTD. 1961', 0.36, 6.25],
    ];
    for (const [txt, size, y] of lines) {
      const t = new Text();
      t.text = txt;
      t.fontSize = size;
      t.maxWidth = w + 3.8;
      t.textAlign = 'center';
      t.color = '#f2d58a';
      t.anchorX = 'center';
      t.anchorY = 'middle';
      t.position.set(0, y, side * 0.37);
      if (side < 0) t.rotation.y = Math.PI;
      t.sync();
      g.add(t);
    }
  }

  // pedestrian wickets and boundary-wall stubs either side
  for (const s of [-1, 1]) {
    const x0 = s * (w / 2 + 2.1);
    box(0.9, 3.2, 0.9, masonry, x0 + s * 2.6, 1.6, 0);
    box(2.6, 0.35, 1.0, stone, x0 + s * 1.3, 3.0, 0); // wicket lintel
    box(14, 2.4, 0.35, masonry, x0 + s * 10, 1.2, 0); // wall
    box(14, 0.15, 0.5, stone, x0 + s * 10, 2.45, 0);
    // sliding gate leaf, parked open behind the wall stub
    const leaf = new THREE.Group();
    for (let i = 0; i <= 14; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 0.05), steel);
      bar.position.set(-w / 4 + (i * w) / 28, 1.15, 0);
      leaf.add(bar);
    }
    for (const y of [0.2, 1.15, 2.15]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.08, 0.08), steel);
      rail.position.set(0, y, 0);
      leaf.add(rail);
    }
    leaf.position.set(s * (w / 2 + 2.1 + w / 4 + 1.2), 0, 0.6);
    g.add(leaf);
  }

  // paved carriageway from the road outside to the campus avenue, kerbed
  const paving = new THREE.MeshStandardMaterial({ color: '#56565a', roughness: 0.95 });
  const kerb = new THREE.MeshStandardMaterial({ color: '#d9d4c7', roughness: 0.9 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(w, 16), paving);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.06, 6);
  road.receiveShadow = true;
  g.add(road);
  for (const s of [-1, 1]) box(0.3, 0.18, 16, kerb, s * (w / 2 + 0.15), 0.09, 6);
  const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(w + 44, 12), paving);
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(0, 0.05, -8);
  forecourt.receiveShadow = true;
  g.add(forecourt);

  // guard cabin inside the gate, with a glazed front and flat roof
  const cx = w / 2 + 5;
  box(3.2, 2.7, 3, masonry, cx, 1.35, 4.5);
  box(3.8, 0.25, 3.6, stone, cx, 2.85, 4.5);
  box(2.2, 1.0, 0.06, glass, cx, 1.7, 3.0 - 0.02);
  box(0.06, 1.0, 1.8, glass, cx - 1.62, 1.7, 4.5);

  // boom barrier: striped arm on a post
  box(0.4, 1.1, 0.4, steel, w / 2 - 0.4, 0.55, 3.2);
  const red = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.6 });
  const seg = (w - 1) / 8;
  for (let i = 0; i < 8; i++) {
    box(seg, 0.12, 0.12, i % 2 ? white : red, w / 2 - 0.6 - seg * (i + 0.5), 1.05, 3.2);
  }

  g.userData.landmark = { name: 'Main Gate', kind: 'gate' };
  return g;
}

function makeFlagpole(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.0, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 1 }),
  );
  base.position.y = 0.3;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 14, 8),
    new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.4, metalness: 0.4 }),
  );
  pole.position.y = 7.3;
  pole.castShadow = true;
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshStandardMaterial({ color: '#f0932b', side: THREE.DoubleSide }),
  );
  flag.position.set(1.3, 13, 0);
  g.add(base, pole, flag);
  g.userData.animatedFlag = flag;
  return g;
}

function makeFountain(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const stone = new THREE.MeshStandardMaterial({ color: '#9a9384', roughness: 1 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.4, 8, 24), stone);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 24),
    new THREE.MeshStandardMaterial({ color: '#4c8ea0', roughness: 0.2, transparent: true, opacity: 0.8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.35;
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1.4, 12), stone);
  tier.position.y = 0.9;
  g.add(ring, water, tier);
  return g;
}
