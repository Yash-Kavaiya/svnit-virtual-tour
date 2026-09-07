import { el } from './dom.js';
import { Settings } from '../core/Settings.js';

export function worldToMap(p, bounds, size, pad = 0) {
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const span = Math.max(spanX, spanZ);
  const inner = size - pad * 2;
  const mx = pad + ((p.x - bounds.minX) / span) * inner + (inner - (spanX / span) * inner) / 2;
  const my = pad + ((p.z - bounds.minZ) / span) * inner + (inner - (spanZ / span) * inner) / 2;
  return { mx, my };
}

const CAT_COLOR = {
  academic: '#c98a4a',
  admin: '#5a8fd0',
  library: '#d0533a',
  hostel: '#7fa055',
  workshop: '#9aa0a8',
  lab: '#b07c4a',
  sports: '#57a86a',
  dining: '#d69a4a',
  health: '#d06a6a',
  utility: '#9a938a',
  residence: '#c2a878',
  gate: '#b0804a',
  amenity: '#9a938a',
};
const CB_COLOR = {
  academic: '#e69f00',
  admin: '#56b4e9',
  library: '#d55e00',
  hostel: '#009e73',
  workshop: '#999999',
  lab: '#cc79a7',
  sports: '#0072b2',
  dining: '#f0e442',
  health: '#d55e00',
  utility: '#999999',
  residence: '#cc79a7',
  gate: '#e69f00',
  amenity: '#999999',
};

export class Minimap {
  constructor({ root, campus, onPoiClick }) {
    this.root = root;
    this.campus = campus;
    this.onPoiClick = onPoiClick;
    this.size = 190;
    this.full = false;

    this.canvas = el('canvas', { width: this.size, height: this.size, style: { display: 'block', borderRadius: '10px', cursor: 'pointer' } });
    this.node = el(
      'div',
      {
        className: 'panel',
        style: { right: '1rem', bottom: '1rem', padding: '6px', lineHeight: 0 },
      },
      this.canvas,
    );

    this.canvas.addEventListener('click', (e) => this.#onClick(e));
    this._player = { x: 0, z: 0, heading: 0 };
    this.#drawStatic();
  }

  mount() {
    this.root.append(this.node);
    return this;
  }

  toggleFull() {
    this.full = !this.full;
    this.size = this.full ? Math.min(window.innerWidth, window.innerHeight) - 80 : 190;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.node.style.right = this.full ? '50%' : '1rem';
    this.node.style.bottom = this.full ? '50%' : '1rem';
    this.node.style.transform = this.full ? 'translate(50%, 50%)' : 'none';
    this.#drawStatic();
    this.#drawDynamic();
  }

  update({ position, heading }) {
    this._player = { x: position.x, z: position.z, heading };
    this.#drawDynamic();
  }

  #colorFor(cat) {
    return (Settings.get('minimapColorblind') ? CB_COLOR : CAT_COLOR)[cat] ?? '#999';
  }

  #drawStatic() {
    const ctx = this.canvas.getContext('2d');
    const s = this.size;
    const b = this.campus.bounds;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#20361f';
    ctx.fillRect(0, 0, s, s);

    // greens + grounds
    ctx.fillStyle = 'rgba(120,170,90,.35)';
    for (const g of this.campus.greens ?? []) this.#poly(ctx, g.polygon, b, s);
    ctx.fillStyle = 'rgba(190,140,90,.4)';
    for (const g of this.campus.grounds ?? []) this.#poly(ctx, g.polygon, b, s);

    // water
    ctx.fillStyle = 'rgba(70,130,150,.8)';
    for (const w of this.campus.water ?? []) this.#poly(ctx, w.polygon, b, s);

    // roads
    ctx.strokeStyle = 'rgba(210,210,210,.5)';
    ctx.lineWidth = 1.4;
    for (const road of this.campus.roads) {
      ctx.beginPath();
      road.path.forEach((p, i) => {
        const { mx, my } = worldToMap({ x: p[0], z: p[1] }, b, s, 6);
        i ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my);
      });
      ctx.stroke();
    }

    // buildings
    for (const bl of this.campus.buildings) {
      ctx.fillStyle = this.#colorFor(bl.category);
      this.#poly(ctx, bl.footprint, b, s);
    }

    // boundary
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.campus.boundary.forEach((p, i) => {
      const { mx, my } = worldToMap({ x: p[0], z: p[1] }, b, s, 6);
      i ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // POI pins
    this._pins = [];
    for (const p of this.campus.pois) {
      if (p.type === 'zone') continue;
      const { mx, my } = worldToMap({ x: p.x, z: p.z }, b, s, 6);
      this._pins.push({ mx, my, poi: p });
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(mx, my, this.full ? 5 : 3, 0, 7);
      ctx.fill();
    }

    this._staticImage = ctx.getImageData(0, 0, s, s);
  }

  #drawDynamic() {
    const ctx = this.canvas.getContext('2d');
    if (this._staticImage) ctx.putImageData(this._staticImage, 0, 0);
    const s = this.size;
    const b = this.campus.bounds;
    const { mx, my } = worldToMap(this._player, b, s, 6);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-this._player.heading);
    // FOV wedge
    ctx.fillStyle = 'rgba(242,166,90,.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 22, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.closePath();
    ctx.fill();
    // marker
    ctx.fillStyle = '#f2a65a';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  #poly(ctx, ring, b, s) {
    if (!ring || ring.length < 3) return;
    ctx.beginPath();
    ring.forEach((p, i) => {
      const { mx, my } = worldToMap({ x: p[0], z: p[1] }, b, s, 6);
      i ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my);
    });
    ctx.closePath();
    ctx.fill();
  }

  #onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.size;
    const y = ((e.clientY - rect.top) / rect.height) * this.size;
    let best = null;
    let bd = (this.full ? 14 : 9) ** 2;
    for (const pin of this._pins ?? []) {
      const d = (pin.mx - x) ** 2 + (pin.my - y) ** 2;
      if (d < bd) {
        bd = d;
        best = pin.poi;
      }
    }
    if (best) this.onPoiClick?.(best);
    else if (this.full) this.toggleFull();
  }

  dispose() {
    this.node.remove();
  }
}
