import { el, trapFocus } from './dom.js';

export class StartMenu {
  constructor({ root, onEnter, onTour, onDirectory, onSettings, onCredits }) {
    this.root = root;
    this._release = null;

    const btn = (label, fn, primary) =>
      el('button', { className: primary ? 'primary' : '', onClick: fn, style: { width: '100%' } }, label);

    this.node = el(
      'div',
      {
        className: 'panel',
        role: 'dialog',
        'aria-label': 'Start menu',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '2rem 2.4rem',
          textAlign: 'center',
          minWidth: '340px',
          maxWidth: '90vw',
        },
      },
      el('div', { style: { fontSize: '1.5rem', fontWeight: '700', letterSpacing: '.5px' } }, 'SVNIT Surat'),
      el(
        'div',
        { style: { color: 'var(--text-dim)', marginTop: '.3rem', marginBottom: '1.4rem', fontSize: '.9rem' } },
        'Sardar Vallabhbhai National Institute of Technology — 3D Virtual Campus Tour',
      ),
      el(
        'div',
        { style: { display: 'grid', gap: '.6rem' } },
        btn('Enter campus', () => this.#pick(onEnter), true),
        btn('Guided tour', () => this.#pick(onTour)),
        btn('Building directory', () => onDirectory?.()),
        btn('Settings', () => onSettings?.()),
        btn('Credits', () => onCredits?.()),
      ),
      el(
        'div',
        { style: { marginTop: '1.2rem', color: 'var(--text-dim)', fontSize: '.72rem', lineHeight: '1.5' } },
        'WASD + mouse to walk · Shift to run · F for drone view · M for map · Esc for menu',
      ),
    );
  }

  #pick(fn) {
    this.hide();
    fn?.();
  }

  show() {
    this.root.append(this.node);
    this._release = trapFocus(this.node);
    return this;
  }

  hide() {
    this._release?.();
    this._release = null;
    this.node.remove();
  }
}
