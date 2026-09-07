const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

export class Clock {
  #start = now();
  #last = this.#start;
  #elapsed = 0;
  #delta = 0;

  tick() {
    const t = now();
    this.#delta = (t - this.#last) / 1000;
    this.#last = t;
    this.#elapsed = (t - this.#start) / 1000;
  }

  get elapsed() {
    return this.#elapsed;
  }

  get delta() {
    return this.#delta;
  }
}
