import * as THREE from 'three';
import { PlayerController } from '../player/PlayerController.js';
import { Collider } from '../player/Collision.js';
import { createInteriorShell, checkExit } from './InteriorBase.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';

// Common scaffold for an interior: room shell, collider from the walls,
// first-person controller, exit trigger. `furnish(scene, ctx)` adds the
// room-specific contents and may return an `update(dt)` function.
export function makeInteriorScene({ domElement, dims, palette, startPos, startHeading, furnish, title }) {
  const { w, d, h } = dims;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c0d10');

  const camera = new THREE.PerspectiveCamera(
    Settings.get('fov'),
    window.innerWidth / window.innerHeight,
    0.05,
    200,
  );

  const shell = createInteriorShell({ w, d, h, ...palette });
  scene.add(shell.group);

  // collider: 4 wall slabs + optional furniture blockers from furnish()
  const wallT = 0.3;
  const wallRings = [
    rect(0, d / 2 - wallT / 2, w, wallT),
    rect(0, -d / 2 + wallT / 2, w, wallT),
    rect(w / 2 - wallT / 2, 0, wallT, d),
    rect(-w / 2 + wallT / 2, 0, wallT, d),
  ].map((footprint) => ({ footprint }));

  const blockers = [];
  const furnishCtx = {
    scene,
    addBlocker: (cx, cz, bw, bd) => blockers.push({ footprint: rect(cx, cz, bw, bd) }),
    dims,
  };
  const furnishUpdate = furnish(furnishCtx) || (() => {});

  const collider = new Collider([...wallRings, ...blockers], null);
  const player = new PlayerController({ camera, collider, domElement });
  player.teleport(new THREE.Vector3(startPos[0], 1.7, startPos[1]), startHeading ?? 0);

  let exited = false;
  let age = 0;

  return {
    scene,
    camera,
    title,
    api: { player },
    update(dt) {
      age += dt;
      player.update(dt);
      if (!exited && age > 1.2 && checkExit(camera.position, shell.portalTrigger)) exited = true;
      furnishUpdate(dt);
      scene.traverse((o) => {
        if (o.userData?.spin) o.userData.spin.rotation.y += dt * 6;
      });
    },
    dispose() {
      player.dispose();
      shell.dispose();
      scene.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.dispose) o.geometry.dispose();
      });
    },
  };
}

function rect(cx, cz, bw, bd) {
  return [
    [cx - bw / 2, cz - bd / 2],
    [cx + bw / 2, cz - bd / 2],
    [cx + bw / 2, cz + bd / 2],
    [cx - bw / 2, cz + bd / 2],
  ];
}

// Convenience for interiors to emit an exit programmatically (e.g. a UI button).
export function requestInteriorExit() {
  events.emit('interior:exit');
}
