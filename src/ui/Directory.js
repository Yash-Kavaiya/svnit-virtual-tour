import { el, trapFocus } from './dom.js';

export function fuzzyFilter(query, items) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const scored = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    const idx = name.indexOf(q);
    if (idx !== -1) {
      scored.push({ item, score: 1000 - idx });
      continue;
    }
    // subsequence
    let qi = 0;
    let last = -2;
    let gaps = 0;
    for (let i = 0; i < name.length && qi < q.length; i++) {
      if (name[i] === q[qi]) {
        if (i !== last + 1) gaps += 1;
        last = i;
        qi += 1;
      }
    }
    if (qi === q.length) scored.push({ item, score: 100 - gaps });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

const CAT_ORDER = ['academic', 'library', 'admin', 'lab', 'workshop', 'hostel', 'residence', 'sports', 'dining', 'health', 'utility', 'gate', 'amenity'];

export class Directory {
  constructor({ root, campus, landmarks = [], onPick }) {
    this.root = root;
    this.onPick = onPick;
    this._release = null;

    this.items = [
      ...campus.buildings.map((b) => ({ name: b.name, category: b.category, kind: 'building', ref: b })),
      ...landmarks.map((l) => ({ name: l.name, category: 'landmark', kind: 'landmark', ref: l })),
    ].filter((i) => !i.name.startsWith('(unnamed'));

    this.input = el('input', {
      type: 'search',
      placeholder: 'Search buildings…',
      'aria-label': 'Search buildings',
      style: {
        width: '100%',
        padding: '.6rem .8rem',
        borderRadius: '8px',
        border: '1px solid var(--panel-border)',
        background: 'rgba(0,0,0,.25)',
        color: 'var(--text)',
        fontSize: '.95rem',
      },
    });
    this.list = el('div', { style: { marginTop: '.7rem', maxHeight: '52vh', overflowY: 'auto', display: 'grid', gap: '2px' } });

    this.node = el(
      'div',
      {
        className: 'panel',
        role: 'dialog',
        'aria-label': 'Building directory',
        style: {
          left: '50%',
          top: '8%',
          transform: 'translateX(-50%)',
          padding: '1.2rem',
          width: 'min(420px, 92vw)',
        },
      },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' } },
        el('strong', {}, 'Campus directory'),
        el('button', { onClick: () => this.close(), style: { minHeight: '32px', padding: '.2rem .6rem' } }, '✕'),
      ),
      this.input,
      this.list,
    );
    this.node.hidden = true;
    this.root.append(this.node);

    this.input.addEventListener('input', () => this.#render());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = this.list.querySelector('button[data-idx]');
        first?.click();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  open() {
    this.node.hidden = false;
    this.#render();
    this._release = trapFocus(this.node);
    this.input.focus();
  }

  close() {
    this._release?.();
    this._release = null;
    this.node.hidden = true;
  }

  get isOpen() {
    return !this.node.hidden;
  }

  #render() {
    const results = fuzzyFilter(this.input.value, this.items).slice(0, 60);
    this.list.replaceChildren();
    const byCat = new Map();
    for (const r of results) {
      if (!byCat.has(r.category)) byCat.set(r.category, []);
      byCat.get(r.category).push(r);
    }
    const cats = [...byCat.keys()].sort(
      (a, b) => (CAT_ORDER.indexOf(a) + 99) % 100 - ((CAT_ORDER.indexOf(b) + 99) % 100),
    );
    for (const cat of cats) {
      this.list.append(
        el('div', { style: { color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '.5rem 0 .1rem' } }, cat),
      );
      for (const r of byCat.get(cat)) {
        const idx = this.items.indexOf(r);
        this.list.append(
          el(
            'button',
            {
              'data-idx': idx,
              onClick: () => {
                this.close();
                this.onPick?.(r);
              },
              style: { textAlign: 'left', width: '100%', minHeight: '38px', padding: '.4rem .6rem', fontSize: '.9rem' },
            },
            r.name,
          ),
        );
      }
    }
    if (!results.length) {
      this.list.append(el('div', { style: { color: 'var(--text-dim)', padding: '.6rem' } }, 'No matches'));
    }
  }

  dispose() {
    this.node.remove();
  }
}
