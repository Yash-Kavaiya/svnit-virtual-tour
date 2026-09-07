import * as THREE from 'three';
import { events } from '../core/events.js';
import { wallSign } from './kit/FurnitureKit.js';

const EYE = 1.7;

// Remember where the player was on the campus so we can restore it on exit,
// standing 2 m back from the doorway.
export function computeReturn(playerPos, playerHeading) {
  const fx = -Math.sin(playerHeading);
  const fz = -Math.cos(playerHeading);
  return {
    returnPos: new THREE.Vector3(playerPos.x - fx * 2, EYE, playerPos.z - fz * 2),
    returnHeading: playerHeading,
  };
}

// A rectangular room shell (inward-facing walls) + ceiling lights + an exit
// portal that emits `interior:exit` when the player walks into it.
export function createInteriorShell({ w = 20, d = 14, h = 4, floor = '#c9bfa8', walls = '#e7e1d3' }) {
  const group = new THREE.Group();
  group.name = 'interior-shell';

  const floorMat = new THREE.MeshStandardMaterial({ color: floor, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: walls, roughness: 0.95, side: THREE.BackSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f0ece2', roughness: 1, side: THREE.BackSide });

  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  box.position.y = h / 2;
  box.receiveShadow = true;
  group.add(box);

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = h;
  group.add(ceil);

  // skirting
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    new THREE.MeshStandardMaterial({ color: '#8a7c62' }),
  );
  skirt.position.y = 0.06;
  skirt.scale.set(1.001, 1, 1.001);

  // ceiling lights
  const lights = new THREE.Group();
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.5),
        new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 1.4 }),
      );
      panel.rotation.x = Math.PI / 2;
      panel.position.set((ix * w) / 3.2, h - 0.02, (iz * d) / 3.2);
      lights.add(panel);
    }
  }
  group.add(lights);

  const amb = new THREE.AmbientLight('#fff2df', 0.7);
  const key = new THREE.PointLight('#fff0d8', 0.8, 60);
  key.position.set(0, h - 0.6, 0);
  group.add(amb, key);

  // exit portal at -Z wall
  const portal = new THREE.Group();
  portal.name = 'exit-portal';
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: '#2a2f36', emissive: '#f2a65a', emissiveIntensity: 0.25 }),
  );
  frame.position.set(0, 1.5, -d / 2 + 0.15);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.6),
    new THREE.MeshBasicMaterial({ color: '#ffce8a', transparent: true, opacity: 0.35 }),
  );
  glow.position.set(0, 1.4, -d / 2 + 0.26);
  const sign = wallSign('EXIT TO CAMPUS', 0.26, '#f2a65a');
  sign.position.set(0, 3.1, -d / 2 + 0.26);
  portal.add(frame, glow, sign);
  portal.userData.trigger = { x: 0, z: -d / 2 + 1.4, r: 1.6 };
  group.add(portal);

  return {
    group,
    portalTrigger: portal.userData.trigger,
    dispose() {
      group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
      });
    },
  };
}

// Shared per-frame check: if the player camera is within the exit trigger, leave.
export function checkExit(cameraPos, trigger) {
  const dx = cameraPos.x - trigger.x;
  const dz = cameraPos.z - trigger.z;
  if (dx * dx + dz * dz < trigger.r * trigger.r) {
    events.emit('interior:exit');
    return true;
  }
  return false;
}
