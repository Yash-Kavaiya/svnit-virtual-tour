import { el } from '../ui/dom.js';

// Normalised stick offset in [-1, 1] on each axis.
export function stickVector(start, now, maxRadius = 48) {
  const dx = now.x - start.x;
  const dy = now.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const mag = Math.min(len, maxRadius) / maxRadius;
  return { x: (dx / len) * mag, y: (dy / len) * mag };
}

export function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0)
  );
}

// Left half = move stick, right half = look drag, tap reticle = interact.
export class MobileControls {
  constructor({ onMove, onLook, onInteract, onRun }) {
    this.onMove = onMove;
    this.onLook = onLook;
    this.onInteract = onInteract;
    this.onRun = onRun;
    this.maxR = 48;
    this._move = null;
    this._look = null;

    this.knob = el('div', {
      style: {
        position: 'absolute',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,.35)',
        pointerEvents: 'none',
        display: 'none',
      },
    });
    this.ring = el('div', {
      style: {
        position: 'absolute',
        width: '108px',
        height: '108px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,.25)',
        pointerEvents: 'none',
        display: 'none',
      },
    });
    this.runBtn = el(
      'button',
      {
        style: {
          position: 'absolute',
          right: '1rem',
          bottom: '7rem',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
        },
        onClick: () => {
          this._run = !this._run;
          this.runBtn.classList.toggle('primary', this._run);
          this.onRun?.(this._run);
        },
      },
      'RUN',
    );

    this.node = el('div', { style: { position: 'absolute', inset: 0, touchAction: 'none' } }, this.ring, this.knob, this.runBtn);

    this._onStart = (e) => this.#start(e);
    this._onMoveEv = (e) => this.#drag(e);
    this._onEnd = (e) => this.#end(e);
    this.node.addEventListener('touchstart', this._onStart, { passive: false });
    this.node.addEventListener('touchmove', this._onMoveEv, { passive: false });
    this.node.addEventListener('touchend', this._onEnd);
    this.node.addEventListener('touchcancel', this._onEnd);
  }

  mount(root) {
    root.append(this.node);
    return this;
  }

  #start(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const left = t.clientX < window.innerWidth / 2;
      if (left && !this._move) {
        this._move = { id: t.identifier, start: { x: t.clientX, y: t.clientY } };
        this.ring.style.display = 'block';
        this.knob.style.display = 'block';
        this.ring.style.left = `${t.clientX - 54}px`;
        this.ring.style.top = `${t.clientY - 54}px`;
        this.#place(t.clientX, t.clientY);
      } else if (!left && !this._look) {
        this._look = { id: t.identifier, last: { x: t.clientX, y: t.clientY }, moved: 0 };
      }
    }
  }

  #drag(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this._move && t.identifier === this._move.id) {
        const v = stickVector(this._move.start, { x: t.clientX, y: t.clientY }, this.maxR);
        this.#place(this._move.start.x + v.x * this.maxR, this._move.start.y + v.y * this.maxR);
        this.onMove?.({ x: v.x, y: -v.y });
      } else if (this._look && t.identifier === this._look.id) {
        const dx = t.clientX - this._look.last.x;
        const dy = t.clientY - this._look.last.y;
        this._look.last = { x: t.clientX, y: t.clientY };
        this._look.moved += Math.abs(dx) + Math.abs(dy);
        this.onLook?.(dx, dy);
      }
    }
  }

  #end(e) {
    for (const t of e.changedTouches) {
      if (this._move && t.identifier === this._move.id) {
        this._move = null;
        this.ring.style.display = 'none';
        this.knob.style.display = 'none';
        this.onMove?.({ x: 0, y: 0 });
      } else if (this._look && t.identifier === this._look.id) {
        if (this._look.moved < 12) this.onInteract?.();
        this._look = null;
      }
    }
  }

  #place(x, y) {
    this.knob.style.left = `${x - 22}px`;
    this.knob.style.top = `${y - 22}px`;
  }

  dispose() {
    this.node.removeEventListener('touchstart', this._onStart);
    this.node.removeEventListener('touchmove', this._onMoveEv);
    this.node.removeEventListener('touchend', this._onEnd);
    this.node.removeEventListener('touchcancel', this._onEnd);
    this.node.remove();
  }
}
