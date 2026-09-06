import * as THREE from 'three';
import { makeInteriorScene } from './makeInteriorScene.js';
import {
  longTable,
  deskChair,
  bookshelf,
  bookRow,
  receptionDesk,
  wallSign,
  stairFlight,
} from './kit/FurnitureKit.js';

export function createLibraryInterior({ domElement }) {
  return makeInteriorScene({
    domElement,
    title: 'Central Library',
    dims: { w: 24, d: 20, h: 5.2 },
    palette: { floor: '#c7bfa6', walls: '#efe9d8' },
    startPos: [0, 8 ],
    startHeading: 0,
    furnish: (ctx) => {
      const { scene, addBlocker } = ctx;

      // issue / return desk near the entrance
      const desk = receptionDesk();
      desk.position.set(0, 0, 6.5);
      desk.rotation.y = Math.PI;
      scene.add(desk);
      addBlocker(0, 6.5, 3.3, 1.1);
      const deskSign = wallSign('ISSUE / RETURN', 0.24, '#3b5c8a');
      deskSign.position.set(0, 2.3, 6.7);
      scene.add(deskSign);

      // reading hall — rows of tables down the centre
      const readers = [];
      for (let rz = 2.5; rz >= -3.5; rz -= 3) {
        const t = longTable(5.0);
        t.position.set(3.5, 0, rz);
        scene.add(t);
        addBlocker(3.5, rz, 5.0, 1.2);
        for (const sx of [1.6, 2.6, 4.4, 5.4]) {
          const near = sx < 3.5;
          const c = deskChair();
          c.position.set(sx, 0, rz + (near ? -0.75 : 0.75));
          c.rotation.y = near ? 0 : Math.PI;
          scene.add(c);
          if (Math.random() < 0.45) readers.push(seatedReader(sx, rz + (near ? -0.95 : 0.95), near ? 0 : Math.PI));
        }
      }
      readers.forEach((r) => scene.add(r));

      // book stacks along the left
      for (let i = 0; i < 6; i++) {
        const z = -7 + i * 2.4;
        const shelf = bookshelf(3.2, 2.6);
        shelf.position.set(-8.5, 0, z);
        scene.add(shelf);
        addBlocker(-8.5, z, 3.2, 0.6);
        for (let s = 0; s < 5; s++) {
          const row = bookRow(26, 2.9);
          row.position.set(-8.5, 0.18 + s * (2.6 / 5), z - 0.05);
          scene.add(row);
        }
      }
      const stackSign = wallSign('STACKS  A–M', 0.32, '#d0533a');
      stackSign.position.set(-8.5, 3.1, -8.4);
      scene.add(stackSign);

      // periodicals rack along the right
      for (let i = 0; i < 4; i++) {
        const z = -6 + i * 2.4;
        const rack = bookshelf(2.6, 1.6);
        rack.position.set(9, 0, z);
        rack.rotation.y = Math.PI;
        scene.add(rack);
        addBlocker(9, z, 2.6, 0.6);
      }
      const perSign = wallSign('PERIODICALS', 0.28, '#8a5a3b');
      perSign.position.set(9, 2.2, -6.8);
      scene.add(perSign);

      const silence = wallSign('SILENCE, PLEASE', 0.36, '#8a5a3b');
      silence.position.set(0, 3.8, 9.6);
      silence.rotation.y = Math.PI;
      scene.add(silence);

      // OPAC terminals near the desk
      const opacDesk = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.75, 0.7),
        new THREE.MeshStandardMaterial({ color: '#6a5a3a' }),
      );
      opacDesk.position.set(-6, 0.38, 6.4);
      scene.add(opacDesk);
      addBlocker(-6, 6.4, 4, 0.7);
      for (let i = 0; i < 4; i++) {
        const term = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.35, 0.06),
          new THREE.MeshStandardMaterial({ color: '#20242a', emissive: '#2a4a6a', emissiveIntensity: 0.6 }),
        );
        term.position.set(-7.4 + i * 0.9, 1.1, 6.2);
        term.rotation.y = Math.PI;
        scene.add(term);
      }
      const opacSign = wallSign('CATALOGUE', 0.24, '#3b5c8a');
      opacSign.position.set(-6, 2.0, 6.8);
      scene.add(opacSign);

      // stairs up to a gallery (visual hint)
      const stairs = stairFlight(9, 0.2, 0.3, 1.6);
      stairs.position.set(10.5, 0, 4);
      stairs.rotation.y = -Math.PI / 2;
      scene.add(stairs);

      return null;
    },
  });
}

function seatedReader(x, z, rot) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#4a5a6a', roughness: 1 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 4, 8), mat);
  torso.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#c99', roughness: 1 }));
  head.position.y = 1.3;
  g.add(torso, head);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.traverse((o) => (o.castShadow = true));
  return g;
}
