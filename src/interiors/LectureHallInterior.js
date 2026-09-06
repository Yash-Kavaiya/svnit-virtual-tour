import * as THREE from 'three';
import { makeInteriorScene } from './makeInteriorScene.js';
import { podium, projectorScreen, whiteboard, ceilingFan, wallSign } from './kit/FurnitureKit.js';

// Seat transforms for a raked hall. Row 0 is at the front (z near 0); each
// successive row steps back (-z) and up (+y).
export function tieredSeatRows({ rows, seatsPerRow, rise, run, seatW }) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    const y = r * rise;
    const z = -(r * run);
    for (let s = 0; s < seatsPerRow; s++) {
      const x = (s - (seatsPerRow - 1) / 2) * seatW;
      out.push({ x, y, z });
    }
  }
  return out;
}

export function createLectureHallInterior({ domElement }) {
  return makeInteriorScene({
    domElement,
    title: 'Lecture Theatre (LT-2)',
    dims: { w: 16, d: 20, h: 5.2 },
    // enter at the back / top of the rake (near the exit at -Z), face the screen (+Z)
    startPos: [0, -6],
    startHeading: Math.PI,
    palette: { floor: '#b9b0a0', walls: '#e2ddd0' },
    furnish: (ctx) => {
      const { scene, addBlocker } = ctx;
      const FRONT = 8.5; // +Z wall = teaching wall

      const screen = projectorScreen(4.6, 2.6);
      screen.position.set(0, 0, FRONT - 0.25);
      scene.add(screen);

      const wbL = whiteboard(2.8);
      wbL.position.set(-4.4, 0, FRONT - 0.15);
      const wbR = whiteboard(2.8);
      wbR.position.set(4.4, 0, FRONT - 0.15);
      scene.add(wbL, wbR);

      const p = podium();
      p.position.set(-3, 0, FRONT - 1.8);
      scene.add(p);
      addBlocker(-3, FRONT - 1.8, 0.9, 0.7);

      const proj = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.5),
        new THREE.MeshStandardMaterial({ color: '#2a2f36' }),
      );
      proj.position.set(0, 4.6, FRONT - 5);
      scene.add(proj);

      // raked seating: row 0 near the front, rising toward the back (-Z)
      const FRONT_ROW_Z = FRONT - 3;
      const transforms = tieredSeatRows({ rows: 8, seatsPerRow: 12, rise: 0.34, run: 0.98, seatW: 0.62 });
      const seatMat = new THREE.MeshStandardMaterial({ color: '#33414f', roughness: 0.7 });
      const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.06, 0.46), seatMat, transforms.length);
      const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.42, 0.05), seatMat, transforms.length);
      const tablets = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.42, 0.03, 0.3),
        new THREE.MeshStandardMaterial({ color: '#7a6a4a' }),
        transforms.length,
      );
      const dummy = new THREE.Object3D();
      transforms.forEach((t, i) => {
        const z = FRONT_ROW_Z + t.z;
        dummy.position.set(t.x, 0.46 + t.y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        seats.setMatrixAt(i, dummy.matrix);
        dummy.position.set(t.x, 0.72 + t.y, z + 0.2);
        dummy.updateMatrix();
        backs.setMatrixAt(i, dummy.matrix);
        dummy.position.set(t.x, 0.62 + t.y, z - 0.28);
        dummy.updateMatrix();
        tablets.setMatrixAt(i, dummy.matrix);
      });
      [seats, backs, tablets].forEach((m) => (m.instanceMatrix.needsUpdate = true));
      seats.castShadow = true;
      scene.add(seats, backs, tablets);

      // raked floor steps under each row
      for (let r = 1; r < 8; r++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(14, 0.34, 1.0),
          new THREE.MeshStandardMaterial({ color: '#9a9284', roughness: 1 }),
        );
        step.position.set(0, 0.17 + (r - 1) * 0.34, FRONT_ROW_Z - r * 0.98 + 0.3);
        step.receiveShadow = true;
        scene.add(step);
      }
      // a couple of seated students
      for (const [sx, row] of [[-1.2, 1], [0.6, 2], [-2.4, 0], [1.8, 3]]) {
        const fig = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 8), new THREE.MeshStandardMaterial({ color: '#4a5a6a' }));
        torso.position.y = 0.95;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#c99' }));
        head.position.y = 1.32;
        fig.add(torso, head);
        fig.position.set(sx, row * 0.34, FRONT_ROW_Z - row * 0.98);
        fig.traverse((o) => (o.castShadow = true));
        scene.add(fig);
      }

      for (const fx of [-4, 4]) {
        const fan = ceilingFan(4.4);
        fan.position.x = fx;
        scene.add(fan);
      }

      // room number by the exit (at -Z), facing the room (+Z)
      const roomSign = wallSign('LT-2', 0.44, '#3b5c8a');
      roomSign.position.set(4.2, 3.6, -9.7);
      scene.add(roomSign);
      // "screen" caption on the front wall, facing back (-Z)
      const front = wallSign('LECTURE THEATRE 2', 0.3, '#8a5a3b');
      front.position.set(0, 3.9, FRONT - 0.1);
      front.rotation.y = Math.PI;
      scene.add(front);

      return null;
    },
  });
}
