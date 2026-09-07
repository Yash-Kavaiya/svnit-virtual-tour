import { el } from './dom.js';
import { events } from '../core/events.js';

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function headingToCompass(heading) {
  // forward = (-sin h, -cos h); bearing from north (=-Z), clockwise = -h
  let deg = (-heading * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
}

export function nearestLabel(pos, campus) {
  let best = null;
  let bestD = 60 * 60;
  for (const b of campus.buildings) {
    const dx = b.centroid[0] - pos[0];
    const dz = b.centroid[1] - pos[1];
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = b.name;
    }
  }
  if (best) return best;

  let zBest = null;
  let zD = 300 * 300;
  for (const p of campus.pois) {
    if (p.type !== 'zone') continue;
    const d = (p.x - pos[0]) ** 2 + (p.z - pos[1]) ** 2;
    if (d < zD) {
      zD = d;
      zBest = p.name;
    }
  }
  return zBest ?? 'SVNIT Campus';
}

export class HUD {
  constructor(root) {
    this.root = root;

    this.reticle = el('div', {
      style: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '6px',
        height: '6px',
        marginLeft: '-3px',
        marginTop: '-3px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,.7)',
        boxShadow: '0 0 3px rgba(0,0,0,.6)',
        pointerEvents: 'none',
      },
    });

    this.locChip = el('div', {
      className: 'panel',
      style: {
        left: '1rem',
        bottom: '1rem',
        padding: '.5rem .9rem',
        fontSize: '.9rem',
        fontWeight: '600',
      },
    });

    this.modeChip = el('div', {
      className: 'panel',
      style: {
        left: '1rem',
        bottom: '3.2rem',
        padding: '.3rem .7rem',
        fontSize: '.72rem',
        color: 'var(--text-dim)',
        letterSpacing: '1px',
      },
    });

    this.compass = el('div', {
      className: 'panel',
      style: {
        right: '1rem',
        top: '1rem',
        padding: '.4rem .8rem',
        fontSize: '.9rem',
        fontWeight: '700',
        minWidth: '2.4rem',
        textAlign: 'center',
      },
    });

    this.hint = el('div', {
      className: 'panel',
      style: {
        left: '50%',
        bottom: '1rem',
        transform: 'translateX(-50%)',
        padding: '.4rem .9rem',
        fontSize: '.75rem',
        color: 'var(--text-dim)',
      },
    });
    this.hint.textContent = 'WASD move · Shift run · F drone · M map · click a building for info · Esc menu';

    this.node = el('div', {}, this.reticle, this.locChip, this.modeChip, this.compass, this.hint);
    this._hintTimer = setTimeout(() => (this.hint.style.opacity = '0'), 9000);

    this._onMode = (m) => {
      this.modeChip.textContent = m.toUpperCase();
    };
    events.on('player:mode', this._onMode);
    this.modeChip.textContent = 'WALK';
  }

  mount() {
    this.root.append(this.node);
    return this;
  }

  update({ position, heading }) {
    this.locChip.textContent = nearestLabel([position.x, position.z], this._campus ?? { buildings: [], pois: [] });
    this.compass.textContent = headingToCompass(heading);
  }

  setCampus(campus) {
    this._campus = campus;
  }

  setHint(text) {
    if (!text) {
      this.hint.style.opacity = '0';
      return;
    }
    clearTimeout(this._hintTimer);
    this.hint.textContent = text;
    this.hint.style.opacity = '1';
    this._hintTimer = setTimeout(() => (this.hint.style.opacity = '0'), 6000);
  }

  dispose() {
    clearTimeout(this._hintTimer);
    events.off('player:mode', this._onMode);
    this.node.remove();
  }
}
