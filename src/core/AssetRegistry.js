// Shared cache of geometries and materials, so instanced/repeated world objects
// build once and dispose cleanly on scene teardown.

export class AssetRegistry {
  #geo = new Map();
  #mat = new Map();
  #tex = new Map();

  geo(key, factory) {
    if (!this.#geo.has(key)) this.#geo.set(key, factory());
    return this.#geo.get(key);
  }

  mat(key, factory) {
    if (!this.#mat.has(key)) this.#mat.set(key, factory());
    return this.#mat.get(key);
  }

  tex(key, factory) {
    if (!this.#tex.has(key)) this.#tex.set(key, factory());
    return this.#tex.get(key);
  }

  disposeAll() {
    for (const g of this.#geo.values()) g?.dispose?.();
    for (const m of this.#mat.values()) m?.dispose?.();
    for (const t of this.#tex.values()) t?.dispose?.();
    this.#geo.clear();
    this.#mat.clear();
    this.#tex.clear();
  }
}
