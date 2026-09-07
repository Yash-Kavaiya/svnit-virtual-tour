import * as THREE from 'three';
import { makeInteriorScene } from './makeInteriorScene.js';
import {
  receptionDesk,
  sofa,
  noticeboard,
  pottedPlant,
  door,
  stairFlight,
  wallSign,
} from './kit/FurnitureKit.js';

export function createAdminLobbyInterior({ domElement }) {
  return makeInteriorScene({
    domElement,
    title: 'Administration Building — Lobby',
    dims: { w: 24, d: 18, h: 5 },
    palette: { floor: '#cabfa6', walls: '#e9e4d6' },
    startPos: [0, 6.5],
    startHeading: 0,
    furnish: (ctx) => {
      const { scene, addBlocker } = ctx;

      const desk = receptionDesk();
      desk.position.set(0, 0, 3);
      scene.add(desk);
      addBlocker(0, 3, 3.3, 1.1);
      const recSign = wallSign('RECEPTION', 0.3, '#3b5c8a');
      recSign.position.set(0, 2.4, 3.2);
      scene.add(recSign);

      // attendant
      const att = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), new THREE.MeshStandardMaterial({ color: '#37506a' }));
      torso.position.y = 1.05;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#c99' }));
      head.position.y = 1.45;
      att.add(torso, head);
      att.position.set(0.6, 0, 3.6);
      scene.add(att);

      // waiting sofas
      for (const [x, z, rot] of [
        [-7, 6, 0],
        [-7, 8, 0],
        [7, 6, Math.PI],
      ]) {
        const s = sofa(2.2, '#4a3f5c');
        s.position.set(x, 0, z);
        s.rotation.y = rot;
        scene.add(s);
        addBlocker(x, z, 2.2, 0.9);
      }

      // notice boards along +Z (entrance) wall
      for (let i = 0; i < 3; i++) {
        const nb = noticeboard(2.0);
        nb.position.set(-6 + i * 6, 0, 8.7);
        nb.rotation.y = Math.PI;
        scene.add(nb);
      }
      const noticeSign = wallSign('NOTICES · ADMISSIONS · CIRCULARS', 0.22, '#8a5a3b');
      noticeSign.position.set(0, 3.0, 8.6);
      noticeSign.rotation.y = Math.PI;
      scene.add(noticeSign);

      // portrait wall of directors along -X
      for (let i = 0; i < 5; i++) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 1.1, 0.85),
          new THREE.MeshStandardMaterial({ color: '#5a4326' }),
        );
        frame.position.set(-11.9, 2.6, -6 + i * 2.4);
        const portrait = new THREE.Mesh(
          new THREE.PlaneGeometry(0.72, 0.95),
          new THREE.MeshStandardMaterial({ color: '#8a8378' }),
        );
        portrait.rotation.y = Math.PI / 2;
        portrait.position.set(-11.85, 2.6, -6 + i * 2.4);
        scene.add(frame, portrait);
      }
      const portraitSign = wallSign('DIRECTORS OF THE INSTITUTE', 0.22, '#3b5c8a');
      portraitSign.rotation.y = Math.PI / 2;
      portraitSign.position.set(-11.8, 3.6, 0);
      scene.add(portraitSign);

      // corridor doors along +X
      const doorLabels = ['DIRECTOR', 'REGISTRAR', 'DEAN (ACADEMIC)'];
      doorLabels.forEach((label, i) => {
        const dr = door(label);
        dr.position.set(11.7, 0, -5 + i * 3.2);
        dr.rotation.y = -Math.PI / 2;
        scene.add(dr);
      });

      // open-well staircase
      const stairs = stairFlight(10, 0.18, 0.3, 1.8);
      stairs.position.set(7, 0, -6);
      stairs.rotation.y = Math.PI;
      scene.add(stairs);

      // SVNIT crest medallion above the staircase
      const crest = new THREE.Mesh(
        new THREE.CircleGeometry(1.0, 24),
        new THREE.MeshStandardMaterial({ color: '#b5451f', roughness: 0.6, metalness: 0.2 }),
      );
      crest.position.set(7, 4.0, -8.8);
      scene.add(crest);
      const crestText = wallSign('SVNIT', 0.34, '#f4ecd8');
      crestText.position.set(7, 4.0, -8.72);
      scene.add(crestText);

      for (const [x, z] of [[-10, 2], [10, 2], [-3, 7], [3, 7]]) {
        const pl = pottedPlant();
        pl.position.set(x, 0, z);
        scene.add(pl);
      }

      return null;
    },
  });
}
