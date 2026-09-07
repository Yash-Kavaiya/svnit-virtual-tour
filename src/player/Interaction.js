import * as THREE from 'three';

// Centre-screen ray each frame (throttled). Hovers / selects building proxies
// (userData.buildingId) and landmark objects (userData.landmark) within range.
export class Interaction {
  constructor({ camera, pickables, maxDist = 40, onHover, onSelect }) {
    this.camera = camera;
    this.pickables = pickables;
    this.maxDist = maxDist;
    this.onHover = onHover;
    this.onSelect = onSelect;
    this.ray = new THREE.Raycaster();
    this.ray.far = maxDist;
    this._frame = 0;
    this._hovered = null;

    this._onClick = () => {
      if (this._hovered) this.onSelect?.(this._hovered);
    };
    window.addEventListener('click', this._onClick);
    this._onKey = (e) => {
      if ((e.code === 'KeyE' || e.code === 'Enter') && this._hovered) this.onSelect?.(this._hovered);
    };
    window.addEventListener('keydown', this._onKey);
  }

  update() {
    this._frame += 1;
    if (this._frame % 4 !== 0) return;
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.ray.intersectObjects(this.pickables, false);
    let target = null;
    for (const h of hits) {
      const o = h.object;
      if (o.userData?.buildingId || o.userData?.landmark) {
        target = o;
        break;
      }
      let p = o.parent;
      while (p) {
        if (p.userData?.landmark || p.userData?.buildingId) {
          target = p;
          break;
        }
        p = p.parent;
      }
      if (target) break;
    }
    if (target !== this._hovered) {
      this._hovered = target;
      this.onHover?.(target);
    }
  }

  get hovered() {
    return this._hovered;
  }

  dispose() {
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('keydown', this._onKey);
  }
}
