import * as THREE from 'three';
import { Text } from 'troika-three-text';

const M = {
  wood: () => new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.8 }),
  darkWood: () => new THREE.MeshStandardMaterial({ color: '#5a3c22', roughness: 0.8 }),
  metal: () => new THREE.MeshStandardMaterial({ color: '#6b7078', roughness: 0.4, metalness: 0.4 }),
  fabric: (c = '#3f5c7a') => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }),
  plastic: (c = '#d8d8d8') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }),
  paper: () => new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 1 }),
};

export function deskChair() {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), M.plastic('#33414f'));
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.06), M.plastic('#33414f'));
  back.position.set(0, 0.74, -0.2);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 6), M.metal());
  post.position.y = 0.22;
  g.add(seat, back, post);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function longTable(len = 3.2) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 1.0), M.wood());
  top.position.y = 0.75;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  for (const sx of [-len / 2 + 0.2, len / 2 - 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.9), M.darkWood());
    leg.position.set(sx, 0.375, 0);
    g.add(leg);
  }
  return g;
}

export function bookshelf(w = 2.4, h = 2.4) {
  const g = new THREE.Group();
  const frameMat = M.darkWood();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
  back.position.set(0, h / 2, -0.16);
  g.add(back);
  for (const sx of [-w / 2, w / 2]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.35), frameMat);
    side.position.set(sx, h / 2, 0);
    g.add(side);
  }
  const shelves = 5;
  for (let i = 0; i <= shelves; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.35), frameMat);
    s.position.set(0, (i / shelves) * h, 0);
    g.add(s);
  }
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

// Instanced book spines to fill a shelf run cheaply.
export function bookRow(count, width, height = 0.28) {
  const geo = new THREE.BoxGeometry(width / count, height, 0.22);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = ['#7a3b3b', '#3b5a7a', '#4a6a44', '#8a6a3a', '#5a3b6a', '#6a6a6a'];
  for (let i = 0; i < count; i++) {
    const x = -width / 2 + (i + 0.5) * (width / count);
    dummy.position.set(x, height / 2, 0);
    dummy.scale.set(0.82 + Math.random() * 0.3, 0.85 + Math.random() * 0.3, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(palette[i % palette.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function podium() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.15, 0.5), M.wood());
  body.position.y = 0.58;
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), M.metal());
  mic.position.set(0, 1.35, 0.1);
  mic.rotation.x = 0.4;
  g.add(body, mic);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function projectorScreen(w = 4, h = 2.6) {
  const g = new THREE.Group();
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: '#f4f4ef', roughness: 0.9, emissive: '#20242a', emissiveIntensity: 0.3 }),
  );
  screen.position.y = h / 2 + 0.6;
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w, 8), M.metal());
  roller.rotation.z = Math.PI / 2;
  roller.position.y = h + 0.6;
  g.add(screen, roller);
  return g;
}

export function whiteboard(w = 2.6) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 1.3),
    new THREE.MeshStandardMaterial({ color: '#f6f8f7', roughness: 0.5 }),
  );
  board.position.y = 1.5;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 1.4, 0.05), M.metal());
  frame.position.set(0, 1.5, -0.03);
  g.add(frame, board);
  return g;
}

export function ceilingFan(y = 3.4) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), M.metal());
  rod.position.y = y + 0.25;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), M.metal());
  hub.position.y = y;
  const blades = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.18), M.wood());
    blade.position.set(0.7, 0, 0);
    const arm = new THREE.Group();
    arm.rotation.y = (i / 3) * Math.PI * 2;
    arm.add(blade);
    blades.add(arm);
  }
  blades.position.y = y - 0.03;
  g.add(rod, hub, blades);
  g.userData.spin = blades;
  return g;
}

export function door(label) {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.06), M.wood());
  leaf.position.y = 1.05;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.metal());
  knob.position.set(0.35, 1.05, 0.05);
  g.add(leaf, knob);
  if (label) {
    const t = new Text();
    t.text = label;
    t.fontSize = 0.12;
    t.color = '#222';
    t.anchorX = 'center';
    t.position.set(0, 2.3, 0.04);
    t.sync();
    g.add(t);
  }
  return g;
}

export function noticeboard(w = 1.6) {
  const g = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.04), new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 1 }));
  cork.position.y = 1.6;
  g.add(cork);
  for (let i = 0; i < 5; i++) {
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), M.paper());
    note.position.set(-w / 2 + 0.25 + (i % 4) * 0.35, 1.75 - Math.floor(i / 4) * 0.42, 0.03);
    note.rotation.z = (Math.random() - 0.5) * 0.1;
    g.add(note);
  }
  return g;
}

export function sofa(len = 2.0, color = '#3f5c7a') {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 0.85), M.fabric(color));
  base.position.y = 0.3;
  const back = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 0.2), M.fabric(color));
  back.position.set(0, 0.6, -0.32);
  g.add(base, back);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

export function receptionDesk() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 0.9), M.wood());
  body.position.y = 0.55;
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 1.1), M.darkWood());
  top.position.y = 1.14;
  g.add(body, top);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function pottedPlant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.4, 10), new THREE.MeshStandardMaterial({ color: '#9a5a3a' }));
  pot.position.y = 0.2;
  const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: '#3f6a34', flatShading: true }));
  foliage.position.y = 0.85;
  g.add(pot, foliage);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function stairFlight(steps = 10, rise = 0.18, run = 0.28, width = 1.6) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#b8b0a0', roughness: 0.9 });
  for (let i = 0; i < steps; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(width, rise, run), mat);
    s.position.set(0, rise / 2 + i * rise, -i * run);
    s.castShadow = true;
    s.receiveShadow = true;
    g.add(s);
  }
  return g;
}

export function wallSign(text, size = 0.3, color = '#d0533a') {
  const t = new Text();
  t.text = text;
  t.fontSize = size;
  t.color = color;
  t.anchorX = 'center';
  t.anchorY = 'middle';
  t.outlineWidth = 0.004;
  t.sync();
  return t;
}
