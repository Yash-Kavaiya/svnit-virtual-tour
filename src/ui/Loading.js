import { el } from './dom.js';

export class Loading {
  constructor(root) {
    this.root = root;
    this.bar = el('div', {
      style: {
        height: '100%',
        width: '0%',
        background: 'var(--accent)',
        borderRadius: '4px',
        transition: 'width .25s ease',
      },
    });
    this.label = el('div', {
      style: { color: 'var(--text-dim)', fontSize: '.85rem', marginTop: '.6rem' },
    });
    this.node = el(
      'div',
      {
        className: 'panel',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '1.5rem 2rem',
          textAlign: 'center',
          minWidth: '300px',
        },
      },
      el('div', { style: { fontSize: '1.1rem', fontWeight: '600' } }, 'SVNIT Surat — Virtual Campus Tour'),
      el(
        'div',
        {
          style: {
            marginTop: '1rem',
            height: '8px',
            background: 'rgba(255,255,255,.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          },
        },
        this.bar,
      ),
      this.label,
    );
  }

  show() {
    this.root.append(this.node);
    return this;
  }

  setProgress(t, label) {
    this.bar.style.width = `${Math.round(Math.max(0, Math.min(1, t)) * 100)}%`;
    if (label) this.label.textContent = label;
  }

  done() {
    this.setProgress(1);
    setTimeout(() => this.node.remove(), 250);
  }
}
