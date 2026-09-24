import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';
import { mulberry32 } from '../core/rng.js';

// Build an undirected walk graph from road polylines (nodes quantised to 3 m).
export function buildWalkGraph(roads) {
  const nodes = [];
  const index = new Map();
  const key = (x, z) => `${Math.round(x / 3)},${Math.round(z / 3)}`;
  const nodeId = (x, z) => {
    const k = key(x, z);
    if (index.has(k)) return index.get(k);
    const id = nodes.length;
    nodes.push([x, z]);
    index.set(k, id);
    return id;
  };
  const edges = [];
  for (const road of roads) {
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = nodeId(road.path[i][0], road.path[i][1]);
      const b = nodeId(road.path[i + 1][0], road.path[i + 1][1]);
      if (a !== b) edges.push([a, b]);
    }
  }
  // adjacency: node -> list of edge indices
  const adj = nodes.map(() => []);
  edges.forEach(([a, b], i) => {
    adj[a].push(i);
    adj[b].push(i);
  });
  return { nodes, edges, adj };
}

// Move an agent along its current edge; at an endpoint pick a new edge.
export function advanceAgent(agent, graph, dt) {
  const e = graph.edges[agent.edge];
  if (!e) return agent;
  const [na, nb] = e;
  const A = graph.nodes[na];
  const B = graph.nodes[nb];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  let s = agent.s + (agent.dir * agent.speed * dt) / len;

  let { edge, dir } = agent;
  if (s >= 1 || s <= 0) {
    const atNode = s >= 1 ? nb : na;
    const options = graph.adj[atNode].filter((ei) => ei !== edge);
    const pick = options.length
      ? options[Math.floor(pseudo(agent) * options.length)]
      : edge;
    edge = pick;
    const pe = graph.edges[edge];
    dir = pe[0] === atNode ? 1 : -1;
    s = dir === 1 ? 0.001 : 0.999;
  }

  const e2 = graph.edges[edge];
  const P = graph.nodes[e2[0]];
  const Q = graph.nodes[e2[1]];
  const pos = [P[0] + (Q[0] - P[0]) * s, P[1] + (Q[1] - P[1]) * s];
  return { ...agent, edge, dir, s, pos };
}

function pseudo(agent) {
  agent._seed = (agent._seed ?? agent.edge + 1) * 1664525 + 1013904223;
  return ((agent._seed >>> 8) & 0xffff) / 0x10000;
}

// Low-poly pedestrian parts. Each is one InstancedMesh; limb pivots sit at
// the joint so a rotation.x swings it. Local +z is the walking direction.
const SKIN = ['#8d5a3b', '#a8704a', '#c68a5e', '#7a4a2e', '#b57f58'];
const TOPS = ['#f2f2ee', '#9cb8d6', '#3f5c7a', '#7a3b3b', '#556b2f', '#d8c8a0', '#e07b39', '#b03a5b', '#2f2f35'];
const BOTTOMS = ['#2b2f3a', '#3a4a6a', '#6b5b45', '#1e1e1e', '#4d5a70'];
const PACKS = ['#1f3d7a', '#222222', '#8a2222', '#2e5e3a'];

function limb(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, -h / 2, 0); // pivot at the top (hip / shoulder)
  return g;
}

