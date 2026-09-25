import { el, trapFocus } from './dom.js';

export const AUTHOR_LINKS = [
  ['LinkedIn', 'https://www.linkedin.com/in/yashkavaiya'],
  ['X (Twitter)', 'https://x.com/yashkavaiya'],
];

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
      el(
        'div',
        { className: 'credits-author', style: { margin: '.2rem 0 .9rem', padding: '.7rem .9rem', borderRadius: '8px', background: 'rgba(255,255,255,.06)' } },
        el('div', {}, 'Created by ', el('strong', {}, 'Yash Kavaiya')),
        el(
          'div',
          { style: { display: 'flex', gap: '1rem', marginTop: '.35rem', flexWrap: 'wrap' } },
          ...AUTHOR_LINKS.map(([label, href]) =>
            el('a', { href, target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--accent, #f0a35e)' } }, label),
          ),
        ),
      ),
      el('p', {}, el('strong', {}, 'Campus geometry '), '— building footprints and courtyards, roads, entrances and the campus boundary are derived from ', el('strong', {}, 'OpenStreetMap'), ', © OpenStreetMap contributors, licensed under the Open Database License (ODbL).'),
      el('p', {}, el('strong', {}, 'Reference '), '— hostel facts and the two entrance gates follow the SVNIT Hostel Information Brochure 2025-26; library figures follow the SVNIT Central Library website. The Hindi name uses Noto Sans Devanagari (SIL Open Font License).'),
      el('p', {}, el('strong', {}, 'Buildings, interiors, props, landscaping, audio and tour narration '), 'are original and interpretive — building facades and interior layouts are plausible reconstructions, not exact representations of the real buildings.'),
      el('p', {}, 'Built with three.js, troika-three-text and three-mesh-bvh.'),
      el('p', { style: { color: 'var(--text-dim)', fontSize: '.8rem' } }, 'This site uses Microsoft Clarity to understand how visitors use the tour (anonymous usage analytics).'),
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
