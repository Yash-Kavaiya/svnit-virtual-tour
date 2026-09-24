import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { lampPost, bench, bin, bollard, busStop } from './propModels.js';
import { Settings } from '../core/Settings.js';
import { TIME_PRESETS } from './TimeOfDay.js';
import { events } from '../core/events.js';
import { gateFrame } from './gateFrame.js';

export function createStreetKit(campus, registry, buildingsApi) {
  const group = new THREE.Group();
  group.name = 'street-kit';
  const dummy = new THREE.Object3D();

  // --- lamp posts along all drivable roads
  const lampProto = lampPost();
  const lampPts = [];
  for (const road of campus.roads) {
    if (road.width < 4) continue;
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = road.path[i];
      const b = road.path[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dirx = (b[0] - a[0]) / (len || 1);
      const dirz = (b[1] - a[1]) / (len || 1);
      for (let d = 10; d < len; d += 34) {
        const side = Math.floor(d / 34) % 2 ? 1 : -1;
        const off = road.width / 2 + 1;
        const rot = Math.atan2(dirz, dirx) + (side > 0 ? Math.PI : 0);
        lampPts.push([a[0] + dirx * d - dirz * side * off, a[1] + dirz * d + dirx * side * off, rot]);
      }
    }
  }
  const lampSpots = lampPts.filter(([x, z]) => !onPavement(campus, x, z));
  const lampMeshes = instanceGroup(lampProto, lampSpots, dummy);

  // warm pools of light under each lamp head (additive decals, no real lights)
  const poolMat = new THREE.MeshBasicMaterial({
    map: radialFalloffTexture(),
    color: '#ffc27a',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const poolGeo = new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, Math.max(1, lampSpots.length));
  lampSpots.forEach(([x, z, rot], i) => {
    // the lamp head hangs ~1 m out along the arm (local +x)
    dummy.position.set(x + Math.cos(rot) * 1.4, 0.1, z - Math.sin(rot) * 1.4);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);
  });
  pools.count = lampSpots.length;
  pools.renderOrder = 2;
  pools.name = 'lamp-pools';
  group.add(pools);
  const bulbs = [];
  lampMeshes.forEach((m) => {
    group.add(m);
    if (m.name === 'lamp-bulb') bulbs.push(m);
  });

  // --- benches + bins near building entrances
  const benchProto = bench();
  const binProto = bin();
  const benchPts = [];
  const binPts = [];
  if (buildingsApi) {
    for (const { doorWorldPos } of buildingsApi.byId.values()) {
      if (!doorWorldPos) continue;
      benchPts.push([doorWorldPos.x + 4, doorWorldPos.z + 1, Math.random() * 6.28]);
      binPts.push([doorWorldPos.x - 3, doorWorldPos.z + 1, 0]);
    }
  }
  instanceGroup(benchProto, benchPts, dummy).forEach((m) => group.add(m));
  instanceGroup(binProto, binPts, dummy).forEach((m) => group.add(m));

  // --- bollards at road/path junctions (sample a few)
  const bollardGeo = bollard().geometry;
  const bollardMat = bollard().material;
  const bollardPts = [];
  for (const road of campus.roads) {
    if (road.class !== 'footway' && road.class !== 'path') continue;
    const p = road.path[0];
    bollardPts.push(p);
    bollardPts.push(road.path[road.path.length - 1]);
  }
  if (bollardPts.length) {
    const bm = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardPts.length);
    bollardPts.forEach((p, i) => {
      dummy.position.set(p[0], 0.45, p[1]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bm.setMatrixAt(i, dummy.matrix);
    });
    bm.instanceMatrix.needsUpdate = true;
    group.add(bm);
  }

  // --- bus stops near the gate and the academic zone
  const zones = campus.pois.filter((p) => p.type === 'zone');
  const gate = campus.gates?.[0];
  const stopSpots = [];
  if (gate) {
    // outside the gate, beside the carriageway, facing the road
    const { inx, inz, halfOpening } = gateFrame(gate, campus.bounds);
    const side = halfOpening + 12;
    // on the emblem-pillar side, clear of the name wall
    stopSpots.push([gate.x - inx * 9 - inz * side, gate.z - inz * 9 + inx * side, Math.atan2(-inx, -inz)]);
  }
  const acad = zones.find((z) => /academic/i.test(z.name));
  if (acad) stopSpots.push([acad.x + 25, acad.z, 0]);
  for (const [x, z, rot] of stopSpots) {
    const s = busStop();
    s.position.set(x, 0, z);
    s.rotation.y = rot;
    group.add(s);
  }

  // --- direction signboards at zone centres
  for (const z of zones) {
    if (/gate/i.test(z.name)) continue; // gates carry their own name boards
    const sign = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: '#555' }),
    );
    post.position.y = 1.2;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: '#1f5c3a' }),
    );
    board.position.y = 2.1;
    const label = new Text();
    label.text = z.name.toUpperCase();
    label.fontSize = 0.28;
    label.color = '#f4f4ec';
    label.anchorX = 'center';
    label.anchorY = 'middle';
    label.position.set(0, 2.1, 0.05);
    label.sync();
    sign.add(post, board, label);
    sign.position.set(z.x, 0, z.z);
    group.add(sign);
  }

  // night lamp glow
  const applyGlow = () => {
    const name = Settings.get('timeOfDay');
    const on = name === 'dusk' || name === 'night' ? 1 : 0;
    for (const b of bulbs) b.material.emissiveIntensity = on * (name === 'night' ? 2.2 : 1.1);
    poolMat.opacity = on * (name === 'night' ? 0.9 : 0.35);
    pools.visible = on > 0;
  };
  applyGlow();
  const onSettings = ({ key }) => key === 'timeOfDay' && applyGlow();
  events.on('settings:change', onSettings);

  registry.mat('street-noop', () => new THREE.MeshBasicMaterial());
  void TIME_PRESETS;

  return {
    group,
    update() {},
    dispose() {
      events.off('settings:change', onSettings);
      group.traverse((o) => {
        if ((o.isMesh || o.isInstancedMesh) && o.geometry) o.geometry.dispose();
      });
    },
  };
}

