import * as THREE from 'three';
import { Settings } from '../core/Settings.js';

const EYE = 1.7;
const STANDBACK = 6;

// Where to stand when teleporting to a point of interest: STANDBACK metres back
// from `target` toward `faceTowards` (or the world origin), at eye height,
// facing the target.
export function arrivalTransform(target, faceTowards) {
  const fx = faceTowards ? faceTowards.x - target.x : -target.x;
  const fz = faceTowards ? faceTowards.z - target.z : -target.z;
  const l = Math.hypot(fx, fz);
  let dx;
  let dz;
  if (l < 1e-4) {
    dx = 0;
    dz = 1;
  } else {
    dx = fx / l;
    dz = fz / l;
  }
  const px = target.x + dx * STANDBACK;
  const pz = target.z + dz * STANDBACK;
  // face from (px,pz) toward the target => direction (-dx,-dz)
  const heading = Math.atan2(dx, dz);
  return { pos: [px, EYE, pz], heading };
}

export class Teleport {
  constructor({ player, overlayEl }) {
    this.player = player;
    this.overlay = overlayEl;
  }

  async go(target, faceTowards) {
    const { pos, heading } = arrivalTransform(target, faceTowards);
    const reduced = Settings.get('reduceMotion');
    if (this.overlay && !reduced) {
      this.overlay.hidden = false;
      this.overlay.classList.add('show');
      await wait(210);
    }
    this.player.teleport(new THREE.Vector3(pos[0], pos[1], pos[2]), heading);
    if (this.overlay) {
      this.overlay.classList.remove('show');
      await wait(reduced ? 0 : 210);
      this.overlay.hidden = true;
    }
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