const PARTS = {
  legL: { geo: () => limb(0.13, 0.84, 0.14), at: [-0.09, 0.86, 0], palette: 'bottom', swing: 1 },
  legR: { geo: () => limb(0.13, 0.84, 0.14), at: [0.09, 0.86, 0], palette: 'bottom', swing: -1 },
  hips: { geo: () => new THREE.BoxGeometry(0.33, 0.16, 0.19), at: [0, 0.86, 0], palette: 'bottom' },
  torso: { geo: () => new THREE.BoxGeometry(0.36, 0.56, 0.2), at: [0, 1.2, 0], palette: 'top' },
  armL: { geo: () => limb(0.09, 0.6, 0.1), at: [-0.23, 1.45, 0], palette: 'top', swing: -0.8 },
  armR: { geo: () => limb(0.09, 0.6, 0.1), at: [0.23, 1.45, 0], palette: 'top', swing: 0.8 },
  head: { geo: () => new THREE.SphereGeometry(0.11, 10, 8), at: [0, 1.6, 0.01], palette: 'skin' },
  hair: {
    geo: () => new THREE.SphereGeometry(0.117, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
    at: [0, 1.62, -0.01],
    palette: 'hair',
  },
  pack: { geo: () => new THREE.BoxGeometry(0.28, 0.36, 0.13), at: [0, 1.2, -0.17], palette: 'pack' },
};

// A parked bicycle as one merged geometry (wheels, frame, seat, bars),
// wheels in the local x/y plane.
function bicycleGeometry() {
  const parts = [];
  const tube = (len, r, x, y, rz) => {
    const g = new THREE.CylinderGeometry(r, r, len, 5);
    g.rotateZ(rz);
    g.translate(x, y, 0);
    parts.push(g);
  };
  for (const x of [-0.52, 0.52]) {
    const w = new THREE.TorusGeometry(0.33, 0.025, 5, 14);
    w.translate(x, 0.34, 0);
    parts.push(w);
  }
  tube(0.62, 0.02, -0.3, 0.5, -1.0); // seat stay
  tube(0.66, 0.022, 0.1, 0.8, Math.PI / 2 - 0.08); // top tube
  tube(0.7, 0.022, 0.1, 0.56, 0.95); // down tube
  tube(0.55, 0.022, -0.18, 0.62, 0.18); // seat tube
  tube(0.62, 0.02, 0.48, 0.64, -0.3); // fork
  const bar = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 5);
  bar.rotateX(Math.PI / 2);
  bar.translate(0.42, 0.98, 0);
  parts.push(bar);
  const seat = new THREE.BoxGeometry(0.22, 0.05, 0.1);
  seat.translate(-0.24, 0.92, 0);
  parts.push(seat);
  return BufferGeometryUtils.mergeGeometries(
    parts.map((g) => (g.index ? g.toNonIndexed() : g)),
    false,
  );
}

const COUNT = { low: 0, medium: 30, high: 70, ultra: 120 };

export function createLife(campus, registry) {
  const group = new THREE.Group();
  group.name = 'life';
  const graph = buildWalkGraph(campus.roads.filter((r) => r.width >= 3));

  const n = COUNT[Settings.get('quality')] ?? 40;
  const enabled = Settings.get('ambientLife') && n > 0 && graph.edges.length > 0;

  const rnd = mulberry32(20260906);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  let agents = [];
  const col = new THREE.Color();

  // white base colour: setColorAt multiplies material.color
  const partMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  const meshes = {};
  for (const [name, def] of Object.entries(PARTS)) {
    const m = new THREE.InstancedMesh(registry.geo(`person-${name}`, def.geo), partMat, Math.max(1, n));
    m.castShadow = name === 'torso' || name.startsWith('leg');
    m.frustumCulled = false;
    meshes[name] = m;
  }

  if (enabled) {
    for (let i = 0; i < n; i++) {
      const colours = {
        top: pick(TOPS),
        bottom: pick(BOTTOMS),
        skin: pick(SKIN),
        hair: rnd() < 0.12 ? '#6b6b6b' : '#161210',
        pack: pick(PACKS),
      };
      agents.push({
        edge: Math.floor(rnd() * graph.edges.length),
        s: rnd(),
        dir: rnd() < 0.5 ? 1 : -1,
        speed: 1.1 + rnd() * 0.5,
        pos: [0, 0],
        phase: rnd() * Math.PI * 2,
        side: 1.4 + rnd() * 0.9, // metres off the road centreline
        scale: 0.93 + rnd() * 0.12,
        pack: rnd() < 0.45,
        heading: 0,
        _seed: (i + 1) * 2654435761,
      });
      for (const [name, def] of Object.entries(PARTS)) {
        col.set(colours[def.palette]).offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
        meshes[name].setColorAt(i, col);
      }
    }
    for (const m of Object.values(meshes)) {
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      group.add(m);
    }
    group.add(parkedBicycles(campus, registry, rnd, pick));
  }

  const body = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const out = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const v = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  const unit = new THREE.Vector3(1, 1, 1);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  return {
    group,
    setEnabled(on) {
      group.visible = on;
    },
    update(dt) {
      if (!enabled || !group.visible) return;
      const step = Math.min(dt, 0.05);
      for (let i = 0; i < agents.length; i++) {
        const prev = agents[i].pos;
        const a = (agents[i] = advanceAgent(agents[i], graph, step));
        const dx = a.pos[0] - prev[0];
        const dz = a.pos[1] - prev[1];
        const d2 = dx * dx + dz * dz;
        if (d2 > 1e-8 && d2 < 4) {
          // ease the heading round corners instead of snapping
          let diff = Math.atan2(dx, dz) - a.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          a.heading += diff * Math.min(1, step * 8);
        }
        a.phase += step * a.speed * 5.2;
        const swing = Math.sin(a.phase) * 0.5;
        const bob = Math.abs(Math.cos(a.phase)) * 0.035;
        // keep to the verge on the walker's left
        const rx = Math.cos(a.heading);
        const rz = -Math.sin(a.heading);
        v.set(a.pos[0] + rx * a.side, bob, a.pos[1] + rz * a.side);
        q.setFromEuler(eul.set(0, a.heading, 0));
        body.compose(v, q, scl.set(a.scale, a.scale, a.scale));
        for (const [name, def] of Object.entries(PARTS)) {
          if (name === 'pack' && !a.pack) {
            meshes.pack.setMatrixAt(i, hidden);
            continue;
          }
          q.setFromEuler(eul.set(swing * (def.swing ?? 0), 0, 0));
          local.compose(v.set(def.at[0], def.at[1], def.at[2]), q, unit);
          meshes[name].setMatrixAt(i, out.multiplyMatrices(body, local));
        }
      }
      for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.traverse((o) => {
        if (o.isInstancedMesh) o.geometry.dispose();
      });
    },
  };
}

