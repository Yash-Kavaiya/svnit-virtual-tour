import * as THREE from 'three';
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

const COUNT = { low: 0, medium: 30, high: 70, ultra: 120 };

export function createLife(campus, registry) {
  const group = new THREE.Group();
  group.name = 'life';
  const graph = buildWalkGraph(campus.roads.filter((r) => r.width >= 3));

  const n = COUNT[Settings.get('quality')] ?? 40;
  const enabled = Settings.get('ambientLife') && n > 0 && graph.edges.length > 0;

  const rnd = mulberry32(20260906);
  let agents = [];
  const bodyGeo = registry.geo('person-body', () => new THREE.CapsuleGeometry(0.16, 0.5, 4, 6));
  const headGeo = registry.geo('person-head', () => new THREE.SphereGeometry(0.13, 8, 6));
  const shirt = new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: false });
  const skin = new THREE.MeshStandardMaterial({ color: '#c99', roughness: 1 });

  const bodies = new THREE.InstancedMesh(bodyGeo, shirt, Math.max(1, n));
  const heads = new THREE.InstancedMesh(headGeo, skin, Math.max(1, n));
  bodies.castShadow = true;
  const palette = ['#3f5c7a', '#7a3b3b', '#4a6a44', '#8a6a3a', '#5a3b6a', '#b0b0b0'];
  const col = new THREE.Color();

  if (enabled) {
    for (let i = 0; i < n; i++) {
      agents.push({
        edge: Math.floor(rnd() * graph.edges.length),
        s: rnd(),
        dir: rnd() < 0.5 ? 1 : -1,
        speed: 1.1 + rnd() * 0.7,
        pos: [0, 0],
        _seed: (i + 1) * 2654435761,
      });
      col.set(palette[i % palette.length]).offsetHSL(0, 0, (rnd() - 0.5) * 0.15);
      bodies.setColorAt(i, col);
    }
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    group.add(bodies, heads);

    // parked bicycles near hostels + departments
    const bikeGeo = registry.geo('bike', () => new THREE.TorusGeometry(0.32, 0.03, 6, 10));
    const bikeMat = registry.mat('bike', () => new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.4, roughness: 0.5 }));
    const parks = campus.buildings.filter((b) => b.category === 'hostel' || b.category === 'academic').slice(0, 24);
    const bikes = new THREE.InstancedMesh(bikeGeo, bikeMat, parks.length * 3);
    const dummy = new THREE.Object3D();
    let bi = 0;
    for (const b of parks) {
      for (let k = 0; k < 3; k++) {
        dummy.position.set(b.centroid[0] + (rnd() - 0.5) * 8, 0.32, b.centroid[1] + 6 + k * 0.5);
        dummy.rotation.set(Math.PI / 2, 0, rnd() * 0.4);
        dummy.updateMatrix();
        bikes.setMatrixAt(bi++, dummy.matrix);
      }
    }
    bikes.instanceMatrix.needsUpdate = true;
    group.add(bikes);
  }

  const dummy = new THREE.Object3D();

  return {
    group,
    setEnabled(on) {
      group.visible = on;
    },
    update(dt) {
      if (!enabled || !group.visible) return;
      const step = Math.min(dt, 0.05);
      for (let i = 0; i < agents.length; i++) {
        agents[i] = advanceAgent(agents[i], graph, step);
        const p = agents[i].pos;
        dummy.position.set(p[0], 0.66, p[1]);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix);
        dummy.position.set(p[0], 1.32, p[1]);
        dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.traverse((o) => {
        if (o.isInstancedMesh) o.geometry.dispose();
      });
    },
  };
}

// keep an events import reference for wiring toggles elsewhere
void events;
