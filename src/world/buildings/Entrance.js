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

// Pick the footprint edge whose midpoint is closest to the target point,
// build a canopy + steps + doors there, and mount a troika name-board.
export function attachEntrance(group, { footprint, height, name, target, accent }) {
  const n = footprint.length;
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % n];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(mid[0] - target[0], mid[1] - target[1]);
    if (d < bd) {
      bd = d;
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
  // outward normal (CCW ring): (ez, -ex)/len
  const nx = ez / edgeLen;
  const nz = -ex / edgeLen;
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const facing = Math.atan2(nx, nz);

  const canopyW = Math.min(6, edgeLen * 0.7);
  const ent = new THREE.Group();
  ent.name = 'entrance';

  const concrete = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.6, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#5b7b82',
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  // canopy slab
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.3, 2.6), concrete);
  canopy.position.set(mx + nx * 1.3, 3.0, mz + nz * 1.3);
  canopy.rotation.y = facing;
  canopy.castShadow = true;
  ent.add(canopy);

  // columns
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 8), concrete);
    col.position.set(mx + nx * 2.3 + dirx * s * (canopyW / 2 - 0.4), 1.5, mz + nz * 2.3 + dirz * s * (canopyW / 2 - 0.4));
    col.castShadow = true;
    ent.add(col);
  }

  // steps
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(canopyW + i * 0.6, 0.18, 0.5 + i * 0.4), concrete);
    step.position.set(mx + nx * (0.4 + i * 0.35), 0.09 + i * 0.18, mz + nz * (0.4 + i * 0.35));
    step.rotation.y = facing;
    step.receiveShadow = true;
    ent.add(step);
  }

  // doors
  const doors = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.2, canopyW * 0.6), 2.5, 0.12), glass);
  doors.position.set(mx + nx * 0.15, 1.35, mz + nz * 0.15);
  doors.rotation.y = facing;
  ent.add(doors);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.4, canopyW * 0.62), 2.7, 0.16), dark);
  doorFrame.position.set(mx + nx * 0.1, 1.35, mz + nz * 0.1);
  doorFrame.rotation.y = facing;
  ent.add(doorFrame);

  // name board on the fascia
  const plaqueW = Math.min(edgeLen * 0.92, Math.max(4, name.length * 0.42));
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(plaqueW, 0.9, 0.12),
    new THREE.MeshStandardMaterial({ color: accent ?? '#7a6a52', roughness: 0.8 }),
  );
  const boardY = Math.min(height - 0.8, 4.4);
  plaque.position.set(mx + nx * 0.12, boardY, mz + nz * 0.12);
  plaque.rotation.y = facing;
  ent.add(plaque);

  const label = new Text();
  label.text = name.toUpperCase();
  label.fontSize = 0.42;
  label.maxWidth = plaqueW - 0.4;
  label.anchorX = 'center';
  label.anchorY = 'middle';
  label.textAlign = 'center';
  label.color = '#f7f2e6';
  label.outlineWidth = 0.005;
  label.position.set(mx + nx * 0.2, boardY, mz + nz * 0.2);
  label.rotation.y = facing;
  label.sync();
  ent.add(label);

  group.add(ent);

  return {
    doorWorldPos: new THREE.Vector3(mx + nx * 3.4, 1.7, mz + nz * 3.4),
    facing,
    label,
  };
}