// Rows of bicycles parked 2.4 m outside the longest wall of hostels and
// departments, perpendicular to it.
function parkedBicycles(campus, registry, rnd, pick) {
  const PER = 7;
  const parks = campus.buildings
    .filter((b) => (b.category === 'hostel' || b.category === 'academic') && !b.meta?.generic)
    .slice(0, 28);
  const bikes = new THREE.InstancedMesh(
    registry.geo('bicycle', bicycleGeometry),
    registry.mat('bike', () => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.3, roughness: 0.55 })),
    Math.max(1, parks.length * PER),
  );
  const colours = ['#1d1d1f', '#8a1f1f', '#1f3d7a', '#2c2c2c', '#5a5a5a', '#1f5c3a'];
  const col = new THREE.Color();
  const d = new THREE.Object3D();
  let bi = 0;
  for (const b of parks) {
    let best = null;
    for (let k = 0; k < b.footprint.length; k++) {
      const p = b.footprint[k];
      const q = b.footprint[(k + 1) % b.footprint.length];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || len > best.len) best = { p, q, len };
    }
    const ux = (best.q[0] - best.p[0]) / best.len;
    const uz = (best.q[1] - best.p[1]) / best.len;
    let nx = uz;
    let nz = -ux;
    const mx = (best.p[0] + best.q[0]) / 2;
    const mz = (best.p[1] + best.q[1]) / 2;
    if ((mx - b.centroid[0]) * nx + (mz - b.centroid[1]) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const start = (rnd() - 0.5) * Math.max(0, best.len - PER * 0.75 - 6);
    for (let k = 0; k < PER; k++) {
      const t = start + (k - PER / 2) * 0.75;
      d.position.set(mx + ux * t + nx * 2.4, 0, mz + uz * t + nz * 2.4);
      // bike's local +x (its length) points along the wall normal
      d.rotation.set(0, Math.atan2(-nz, nx) + (rnd() - 0.5) * 0.12, 0.05);
      d.updateMatrix();
      bikes.setMatrixAt(bi, d.matrix);
      bikes.setColorAt(bi++, col.set(pick(colours)));
    }
  }
  bikes.count = bi;
  bikes.instanceMatrix.needsUpdate = true;
  if (bikes.instanceColor) bikes.instanceColor.needsUpdate = true;
  bikes.castShadow = true;
  return bikes;
}

// keep an events import reference for wiring toggles elsewhere
void events;
