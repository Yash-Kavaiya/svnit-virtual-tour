import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { gateFrame } from './gateFrame.js';
import { pointInRing } from '../shared/polygon.mjs';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';

export function createLandmarks(campus, registry) {
  const group = new THREE.Group();
  group.name = 'landmarks';
  const pickables = [];

  const statuePoi =
    campus.pois.find((p) => p.type === 'statue') ||
    campus.pois.find((p) => /statue|patel|sardar/i.test(p.name));
  let floodlight = null;
  if (statuePoi) {
    const statue = makeStatue(statuePoi, campus.gates?.[0]);
    group.add(statue);
    // uplight the statue from the island edge on the gate side after dark
    floodlight = new THREE.SpotLight('#ffe2b0', 0, 22, 0.42, 0.5, 1.2);
    floodlight.position.set(0, 0.5, 6.4);
    floodlight.target.position.set(0, 8, 0);
    statue.add(floodlight, floodlight.target);
  }
  const applyNight = () => {
    const t = Settings.get('timeOfDay');
    if (floodlight) floodlight.intensity = t === 'night' ? 80 : t === 'dusk' ? 30 : 0;
  };
  applyNight();
  const onSettings = ({ key }) => key === 'timeOfDay' && applyNight();
  events.on('settings:change', onSettings);

  for (const gate of campus.gates ?? []) group.add(makeGate(gate, gateFrame(gate, campus.bounds)));

  // free-standing ATMs only; one inside a building is that building's
  const housed = (p) => campus.buildings.some((b) => pointInRing([p.x, p.z], b.footprint));
  for (const atm of campus.pois.filter((p) => p.type === 'atm' && !housed(p))) {
    group.add(makeAtmKiosk(atm, nearestRoadPoint(campus.roads, atm.x, atm.z)));
  }


  group.traverse((o) => {
    if (o.userData && (o.userData.poi || o.userData.landmark)) pickables.push(o);
  });

  registry.mat('landmark-noop', () => new THREE.MeshBasicMaterial());

  return {
    group,
    pickables,
    dispose() {
      events.off('settings:change', onSettings);
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

// Main gate after the institute's own photos (Hostel Information Brochure
// 2025-26): a long, low red-clad entrance wall carrying the name in Hindi and
// English with big "SVNIT" letters standing on top, grey sliding steel gates,
// the round emblem on a red pillar, and the national flag on a tall mast.
const DEVANAGARI_FONT = '/fonts/NotoSansDevanagari-Bold.woff';

function makeGate(gate, { inx, inz }) {
  const g = new THREE.Group();
  g.position.set(gate.x, 0, gate.z);
  g.rotation.y = Math.atan2(inx, inz); // local +z points into campus; -z faces the road

  const red = new THREE.MeshStandardMaterial({ color: '#9e3a28', roughness: 0.75 });
  const redDark = new THREE.MeshStandardMaterial({ color: '#7c2a1c', roughness: 0.8 });
  const coping = new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.85 });
  const masonry = new THREE.MeshStandardMaterial({ color: '#c9b48f', roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: '#8d9399', roughness: 0.45, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#7f9ea6', roughness: 0.2, metalness: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a44a', roughness: 0.35, metalness: 0.7 });
  const w = gate.width ?? 14;
  const box = (sx, sy, sz, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const text = (str, { size, x, y, z, color = '#f4ead2', font, back = false, maxWidth }) => {
    const t = new Text();
    t.text = str;
    t.fontSize = size;
    if (font) t.font = font;
    if (maxWidth) t.maxWidth = maxWidth;
    t.textAlign = 'center';
    t.color = color;
    // single-sided, so back-to-back copies don't show through each other
    t.material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    t.anchorX = 'center';
    t.anchorY = 'middle';
    t.position.set(x, y, z);
    if (back) t.rotation.y = Math.PI;
    t.sync();
    g.add(t);
    return t;
  };

  // --- name wall: on the left as you face the gate from the road (local +x,
  // since the road side is -z)
  const wallLen = 24;
  const wx = w / 2 + 1 + wallLen / 2;
  box(wallLen, 2.8, 0.9, red, wx, 1.4, 0);
  box(wallLen + 0.3, 0.18, 1.1, coping, wx, 2.89, 0);
  box(wallLen + 0.4, 0.35, 1.2, redDark, wx, 0.17, 0); // plinth
  text('सरदार वल्लभभाई राष्ट्रीय प्रौद्योगिकी संस्थान, सूरत', {
    size: 0.42,
    x: wx,
    y: 2.1,
    z: -0.47,
    font: DEVANAGARI_FONT,
    back: true,
    maxWidth: wallLen - 2,
  });
  text('SARDAR VALLABHBHAI NATIONAL INSTITUTE OF TECHNOLOGY', {
    size: 0.4,
    x: wx,
    y: 1.45,
    z: -0.47,
    back: true,
    maxWidth: wallLen - 2,
  });
  text('SURAT', { size: 0.34, x: wx, y: 0.95, z: -0.47, back: true });
  // "SVNIT" letters standing on the wall, readable from both sides. Troika
  // text is unlit, so it glows against the night like the real lit sign.
  for (const back of [true, false]) {
    text('SVNIT', { size: 1.9, x: wx - 2, y: 4.0, z: back ? -0.05 : 0.05, color: '#fbfaf5', back });
  }
  // low planter of shrubs along the wall's road face
  const hedge = new THREE.MeshStandardMaterial({ color: '#3f6b2c', roughness: 1 });
  box(wallLen - 1, 0.6, 1.0, hedge, wx, 0.3, -1.1);

  // --- emblem pillar on the right as seen from the road, then a shorter wall
  const px = -w / 2 - 1.6;
  box(2.4, 4.4, 1.4, red, px, 2.2, 0);
  box(2.7, 0.2, 1.7, coping, px, 4.5, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 8, 40), gold);
  ring.position.set(px, 2.7, -0.74);
  g.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 40),
    new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.6 }),
  );
  disc.position.set(px, 2.7, -0.72);
  disc.rotation.y = Math.PI;
  g.add(disc);
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshStandardMaterial({ color: '#2f4f8f', roughness: 0.6 }),
  );
  inner.position.set(px, 2.7, -0.73);
  inner.rotation.y = Math.PI;
  g.add(inner);
  box(10, 2.8, 0.9, red, px - 6.2, 1.4, 0);
  box(10.3, 0.18, 1.1, coping, px - 6.2, 2.89, 0);

  // --- grey sliding gates, parked open behind the name wall
  for (let i = 0; i <= 22; i++) box(0.06, 2.2, 0.06, steel, w / 2 + 1.5 + i * 0.36, 1.2, 1.0);
  for (const y of [0.2, 1.2, 2.25]) box(8.2, 0.1, 0.1, steel, w / 2 + 5.5, y, 1.0);

  // --- paved carriageway into campus and forecourt on the road side
  const paving = new THREE.MeshStandardMaterial({ color: '#56565a', roughness: 0.95 });
  const kerb = new THREE.MeshStandardMaterial({ color: '#d9d4c7', roughness: 0.9 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(w, 16), paving);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.06, 6);
  road.receiveShadow = true;
  g.add(road);
  for (const s of [-1, 1]) box(0.3, 0.18, 16, kerb, s * (w / 2 + 0.15), 0.09, 6);
  const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(w + 60, 12), paving);
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(0, 0.05, -8);
  forecourt.receiveShadow = true;
  g.add(forecourt);

  // --- guard cabin inside the gate, with a glazed front and flat roof
  const cx = -w / 2 - 5;
  box(3.2, 2.7, 3, masonry, cx, 1.35, 5);
  box(3.8, 0.25, 3.6, red, cx, 2.85, 5);
  box(2.2, 1.0, 0.06, glass, cx, 1.7, 3.48);
  box(0.06, 1.0, 1.8, glass, cx + 1.62, 1.7, 5);

  // --- boom barrier: striped arm on a post
  box(0.4, 1.1, 0.4, steel, w / 2 - 0.4, 0.55, 3.2);
  const redM = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.6 });
  const seg = (w - 1) / 8;
  for (let i = 0; i < 8; i++) {
    box(seg, 0.12, 0.12, i % 2 ? white : redM, w / 2 - 0.6 - seg * (i + 0.5), 1.05, 3.2);
  }

  // --- the national flag on a tall mast just inside, east of the entrance
  g.add(makeFlagpole(-w / 2 - 14, 12));

  g.userData.landmark = { name: 'Main Gate', kind: 'gate' };
  return g;
}

