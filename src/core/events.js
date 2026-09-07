class Bus {
  #map = new Map();

  on(name, fn) {
    if (!this.#map.has(name)) this.#map.set(name, new Set());
    this.#map.get(name).add(fn);
  }

  off(name, fn) {
    this.#map.get(name)?.delete(fn);
  }

  emit(name, payload) {
    this.#map.get(name)?.forEach((fn) => fn(payload));
  }
}

export const events = new Bus();
