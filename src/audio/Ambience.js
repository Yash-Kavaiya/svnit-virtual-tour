import { makeNoiseBuffer, birdChirp, footstep, distanceGain } from './synth.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';

// Layered generated ambience. Muted until start() is called from a user gesture.
export class Ambience {
  constructor(campus) {
    this.campus = campus;
    this.ctx = null;
    this.started = false;
    this.ready = false;
    this._scene = 'campus';

    this._onSettings = () => this.#applyVolumes();
    this._onStep = (running) => this.ctx && footstep(this.ctx, this.sfxBus, running);
    this._onInterior = () => this.setScene('interior');
    this._onLeft = () => this.setScene('campus');
    events.on('settings:change', this._onSettings);
    events.on('player:step', this._onStep);
    events.on('interior:enter', this._onInterior);
    events.on('interior:left', this._onLeft);
  }

  async start() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.started = true;

    this.master = this.ctx.createGain();
    this.ambBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.ambBus.connect(this.master);
    this.sfxBus.connect(this.master);

    // birdsong bed
    this.birdGain = this.ctx.createGain();
    this.birdGain.gain.value = 0.7;
    this.birdGain.connect(this.ambBus);
    this._birdTimer = setInterval(() => {
      if (!this.ctx || document.hidden) return;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) birdChirp(this.ctx, this.birdGain, Math.random() * 1.5);
    }, 1400);

    // breeze — filtered brown noise
    const breeze = this.ctx.createBufferSource();
    breeze.buffer = makeNoiseBuffer(this.ctx, 4, 'brown');
    breeze.loop = true;
    const bf = this.ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.value = 420;
    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.value = 0.12;
    breeze.connect(bf).connect(this.breezeGain).connect(this.ambBus);
    breeze.start();

    // distant road hum
    const hum = this.ctx.createBufferSource();
    hum.buffer = makeNoiseBuffer(this.ctx, 4, 'brown');
    hum.loop = true;
    const hf = this.ctx.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 240;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.0;
    hum.connect(hf).connect(this.humGain).connect(this.ambBus);
    hum.start();

    // cicada layer (dusk/night) — high band noise
    const cic = this.ctx.createBufferSource();
    cic.buffer = makeNoiseBuffer(this.ctx, 3, 'white');
    cic.loop = true;
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 5200;
    cf.Q.value = 6;
    this.cicGain = this.ctx.createGain();
    this.cicGain.gain.value = 0;
    cic.connect(cf).connect(this.cicGain).connect(this.ambBus);
    cic.start();

    this.ready = true;
    this.#applyVolumes();
    this.#applyTimeOfDay();
  }

  #applyVolumes() {
    if (!this.ready || !this.ctx) return;
    const m = Settings.get('volumeMaster');
    this.master.gain.value = m;
    this.ambBus.gain.value = Settings.get('volumeAmbience');
    this.sfxBus.gain.value = Settings.get('volumeSfx');
  }

  #applyTimeOfDay() {
    if (!this.ready || !this.ctx) return;
    const t = Settings.get('timeOfDay');
    const night = t === 'night' || t === 'dusk';
    this.cicGain?.gain.setTargetAtTime(night ? (t === 'night' ? 0.05 : 0.03) : 0, this.ctx.currentTime, 1);
    this.birdGain?.gain.setTargetAtTime(t === 'night' ? 0.1 : 0.7, this.ctx.currentTime, 1);
  }

  setScene(scene) {
    this._scene = scene;
    if (!this.ready || !this.ctx) return;
    const inside = scene === 'interior';
    this.ambBus.gain.setTargetAtTime(
      inside ? Settings.get('volumeAmbience') * 0.25 : Settings.get('volumeAmbience'),
      this.ctx.currentTime,
      0.5,
    );
  }

  update({ position }) {
    if (!this.ready || !this.ctx || this._scene === 'interior') return;
    this.#applyTimeOfDay();

    // road hum swells near the gate
    const gate = this.campus.gates?.[0];
    if (gate) {
      const d = Math.hypot(position.x - gate.x, position.z - gate.z);
      const g = distanceGain(d, 260) * 0.16;
      this.humGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.4);
    }
    // breeze rises in open ground (far from any building handled loosely by y)
    this.breezeGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 1);
  }

  stop() {
    clearInterval(this._birdTimer);
    events.off('settings:change', this._onSettings);
    events.off('player:step', this._onStep);
    events.off('interior:enter', this._onInterior);
    events.off('interior:left', this._onLeft);
    this.ctx?.close();
    this.ctx = null;
  }
}
