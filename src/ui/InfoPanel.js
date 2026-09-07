import { el, trapFocus } from './dom.js';

const CATEGORY_LABEL = {
  academic: 'Academic department',
  admin: 'Administration',
  library: 'Library',
  hostel: 'Hostel / residence',
  workshop: 'Workshop',
  lab: 'Laboratory',
  sports: 'Sports facility',
  dining: 'Dining',
  health: 'Health centre',
  utility: 'Utility',
  residence: 'Residence',
  gate: 'Gate',
  amenity: 'Amenity',
};

export function renderInfo(record, { onTour } = {}) {
  const m = record.meta ?? {};
  const rows = [];
  rows.push(el('div', { style: { color: 'var(--text-dim)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '1px' } }, CATEGORY_LABEL[record.category] ?? record.category));
  rows.push(el('div', { style: { fontSize: '1.2rem', fontWeight: '700', margin: '.15rem 0 .5rem' } }, record.name));

  const facts = [];
  if (m.department) facts.push(['Department', m.department]);
  if (m.established) facts.push(['Established', String(m.established)]);
  if (m.floors) facts.push(['Floors', String(m.floors)]);
  if (facts.length) {
    rows.push(
      el(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.2rem .8rem', fontSize: '.85rem', margin: '.3rem 0' } },
        ...facts.flatMap(([k, v]) => [
          el('span', { style: { color: 'var(--text-dim)' } }, k),
          el('span', {}, v),
        ]),
      ),
    );
  }
  if (m.description) {
    rows.push(el('p', { style: { fontSize: '.88rem', lineHeight: '1.5', margin: '.5rem 0 .2rem', color: 'var(--text)' } }, m.description));
  }
  if (record.onTour || onTour) {
    rows.push(el('div', { style: { fontSize: '.72rem', color: 'var(--accent)', marginTop: '.3rem' } }, '★ On the guided tour'));
  }

  const actions = el('div', { style: { display: 'flex', gap: '.5rem', marginTop: '.8rem' } });
  if (m.hasInterior) {
    actions.append(el('button', { className: 'primary', 'data-action': 'enter' }, 'Enter building'));
  }
  actions.append(el('button', { 'data-action': 'close' }, 'Close'));
  rows.push(actions);

  return el('div', {}, ...rows);
}

export class InfoPanel {
  constructor(root) {
    this.root = root;
    this._release = null;
    this.node = el('div', {
      className: 'panel',
      role: 'dialog',
      'aria-label': 'Building information',
      style: {
        right: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        padding: '1.2rem 1.4rem',
        maxWidth: '340px',
        width: '90vw',
      },
    });
    this.node.hidden = true;
    this.root.append(this.node);
  }

  open(record, { onEnterInterior } = {}) {
    this.node.replaceChildren(renderInfo(record));
    this.node.hidden = false;
    this._release = trapFocus(this.node);
    this.node.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
    this.node.querySelector('[data-action="enter"]')?.addEventListener('click', () => {
      this.close();
      onEnterInterior?.(record);
    });
    this._onEsc = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    };
    this.node.addEventListener('keydown', this._onEsc);
  }

  close() {
    this._release?.();
    this._release = null;
    this.node.hidden = true;
    this.node.replaceChildren();
  }

  get isOpen() {
    return !this.node.hidden;
  }

  dispose() {
    this.close();
    this.node.remove();
  }
}