// Tall mast with the Indian tricolour (saffron / white / green, navy chakra).
function makeFlagpole(x, z, height = 24) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const plinth = new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const s = 3.2 - i * 0.9;
    const step = new THREE.Mesh(new THREE.BoxGeometry(s, 0.35, s), plinth);
    step.position.y = 0.17 + i * 0.35;
    step.receiveShadow = true;
    g.add(step);
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.16, height, 10),
    new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.35, metalness: 0.5 }),
  );
  pole.position.y = height / 2 + 1;
  pole.castShadow = true;
  const flagH = 2.4;
  const flagW = flagH * 1.5; // 3:2
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(flagW, flagH, 12, 4),
    new THREE.MeshStandardMaterial({ map: tricolourTexture(), side: THREE.DoubleSide, roughness: 0.9 }),
  );
  cloth.position.set(flagW / 2 + 0.1, height + 1 - flagH / 2 - 0.2, 0);
  cloth.castShadow = true;
  g.add(pole, cloth);
  g.userData.animatedFlag = cloth;
  return g;
}

function tricolourTexture(W = 96, H = 64) {
  const data = new Uint8Array(W * H * 4);
  const band = [
    [255, 153, 51],
    [255, 255, 255],
    [19, 136, 8],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // DataTexture rows start at the bottom: green first
      let c = band[2 - Math.min(2, Math.floor((y / H) * 3))];
      const d = Math.hypot(x - W / 2 + 0.5, y - H / 2 + 0.5);
      const r = H / 6.2;
      const ang = Math.atan2(y - H / 2, x - W / 2);
      const spoke = Math.abs(Math.sin(ang * 12)) < 0.18 && d < r;
      if ((d < r && d > r - 1.3) || spoke || d < 1.2) c = [0, 0, 128];
      const i = (y * W + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function nearestRoadPoint(roads, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const r of roads) {
    for (let i = 0; i < r.path.length - 1; i++) {
      const [ax, az] = r.path[i];
      const [bx, bz] = r.path[i + 1];
      const ex = bx - ax;
      const ez = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
      const px = ax + ex * t;
      const pz = az + ez * t;
      const d = Math.hypot(px - x, pz - z);
      if (d < bestD) {
        bestD = d;
        best = [px, pz];
      }
    }
  }
  return best;
}

// Bank ATM cabin: rendered masonry box, glazed front, branded fascia.
function makeAtmKiosk(poi, facing) {
  const g = new THREE.Group();
  g.position.set(poi.x, 0, poi.z);
  if (facing) g.rotation.y = Math.atan2(facing[0] - poi.x, facing[1] - poi.z);

  const wall = new THREE.MeshStandardMaterial({ color: '#e6e1d6', roughness: 0.9 });
  const blue = new THREE.MeshStandardMaterial({ color: '#22409a', roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: '#86a6b3', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.4, metalness: 0.6 });
  const box = (sx, sy, sz, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  box(3.6, 0.2, 3.6, wall, 0, 0.1, 0); // plinth step
  box(3.2, 2.8, 0.2, wall, 0, 1.6, -1.5); // back
  for (const sx of [-1.5, 1.5]) box(0.2, 2.8, 3.2, wall, sx, 1.6, 0);
  box(3.4, 0.25, 3.4, wall, 0, 3.12, 0); // roof slab
  box(2.8, 2.3, 0.05, glass, 0, 1.35, 1.5); // glazed front / door
  box(3.4, 0.6, 0.12, blue, 0, 2.7, 1.62); // fascia
  box(0.8, 1.5, 0.6, steel, 0, 0.95, -1.1); // the machine
  box(0.55, 0.35, 0.05, blue, 0, 1.45, -0.79); // its screen surround

  const sign = new Text();
  sign.text = 'SBI  ATM';
  sign.fontSize = 0.34;
  sign.color = '#ffffff';
  sign.anchorX = 'center';
  sign.anchorY = 'middle';
  sign.position.set(0, 2.7, 1.69);
  sign.sync();
  g.add(sign);

  g.userData.landmark = { name: poi.name + ' ATM', kind: 'atm' };
  return g;
}
