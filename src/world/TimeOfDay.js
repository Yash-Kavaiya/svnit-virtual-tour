// Four time-of-day moods tuned for a hazy Surat sky. Pure data + interpolation;
// no Three.js here so it is unit-testable.

export const TIME_PRESETS = {
  dawn: {
    sunDir: [0.35, 0.18, 0.9],
    sunColor: '#ffcf9a',
    sunIntensity: 1.7,
    hemiSky: '#f4c9a8',
    hemiGround: '#4a4038',
    hemiIntensity: 0.55,
    skyHorizon: '#f6b98a',
    skyZenith: '#3f5c86',
    fogColor: '#e9c6a6',
    fogDensity: 0.0022,
    exposure: 0.95,
    ambient: '#6d5a4d',
    ambientIntensity: 0.42,
    starOpacity: 0.15,
  },
  noon: {
    sunDir: [0.2, 0.95, 0.25],
    sunColor: '#fff4e0',
    sunIntensity: 2.55,
    hemiSky: '#bcd8ff',
    hemiGround: '#6a5c46',
    hemiIntensity: 1.3,
    skyHorizon: '#cfe4f5',
    skyZenith: '#5c9fe0',
    fogColor: '#c9dced',
    fogDensity: 0.0016,
    exposure: 1.0,
    ambient: '#9a9a9a',
    ambientIntensity: 0.75,
    starOpacity: 0,
  },
  dusk: {
    sunDir: [-0.55, 0.12, -0.82],
    sunColor: '#ff9d5c',
    sunIntensity: 1.5,
    hemiSky: '#e79a6a',
    hemiGround: '#3c342e',
    hemiIntensity: 0.5,
    skyHorizon: '#e8814f',
    skyZenith: '#2f3f6b',
    fogColor: '#d98f60',
    fogDensity: 0.0026,
    exposure: 0.92,
    ambient: '#5b4a40',
    ambientIntensity: 0.4,
    starOpacity: 0.35,
  },
  night: {
    sunDir: [-0.3, 0.6, -0.4],
    sunColor: '#9fb6d8',
    sunIntensity: 0.35,
    hemiSky: '#20304f',
    hemiGround: '#0c1018',
    hemiIntensity: 0.35,
    skyHorizon: '#141d33',
    skyZenith: '#070b16',
    fogColor: '#0f1626',
    fogDensity: 0.003,
    exposure: 1.05,
    ambient: '#1b2436',
    ambientIntensity: 0.5,
    starOpacity: 1,
  },
};

export const TIME_ORDER = ['dawn', 'noon', 'dusk', 'night'];

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function colorLerp(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const tt = clamp01(t);
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * tt,
    ca[1] + (cb[1] - ca[1]) * tt,
    ca[2] + (cb[2] - ca[2]) * tt,
  ]);
}

export function interpolatePreset(a, b, t) {
  const tt = clamp01(t);
  const out = {};
  for (const key of Object.keys(a)) {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number') {
      out[key] = va + (vb - va) * tt;
    } else if (typeof va === 'string' && va.startsWith('#')) {
      out[key] = colorLerp(va, vb, tt);
    } else if (Array.isArray(va)) {
      out[key] = va.map((n, i) => n + (vb[i] - n) * tt);
    } else {
      out[key] = tt < 0.5 ? va : vb;
    }
  }
  return out;
}
