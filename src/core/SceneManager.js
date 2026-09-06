// Registers scene factories and swaps the active scene (campus <-> interiors).
// A scene object is: { scene, camera, update(dt), dispose(), api? }

export class SceneManager {
  #renderer;
  #factories = new Map();
  #active = null;
  #activeName = null;

  constructor(renderer) {
    this.#renderer = renderer;
  }

  register(name, factory) {
    this.#factories.set(name, factory);
  }

  get active() {
    return this.#active;
  }

  get activeName() {
    return this.#activeName;
  }

  async activate(name, params = {}) {
    const factory = this.#factories.get(name);
    if (!factory) throw new Error(`no scene registered: ${name}`);
    const next = await factory(params);
    const prev = this.#active;
    this.#active = next;
    this.#activeName = name;
    if (prev && prev !== next) prev.dispose?.();
    return next;
  }

  update(dt) {
    this.#active?.update?.(dt);
  }

  render() {
    if (this.#active) this.#renderer.render(this.#active.scene, this.#active.camera);
  }
}
