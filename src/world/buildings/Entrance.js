import * as THREE from 'three';
import { Text } from 'troika-three-text';

export function segClosest(p, a, b) {
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const apx = p[0] - a[0];
  const apz = p[1] - a[1];
  const len2 = abx * abx + abz * abz || 1e-9;
  let t = (apx * abx + apz * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + abx * t, a[1] + abz * t];
}

export function nearestRoadPointTo(centroid, roads) {
  let best = null;
  let bestD = Infinity;
  for (const road of roads ?? []) {
    const path = road.path ?? road;
    for (let i = 0; i < path.length - 1; i++) {
      const c = segClosest(centroid, path[i], path[i + 1]);
      const d = Math.hypot(c[0] - centroid[0], c[1] - centroid[1]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
  }
  return best ?? [centroid[0], centroid[1]];
}

const CONCRETE = () => new THREE.MeshStandardMaterial({ color: '#cfc6b4', roughness: 0.95 });
const DARK = () => new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.6, metalness: 0.1 });
const GLASS = () =>
  new THREE.MeshStandardMaterial({
    color: '#7fa0a6',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
  });

// A projecting entrance bay (portico) that breaks the facade plane: columns,
// a slab, steps, glazed doors, and the building name on the fascia.
export function attachEntrance(group, { footprint, height, name, target, accent, category }) {
  const n = footprint.length;
  // pick the LONGEST edge whose midpoint faces the road best
  let bi = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 4) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(mid[0] - target[0], mid[1] - target[1]);
    const score = len * 0.4 - d;
    if (score > bestScore) {
      bestScore = score;
      bi = i;
    }
  }
  const a = footprint[bi];
  const b = footprint[(bi + 1) % n];
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const edgeLen = Math.hypot(ex, ez) || 1;
  const dirx = ex / edgeLen;
  const dirz = ez / edgeLen;
  const nx = ez / edgeLen; // outward normal (CCW ring)
  const nz = -ex / edgeLen;
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const facing = Math.atan2(nx, nz);

  const ent = new THREE.Group();
  ent.name = 'entrance';
  const concrete = CONCRETE();
  const dark = DARK();
  const glass = GLASS();
  const accentMat = new THREE.MeshStandardMaterial({ color: accent ?? '#7a6a52', roughness: 0.8 });

  const monumental = category === 'library' || category === 'admin';
  const bayW = Math.min(monumental ? 12 : 7, edgeLen * 0.7);
  const bayH = monumental ? Math.min(height, 3 * 3.4) : 2 * 3.4;
  const proj = monumental ? 2.6 : 1.8; // how far the portico sticks out

  const along = (s) => [dirx * s, dirz * s];
  const out = (s) => [nx * s, nz * s];
  const at = (alongS, outS, y) => {
    const [ax, az] = along(alongS);
    const [ox, oz] = out(outS);
    return [mx + ax + ox, y, mz + az + oz];
  };

  // projecting bay wall (a thin box just proud of the facade, full portico height)
  const bayWall = new THREE.Mesh(new THREE.BoxGeometry(bayW, bayH, 0.4), concrete);
  bayWall.position.set(...at(0, 0.2, bayH / 2));
  bayWall.rotation.y = facing;
  bayWall.castShadow = true;
  ent.add(bayWall);

  // portico roof slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.6, 0.4, proj + 0.6), concrete);
  slab.position.set(...at(0, proj / 2, bayH));
  slab.rotation.y = facing;
  slab.castShadow = true;
  ent.add(slab);

  // columns
  const nCols = monumental ? 4 : 2;
  const colR = monumental ? 0.28 : 0.2;
  for (let c = 0; c < nCols; c++) {
    const t = nCols === 1 ? 0 : c / (nCols - 1) - 0.5;
    const s = t * (bayW - colR * 4);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR * 1.12, bayH - 0.2, 10), concrete);
    col.position.set(...at(s, proj - 0.3, (bayH - 0.2) / 2));
    col.castShadow = true;
    ent.add(col);
  }

  // steps
  const nSteps = monumental ? 5 : 3;
  for (let i = 0; i < nSteps; i++) {
    const sw = bayW + 0.4 + i * 0.7;
    const step = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.17, 0.55), concrete);
    step.position.set(...at(0, proj + 0.2 + i * 0.4, 0.085 + i * 0.17));
    step.rotation.y = facing;
    step.receiveShadow = true;
    ent.add(step);
  }

  // glazed doors + fanlight
  const doorW = Math.min(monumental ? 5 : 3.2, bayW * 0.7);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.6, 0.12), glass);
  doors.position.set(...at(0, 0.42, 1.35));
  doors.rotation.y = facing;
  ent.add(doors);
  const fan = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.0, 0.1), glass);
  fan.position.set(...at(0, 0.42, 3.2));
  fan.rotation.y = facing;
  ent.add(fan);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 3.9, 0.2), dark);
  frame.position.set(...at(0, 0.36, 2.0));
  frame.rotation.y = facing;
  ent.add(frame);

  // name plaque on the portico fascia
  const plaqueW = Math.min(bayW + 0.4, Math.max(4, name.length * 0.4));
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(plaqueW, 1.0, 0.14), accentMat);
  const boardY = Math.min(bayH + 0.55, height + 0.5);
  plaque.position.set(...at(0, proj + 0.25, boardY));
  plaque.rotation.y = facing;
  ent.add(plaque);

  const label = new Text();
  label.text = name.toUpperCase();
  label.fontSize = monumental ? 0.5 : 0.42;
  label.maxWidth = plaqueW - 0.5;
  label.anchorX = 'center';
  label.anchorY = 'middle';
  label.textAlign = 'center';
  label.color = '#f7f2e6';
  label.outlineWidth = 0.006;
  const lp = at(0, proj + 0.33, boardY);
  label.position.set(lp[0], lp[1], lp[2]);
  label.rotation.y = facing;
  label.sync();
  ent.add(label);

  group.add(ent);

  return {
    doorWorldPos: new THREE.Vector3(mx + nx * (proj + 4), 1.7, mz + nz * (proj + 4)),
    facing,
    label,
  };
}
