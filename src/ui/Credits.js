import { el, trapFocus } from './dom.js';

export class Credits {
  constructor(root) {
    this.root = root;
    this._release = null;
    this.node = el(
      'div',
      {
        className: 'panel',
        role: 'dialog',
        'aria-label': 'Credits',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '1.6rem 1.8rem',
          width: 'min(460px, 92vw)',
          maxHeight: '86vh',
          overflowY: 'auto',
          fontSize: '.9rem',
          lineHeight: '1.6',
        },
      },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' } },
        el('strong', { style: { fontSize: '1.1rem' } }, 'Credits & data'),
        el('button', { onClick: () => this.close(), style: { minHeight: '32px', padding: '.2rem .6rem' } }, '✕'),
      ),
      el('p', {}, 'A 3D virtual tour of the campus of the Sardar Vallabhbhai National Institute of Technology, Surat.'),
      el('p', {}, el('strong', {}, 'Campus geometry '), '— building footprints, roads, water bodies and the campus boundary are derived from ', el('strong', {}, 'OpenStreetMap'), ', © OpenStreetMap contributors, licensed under the Open Database License (ODbL).'),
      el('p', {}, el('strong', {}, 'Buildings, interiors, props, landscaping, audio and tour narration '), 'are original and interpretive — building facades and interior layouts are plausible reconstructions, not exact representations of the real buildings.'),
      el('p', {}, 'Built with three.js, troika-three-text and three-mesh-bvh.'),
      el('p', { style: { color: 'var(--text-dim)', fontSize: '.8rem' } }, 'Not affiliated with or endorsed by SVNIT. Campus data can be corrected in data/campus/curated.mjs.'),
    );
    this.node.hidden = true;
    this.root.append(this.node);
  }

  open() {
    this.node.hidden = false;
    this._release = trapFocus(this.node);
    this._onEsc = (e) => e.key === 'Escape' && (e.stopPropagation(), this.close());
    this.node.addEventListener('keydown', this._onEsc);
  }

  close() {
    this._release?.();
    this._release = null;
    this.node.hidden = true;
  }

  get isOpen() {
    return !this.node.hidden;
  }

  dispose() {
    this.node.remove();
  }
}
