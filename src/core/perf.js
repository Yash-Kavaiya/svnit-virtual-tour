// Rolling frame-time monitor with an optional auto-quality suggestion.

const ORDER = ['low', 'medium', 'high', 'ultra'];

export class PerfMonitor {
  constructor(window = 120) {
    this.samples = new Float32Array(window);
    this.n = 0;
    this.i = 0;
    this._suggested = 0;
  }

  sample(dt) {
    if (dt <= 0 || dt > 1) return;
    this.samples[this.i] = dt;
    this.i = (this.i + 1) % this.samples.length;
    this.n = Math.min(this.n + 1, this.samples.length);
  }

  get fps() {
    if (!this.n) return 0;
    let sum = 0;
    for (let k = 0; k < this.n; k++) sum += this.samples[k];
    return this.n / sum;
  }

  get p1Low() {
    if (this.n < 20) return this.fps;
    const arr = Array.from(this.samples.slice(0, this.n)).sort((a, b) => b - a);
    const idx = Math.floor(arr.length * 0.01);
    return 1 / (arr[idx] || arr[0]);
  }

  // Returns a lower quality string if we've been sustained-slow, else null.
  suggestQuality(current) {
    if (this.n < this.samples.length) return null;
    const ci = ORDER.indexOf(current);
    if (ci > 0 && this.fps < 24 && this.p1Low < 18) {
      this._suggested += 1;
      if (this._suggested > 2) {
        this._suggested = 0;
        return ORDER[ci - 1];
      }
    } else {
      this._suggested = 0;
    }
    return null;
  }
}
