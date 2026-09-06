import * as THREE from 'three';
import { samplePath, pathDuration } from './keyframes.js';
import { Settings } from '../core/Settings.js';

// Drives the campus camera through resolved tour stops: fly to each stop,
// dwell (with an optional slow orbit), then continue. Emits onStop / onEnd.
export class CameraRig {
  constructor({ camera }) {
    this.camera = camera;
    this.stops = [];
    this.index = 0;
    this.phase = 'idle'; // idle | travel | dwell
    this.clock = 0;
    this.paused = false;
    this._onStop = () => {};
    this._onEnd = () => {};
    this._tmp = new THREE.Vector3();
  }

  play(stops, { onStop, onEnd } = {}) {
    this.stops = stops;
    this._onStop = onStop ?? (() => {});
    this._onEnd = onEnd ?? (() => {});
    this.index = 0;
    this.#beginStop();
  }

  #beginStop() {
    this.phase = 'travel';
    this.clock = 0;
    this._onStop(this.index, this.stops[this.index]);
  }

  get active() {
    return this.phase !== 'idle';
  }

  get current() {
    return this.stops[this.index];
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  next() {
    if (this.index < this.stops.length - 1) {
      this.index += 1;
      this.#beginStop();
    } else {
      this.stop();
    }
  }

  prev() {
    if (this.index > 0) {
      this.index -= 1;
      this.#beginStop();
    }
  }

  stop() {
    this.phase = 'idle';
    this._onEnd();
  }

  update(dt) {
    if (this.phase === 'idle' || this.paused) return;
    const stop = this.stops[this.index];
    const speed = Settings.get('reduceMotion') ? 2.2 : 1;
    this.clock += dt * speed;

    if (this.phase === 'travel') {
      const dur = pathDuration(stop.keys);
      const s = samplePath(stop.keys, this.clock);
      this.camera.position.set(s.pos[0], s.pos[1], s.pos[2]);
      this.camera.lookAt(s.look[0], s.look[1], s.look[2]);
      if (this.clock >= dur) {
        this.phase = 'dwell';
        this.clock = 0;
      }
    } else if (this.phase === 'dwell') {
      if (stop.orbit) {
        const a = this.clock * 0.12;
        const { centre, radius, height } = stop.orbit;
        this.camera.position.set(
          centre[0] + Math.cos(a) * radius,
          height,
          centre[1] + Math.sin(a) * radius,
        );
        this.camera.lookAt(centre[0], 0, centre[1]);
      }
      if (this.clock >= stop.dwell) this.next();
    }
  }
}