// Turn a prototype Group into a set of InstancedMeshes (one per unique mesh),
// placed at each [x, z, rot] point.
function instanceGroup(proto, points, dummy) {
  const meshes = [];
  if (!points.length) return meshes;
  proto.updateMatrixWorld(true);
  const parts = [];
  proto.traverse((o) => {
    if (o.isMesh) parts.push(o);
  });
  for (const part of parts) {
    const inst = new THREE.InstancedMesh(part.geometry, part.material, points.length);
    inst.name = part.name;
    inst.castShadow = part.castShadow;
    const local = part.matrixWorld;
    points.forEach(([x, z, rot], i) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rot ?? 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dummy.matrix.multiply(local);
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    meshes.push(inst);
  }
  return meshes;
}

const segDist = (x, z, a, b) => {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
  return Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
};

// True when (x, z) is on a carriageway, the gate approach, or the statue
// roundabout island — somewhere a lamp post must not stand.
export function onPavement(campus, x, z) {
  for (const r of campus.roads) {
    for (let i = 0; i < r.path.length - 1; i++) {
      if (segDist(x, z, r.path[i], r.path[i + 1]) < r.width / 2 + 0.4) return true;
    }
  }
  for (const g of campus.gates ?? []) {
    const { inx, inz, halfOpening } = gateFrame(g, campus.bounds);
    const along = (x - g.x) * inx + (z - g.z) * inz;
    const across = Math.abs((x - g.x) * inz - (z - g.z) * inx);
    if (along > -16 && along < 16 && across < halfOpening + 2) return true;
  }
  for (const p of campus.pois) {
    if (p.type === 'statue' && Math.hypot(x - p.x, z - p.z) < 8) return true;
  }
  return false;
}

// 64x64 radial falloff (bright centre -> transparent edge), built without a
// canvas so it also works under test.
function radialFalloffTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d) ** 2;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(255 * a);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
