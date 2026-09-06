import * as THREE from 'three';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';
import { integrateFly } from './FlyControls.js';

const EYE = 1.7;
const WALK = 3.0;
const RUN = 7.0;
const GRAV = 22;

export class PlayerController {
  constructor({ camera, collider, domElement }) {
    this.camera = camera;
    this.collider = collider;
    this.dom = domElement;
    this.mode = 'walk';

    this.pos = new THREE.Vector3(0, EYE, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = true;
    this.keys = new Set();
    this._bob = 0;
    this._locked = false;
    this._fly = { vel: [0, 0, 0] };
    this._touchMove = { x: 0, y: 0 };
    this._touchRun = false;

    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyF') this.setMode(this.mode === 'fly' ? 'walk' : 'fly');
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this._locked) return;
      const inv = Settings.get('invertY') ? -1 : 1;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022 * inv;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    };
    this._onLockChange = () => {
      this._locked = document.pointerLockElement === this.dom;
      events.emit('player:lock', this._locked);
    };
    this._onClick = () => {
      if (this.mode === 'walk' && !this._locked) this.dom.requestPointerLock?.();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    this.dom.addEventListener('click', this._onClick);
  }

  get position() {
    return this.pos;
  }

  get heading() {
    return this.yaw;
  }

  get pointerLocked() {
    return this._locked;
  }

  setMode(m) {
    if (m === this.mode) return;
    this.mode = m;
    this.vel.set(0, 0, 0);
    if (m !== 'walk' && this._locked) document.exitPointerLock?.();
    events.emit('player:mode', m);
  }

  teleport(vec3, heading) {
    this.pos.set(vec3.x, Math.max(vec3.y, EYE), vec3.z);
    if (heading !== undefined) this.yaw = heading;
    this.vel.set(0, 0, 0);
  }

  releasePointer() {
    if (this._locked) document.exitPointerLock?.();
  }

  setMoveInput(v) {
    this._touchMove = v;
  }

  setRunInput(on) {
    this._touchRun = on;
  }

  addLook(dx, dy) {
    const inv = Settings.get('invertY') ? -1 : 1;
    this.yaw -= dx * 0.005;
    this.pitch -= dy * 0.005 * inv;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
  }

  update(dt) {
    if (this.mode === 'tour') {
      // the CameraRig drives the camera during the guided tour
      return;
    }
    if (this.mode === 'fly') {
      this.#updateFly(dt);
      this.#applyCamera(dt);
      return;
    }
    this.#updateWalk(dt);
    this.#applyCamera(dt);
  }

  #inputAxis() {
    const k = this.keys;
    let f = 0;
    let s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (Math.abs(this._touchMove.y) > 0.05) f += this._touchMove.y;
    if (Math.abs(this._touchMove.x) > 0.05) s += this._touchMove.x;
    f = Math.max(-1, Math.min(1, f));
    s = Math.max(-1, Math.min(1, s));
    return { f, s, run: this._touchRun || k.has('ShiftLeft') || k.has('ShiftRight') };
  }

  #updateWalk(dt) {
    const { f, s, run } = this.#inputAxis();
    const speed = run ? RUN : WALK;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // forward = -Z when yaw 0
    const wishX = (-sinY * f + cosY * s) * speed;
    const wishZ = (-cosY * f - sinY * s) * speed;

    this.vel.x = wishX;
    this.vel.z = wishZ;
    this.vel.y -= GRAV * dt;
    if ((this.keys.has('Space') || this.keys.has('KeyE')) && this.onGround) {
      this.vel.y = 6.2;
      this.onGround = false;
    }

    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    if (this.collider) {
      const r = this.collider.resolve([nx, nz], 0.42);
      nx = r[0];
      nz = r[1];
    }
    this.pos.x = nx;
    this.pos.z = nz;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= EYE) {
      this.pos.y = EYE;
      this.vel.y = 0;
      this.onGround = true;
    }

    // head bob + footstep events
    const moving = Math.hypot(wishX, wishZ) > 0.1 && this.onGround;
    if (moving) {
      const prevBob = this._bob;
      this._bob += dt * (run ? 14 : 9);
      // fire a step each time the bob sine crosses its low point
      if (Math.sin(prevBob) < 0 && Math.sin(this._bob) >= 0) {
        events.emit('player:step', run);
      }
    } else {
      this._bob *= 0.8;
    }
  }

  #updateFly(dt) {
    const { f, s, run } = this.#inputAxis();
    let up = 0;
    if (this.keys.has('KeyE') || this.keys.has('Space')) up += 1;
    if (this.keys.has('KeyQ') || this.keys.has('ControlLeft')) up -= 1;

    this._fly = integrateFly(this._fly, { forward: f, right: s, up, boost: run }, dt);
    const [vf, vr, vu] = this._fly.vel;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    this.pos.addScaledVector(dir, vf * dt);
    this.pos.addScaledVector(right, vr * dt);
    this.pos.y += vu * dt;
    this.pos.y = Math.max(1.2, this.pos.y);
  }

  #applyCamera() {
    const bob = Math.sin(this._bob) * 0.045 * (this.mode === 'walk' ? 1 : 0);
    this.camera.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'),
    );
    this.camera.quaternion.copy(q);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    this.dom.removeEventListener('click', this._onClick);
    if (this._locked) document.exitPointerLock?.();
  }
}
