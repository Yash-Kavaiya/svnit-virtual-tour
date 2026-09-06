import { el, trapFocus } from './dom.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';

const QUALITY = ['low', 'medium', 'high', 'ultra'];
const TIMES = ['dawn', 'noon', 'dusk', 'night'];

export class SettingsPanel {
  constructor(root) {
    this.root = root;
    this._release = null;
    this._controls = [];

    this.body = el('div', { style: { display: 'grid', gap: '1rem', marginTop: '.8rem' } });
    this.node = el(
      'div',
      {
        className: 'panel',
        role: 'dialog',
        'aria-label': 'Settings',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '1.4rem 1.6rem',
          width: 'min(420px, 92vw)',
          maxHeight: '86vh',
          overflowY: 'auto',
        },
      },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        el('strong', { style: { fontSize: '1.1rem' } }, 'Settings'),
        el('button', { onClick: () => this.close(), style: { minHeight: '32px', padding: '.2rem .6rem' } }, '✕'),
      ),
      this.body,
    );
    this.node.hidden = true;
    this.root.append(this.node);

    this.#build();
    this._onExternal = () => this.#sync();
    events.on('settings:change', this._onExternal);
  }

  #row(label, control) {
    return el(
      'label',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '.9rem' } },
      el('span', {}, label),
      control,
    );
  }

  #segmented(key, values, labels) {
    const wrap = el('div', { style: { display: 'flex', gap: '2px', flexWrap: 'wrap' } });
    values.forEach((v, i) => {
      const b = el(
        'button',
        {
          'data-setting': key,
          'data-value': v,
          onClick: () => Settings.set(key, v),
          style: { minHeight: '34px', padding: '.25rem .55rem', fontSize: '.8rem', textTransform: 'capitalize' },
        },
        labels?.[i] ?? v,
      );
      wrap.append(b);
    });
    this._controls.push({ key, kind: 'segmented', wrap });
    return wrap;
  }

  #toggle(key) {
    const input = el('input', { type: 'checkbox', 'data-setting': key, onChange: (e) => Settings.set(key, e.target.checked) });
    this._controls.push({ key, kind: 'toggle', input });
    return input;
  }

  #slider(key, min, max, step) {
    const input = el('input', {
      type: 'range',
      min,
      max,
      step,
      'data-setting': key,
      onInput: (e) => Settings.set(key, Number(e.target.value)),
      style: { width: '160px' },
    });
    this._controls.push({ key, kind: 'slider', input });
    return input;
  }

  #build() {
    const qualitySelect = el(
      'select',
      { 'data-setting': 'quality', onChange: (e) => Settings.set('quality', e.target.value), style: { padding: '.35rem .5rem', borderRadius: '6px' } },
      ...QUALITY.map((q) => el('option', { value: q }, q[0].toUpperCase() + q.slice(1))),
    );
    this._controls.push({ key: 'quality', kind: 'select', input: qualitySelect });

    this.body.replaceChildren(
      this.#row('Graphics quality', qualitySelect),
      this.#row('Time of day', this.#segmented('timeOfDay', TIMES)),
      this.#row('Ambient life', this.#toggle('ambientLife')),
      this.#row('Master volume', this.#slider('volumeMaster', 0, 1, 0.05)),
      this.#row('Ambience volume', this.#slider('volumeAmbience', 0, 1, 0.05)),
      this.#row('Effects volume', this.#slider('volumeSfx', 0, 1, 0.05)),
      this.#row('Field of view', this.#slider('fov', 60, 90, 1)),
      this.#row('Invert look Y', this.#toggle('invertY')),
      this.#row('Reduce motion', this.#toggle('reduceMotion')),
      this.#row('Colour-blind minimap', this.#toggle('minimapColorblind')),
    );
    this.#sync();
  }

  #sync() {
    for (const c of this._controls) {
      const v = Settings.get(c.key);
      if (c.kind === 'toggle') c.input.checked = !!v;
      else if (c.kind === 'slider') c.input.value = v;
      else if (c.kind === 'select') c.input.value = v;
      else if (c.kind === 'segmented') {
        for (const b of c.wrap.children) {
          const on = b.dataset.value === String(v);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('primary', on);
        }
      }
    }
  }

  open() {
    this.node.hidden = false;
    this.#sync();
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
    events.off('settings:change', this._onExternal);
    this.node.remove();
  }
}
