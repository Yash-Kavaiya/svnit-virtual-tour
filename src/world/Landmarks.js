import * as THREE from 'three';
import { Text } from 'troika-three-text';

export function createLandmarks(campus, registry) {
  const group = new THREE.Group();
  group.name = 'landmarks';
  const pickables = [];

  const statuePoi =
    campus.pois.find((p) => p.type === 'statue') ||
    campus.pois.find((p) => /statue|patel|sardar/i.test(p.name));
  if (statuePoi) group.add(makeStatue(statuePoi));

  const templePoi =
    campus.pois.find((p) => p.type === 'temple') ||
    campus.pois.find((p) => /temple|mandir/i.test(p.name));
  if (templePoi) group.add(makeTemple(templePoi));

  for (const gate of campus.gates ?? []) {
    const centre = [
      (campus.bounds.minX + campus.bounds.maxX) / 2,
      (campus.bounds.minZ + campus.bounds.maxZ) / 2,
    ];
    group.add(makeGate(gate, centre));
  }

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

function makeStatue(poi) {
  const g = new THREE.Group();
  g.position.set(poi.x, 0, poi.z);
  g.userData.poi = poi;

  const stone = new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 1 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#6e5a3a', roughness: 0.5, metalness: 0.5 });

  for (let i = 0; i < 3; i++) {
    const s = 3.4 - i * 0.7;
    const step = new THREE.Mesh(new THREE.BoxGeometry(s, 0.4, s), stone);
    step.position.y = 0.2 + i * 0.4;
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.6), stone);
  plinth.position.y = 2.5;
  plinth.castShadow = true;
  g.add(plinth);

  // simple standing figure
  const fig = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.9, 10), bronze);
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bronze);
  head.position.y = 2.15;
  const shawl = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 10), bronze);
  shawl.position.y = 1.2;
  fig.add(body, head, shawl);
  fig.position.y = 3.6;
  fig.traverse((o) => (o.castShadow = true));
  g.add(fig);

  const plaque = new Text();
  plaque.text = 'SARDAR VALLABHBHAI PATEL';
  plaque.fontSize = 0.22;
  plaque.maxWidth = 2.6;
  plaque.color = '#2a2a2a';
  plaque.anchorX = 'center';
  plaque.anchorY = 'middle';
  plaque.position.set(0, 1.6, 0.82);
  plaque.sync();
  g.add(plaque);

  g.userData.landmark = { name: 'Sardar Vallabhbhai Patel Statue', kind: 'memorial' };
  return g;
}

function makeTemple(poi) {
  const g = new THREE.Group();
  g.position.set(poi.x, 0, poi.z);
  g.userData.poi = poi;

  const wall = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 1 });
  const saffron = new THREE.MeshStandardMaterial({ color: '#e08a2e', roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d8b24a', roughness: 0.4, metalness: 0.5 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 6), wall);
  base.position.y = 0.25;
  base.receiveShadow = true;
  g.add(base);

  const sanctum = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3, 3.2), wall);
  sanctum.position.y = 2;
  sanctum.castShadow = true;
  g.add(sanctum);

  // shikhara — stepped tower
  for (let i = 0; i < 5; i++) {
    const s = 2.8 - i * 0.5;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(s, 0.7, s), saffron);
    tier.position.y = 3.7 + i * 0.7;
    tier.rotation.y = 0.02 * i;
    tier.castShadow = true;
    g.add(tier);
  }
  const amalaka = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), gold);
  amalaka.position.y = 7.4;
  const kalash = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), gold);
  kalash.position.y = 8.0;
  g.add(amalaka, kalash);

  // mandapa porch
  const porch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 2), wall);
  porch.position.set(0, 3, 2.4);
  for (const sx of [-1.3, 1.3]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.8, 8), wall);
    col.position.set(sx, 1.6, 3.2);
    g.add(col);
  }
  g.add(porch);

  // flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), gold);
  pole.position.set(2.4, 4.5, 0);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), saffron);
  flag.position.set(2.9, 5.6, 0);
  g.add(pole, flag);

  g.userData.landmark = { name: 'Ganesh Temple', kind: 'temple' };
  return g;
}

function makeGate(gate, centre) {
  const g = new THREE.Group();
  g.position.set(gate.x, 0, gate.z);
  const inx = centre[0] - gate.x;
  const inz = centre[1] - gate.z;
  g.rotation.y = Math.atan2(inx, inz);

  const masonry = new THREE.MeshStandardMaterial({ color: '#c9a877', roughness: 0.95 });
  const beamMat = new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 });
  const w = gate.width ?? 14;

  for (const sx of [-w / 2, w / 2]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 1.6), masonry);
    pier.position.set(sx, 2.5, 0);
    pier.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), masonry);
    cap.position.set(sx, 5.2, 0);
    g.add(pier, cap);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 1.1, 0.9), beamMat);
  beam.position.set(0, 5.6, 0);
  beam.castShadow = true;
  g.add(beam);

  const name = new Text();
  name.text = 'SARDAR VALLABHBHAI NATIONAL INSTITUTE OF TECHNOLOGY';
  name.fontSize = 0.42;
  name.maxWidth = w;
  name.textAlign = 'center';
  name.color = '#f4ecd8';
  name.anchorX = 'center';
  name.anchorY = 'middle';
  name.position.set(0, 5.6, 0.5);
  name.sync();
  g.add(name);

  // guard cabin + boom
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.4), masonry);
  cabin.position.set(w / 2 + 3, 1.3, 3);
  cabin.castShadow = true;
  g.add(cabin);
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, w, 6),
    new THREE.MeshStandardMaterial({ color: '#c94' }),
  );
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0, 1.1, 2);
  g.add(boom);

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
