import { el } from './dom.js';
import { Settings } from '../core/Settings.js';

export class TourPanel {
  constructor(root) {
    this.root = root;
    this.rig = null;
    this.stops = [];
    this._tts = null;

    this.title = el('div', { style: { fontWeight: '700', fontSize: '1rem' } });
    this.progress = el('div', { style: { color: 'var(--text-dim)', fontSize: '.72rem', marginTop: '.1rem' } });
    this.caption = el('p', {
      style: { fontSize: '.9rem', lineHeight: '1.55', margin: '.6rem 0', maxHeight: '7.5rem', overflowY: 'auto' },
    });

    this.playBtn = el('button', { onClick: () => this.#togglePlay(), style: { minWidth: '84px' } }, 'Pause');
    const prevBtn = el('button', { onClick: () => this.rig?.prev() }, '‹ Prev');
    const nextBtn = el('button', { onClick: () => this.rig?.next() }, 'Next ›');
    const exitBtn = el('button', { onClick: () => this.rig?.stop() }, 'Exit tour');
    const ttsBtn = el(
      'button',
      { onClick: () => this.#toggleTts(), 'aria-pressed': 'false' },
      '🔊 Narrate',
    );
    this.ttsBtn = ttsBtn;

    this.node = el(
      'div',
      {
        className: 'panel',
        role: 'region',
        'aria-label': 'Guided tour',
        style: {
          left: '50%',
          bottom: '1.2rem',
          transform: 'translateX(-50%)',
          padding: '1rem 1.2rem',
          width: 'min(560px, 94vw)',
        },
      },
      this.title,
      this.progress,
      this.caption,
      el('div', { style: { display: 'flex', gap: '.5rem', flexWrap: 'wrap' } }, prevBtn, this.playBtn, nextBtn, ttsBtn, exitBtn),
    );
    this.node.hidden = true;
    this.root.append(this.node);
  }

  bind(rig, stops) {
    this.rig = rig;
    this.stops = stops;
  }

  show(index, stop) {
    this.node.hidden = false;
    this.title.textContent = stop.title;
    this.progress.textContent = `Stop ${index + 1} of ${this.stops.length}`;
    this.caption.textContent = stop.narration;
    this.playBtn.textContent = this.rig?.paused ? 'Resume' : 'Pause';
    if (this._ttsOn) this.#speak(stop.narration);
  }

  hide() {
    this.node.hidden = true;
    this.#stopSpeaking();
  }

  get isOpen() {
    return !this.node.hidden;
  }

  #togglePlay() {
    if (!this.rig) return;
    if (this.rig.paused) {
      this.rig.resume();
      this.playBtn.textContent = 'Pause';
    } else {
      this.rig.pause();
      this.playBtn.textContent = 'Resume';
    }
  }

  #toggleTts() {
    this._ttsOn = !this._ttsOn;
    this.ttsBtn.setAttribute('aria-pressed', this._ttsOn ? 'true' : 'false');
    this.ttsBtn.classList.toggle('primary', this._ttsOn);
    if (!this._ttsOn) this.#stopSpeaking();
    else if (this.rig?.current) this.#speak(this.rig.current.narration);
  }

  #speak(text) {
    if (typeof speechSynthesis === 'undefined') return;
    this.#stopSpeaking();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.volume = Settings.get('volumeSfx');
    speechSynthesis.speak(u);
  }

  #stopSpeaking() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  dispose() {
    this.#stopSpeaking();
    this.node.remove();
  }
}
