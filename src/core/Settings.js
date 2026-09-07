import { events } from './events.js';

const KEY = 'svnit.settings';

const defaults = {
  quality: 'high', // low | medium | high | ultra
  timeOfDay: 'noon', // dawn | noon | dusk | night
  ambientLife: true,
  volumeMaster: 0.7,
  volumeAmbience: 0.6,
  volumeSfx: 0.8,
  fov: 70, // 60..90
  invertY: false,
  reduceMotion: false,
  minimapColorblind: false,
};

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

const state = load();

// Honour the OS reduced-motion preference on first load if the user hasn't chosen.
try {
  if (
    globalThis.matchMedia &&
    globalThis.localStorage?.getItem(KEY) == null &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    state.reduceMotion = true;
  }
} catch {
  /* ignore */
}

export const Settings = {
  defaults,
  all: () => ({ ...state }),
  get: (k) => state[k],
  set(k, v) {
    if (!(k in defaults)) throw new Error(`unknown setting: ${k}`);
    state[k] = v;
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    events.emit('settings:change', { key: k, value: v, all: { ...state } });
  },
};
