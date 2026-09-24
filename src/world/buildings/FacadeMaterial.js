import * as THREE from 'three';
import { canvasSupported, makeCanvas } from '../textures.js';
import { mulberry32, hashString } from '../../core/rng.js';

// Per-category facade recipe. glazingRatio = window height / floor height.
export const FACADE_PARAMS = {
  academic: {
    wall: '#e9dfc8',
    band: '#a8542f',
    glass: '#8fb7c4',
    frame: '#6b6357',
    plinth: '#7c6f5a',
    glazingRatio: 0.46,
    winW: 1.7,
    winGap: 0.9,
    hasChhajja: true,
  },
  admin: {
    wall: '#ece6d6',
    band: '#3b5c8a',
    glass: '#a6c6d6',
    frame: '#5c5750',
    plinth: '#7f776a',
    glazingRatio: 0.5,
    winW: 1.9,
    winGap: 1.1,
    hasChhajja: true,
  },
  library: {
    wall: '#efe6cf',
    band: '#b5451f',
    glass: '#9cc4cf',
    frame: '#5a534a',
    plinth: '#6f6456',
    glazingRatio: 0.66,
    winW: 2.6,
    winGap: 0.6,
    hasChhajja: true,
  },
  hostel: {
    wall: '#e6dabd',
    band: '#7d6a4a',
    glass: '#8bb0b6',
    frame: '#655c4f',
    plinth: '#82735a',
    glazingRatio: 0.4,
    winW: 1.2,
    winGap: 0.7,
    hasChhajja: true,
    balconyRail: true,
  },
  workshop: {
    wall: '#d3d4d6',
    band: '#8a8f98',
    glass: '#9fb2b8',
    frame: '#7c7f84',
    plinth: '#767779',
    glazingRatio: 0.55,
    winW: 3.2,
    winGap: 1.2,
    hasChhajja: false,
  },
  dining: {
    wall: '#f0e6cd',
    band: '#c9873f',
    glass: '#a6cccb',
    frame: '#5c5348',
    plinth: '#7a6a52',
    glazingRatio: 0.62,
    winW: 3.0,
    winGap: 0.6,
    hasChhajja: true,
  },
  utility: {
    wall: '#d6cdb9',
    band: '#8f8674',
    glass: '#8ba0a4',
    frame: '#6d675c',
    plinth: '#726c60',
    glazingRatio: 0.28,
    winW: 1.2,
    winGap: 1.6,
    hasChhajja: false,
  },
  residence: {
    wall: '#efe3ca',
    band: '#a98d5f',
    glass: '#8fb2b6',
    frame: '#6a6152',
    plinth: '#83745c',
    glazingRatio: 0.38,
    winW: 1.4,
    winGap: 1.3,
    hasChhajja: true,
  },
  gate: {
    wall: '#dcc59d',
    band: '#8a5a3b',
    glass: '#93a9ae',
    frame: '#6a5c48',
    plinth: '#736450',
    glazingRatio: 0.22,
    winW: 1.0,
    winGap: 2.0,
    hasChhajja: false,
  },
};

const TILE = 1024; // pixels per floor tile
const cache = new Map();

function mix(hex, target, t) {
  return new THREE.Color(hex).lerp(new THREE.Color(target), t).getStyle();
}

function drawPane(ctx, x, y, w, h, p, rnd) {
  // frame
  ctx.fillStyle = p.frame;
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  // glass — vertical gradient, brighter at the top (sky reflection)
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, mix(p.glass, '#eaf4f6', 0.55));
  g.addColorStop(0.45, mix(p.glass, '#dcecef', 0.2));
  g.addColorStop(1, mix(p.glass, '#12242a', 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // diagonal sheen
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.15);
  ctx.lineTo(x + w * 0.55, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h * 0.35);
  ctx.closePath();
  ctx.fill();
  // mullions
  ctx.strokeStyle = 'rgba(30,30,30,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.52);
  ctx.lineTo(x + w, y + h * 0.52);
  ctx.stroke();
  // occasionally lit / occasionally an AC unit
  if (rnd() < 0.14) {
    ctx.fillStyle = 'rgba(255, 214, 140, 0.30)';
    ctx.fillRect(x, y + h * 0.52, w, h * 0.48);
  }
  if (rnd() < 0.1) {
    ctx.fillStyle = '#c9c6bf';
    ctx.fillRect(x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.3);
  }
}

function drawFacade(ctx, p, seed) {
  const rnd = mulberry32(seed);
  const wall = mix(p.wall, rnd() > 0.5 ? '#ffffff' : '#1c140c', 0.03 + rnd() * 0.05);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, TILE, TILE);

  // plaster mottle + rain streaks
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '40,30,20'},${0.015 + rnd() * 0.03})`;
    const s = 4 + rnd() * 30;
    ctx.fillRect(rnd() * TILE, rnd() * TILE, s, s);
  }
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(30,24,16,${0.015 + rnd() * 0.03})`;
    const x = rnd() * TILE;
    ctx.fillRect(x, 0, 1 + rnd() * 3, TILE);
  }

  const floorH = TILE;
  const pxPerM = TILE / 4;
  const winH = p.glazingRatio * floorH;
  // window band sits in the upper-middle of the floor, under the chhajja
  const sillY = floorH * 0.22;
  const winW = p.winW * pxPerM;
  const gap = p.winGap * pxPerM;
  const stride = winW + gap;

  // continuous sill / spandrel below the windows
  ctx.fillStyle = mix(p.wall, '#000000', 0.12);
  ctx.fillRect(0, sillY + winH, TILE, 8);

  const panes = [];
  for (let x = gap * 0.4; x + winW < TILE + stride; x += stride) {
    drawPane(ctx, x, sillY, winW, winH, p, rnd);
    panes.push([x, sillY, winW, winH]);
  }

  // strong chhajja relief at the TOP of the tile (the floor line):
  // a bright highlight, then the slab, then a soft cast shadow onto the wall
  if (p.hasChhajja) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, 2, TILE, 5);
    ctx.fillStyle = mix(p.wall, '#000000', 0.18);
    ctx.fillRect(0, 7, TILE, 16);
    const sh = ctx.createLinearGradient(0, 23, 0, sillY - 4);
    sh.addColorStop(0, 'rgba(0,0,0,0.32)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 23, TILE, sillY - 27);
  }

  // accent floor band at the very bottom of the tile (aligns with 3D string course)
  ctx.fillStyle = p.band;
  ctx.fillRect(0, floorH - 20, TILE, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, floorH - 20, TILE, 3);

  if (p.balconyRail) {
    ctx.strokeStyle = 'rgba(50,50,50,0.6)';
    ctx.lineWidth = 4;
    const railY = sillY + winH + 22;
    ctx.beginPath();
    ctx.moveTo(0, railY);
    ctx.lineTo(TILE, railY);
    ctx.stroke();
    for (let x = 10; x < TILE; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, railY);
      ctx.lineTo(x, floorH - 20);
      ctx.stroke();
    }
  }
  return panes;
}

// Share of windows lit after dark, by building family.
const LIT_SHARE = { hostel: 0.62, residence: 0.55, library: 0.5, academic: 0.3, admin: 0.22, dining: 0.5 };
const LIT_GRID = 8; // one lit map spans 8 facade bays x 8 floors
const LIT_CELL = 32;
const LIT_SIZE = LIT_GRID * LIT_CELL;

// Low-res emissive atlas: each of the 8x8 cells is one facade tile (4 m x 1
// floor) with its own random set of warm-lit panes, so the lit pattern
// doesn't repeat bay after bay.
function drawLitWindows(ctx, panes, share, seed) {
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const k = LIT_CELL / TILE;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, LIT_SIZE, LIT_SIZE);
  for (let gy = 0; gy < LIT_GRID; gy++) {
    for (let gx = 0; gx < LIT_GRID; gx++) {
      for (const [x, y, w, h] of panes) {
        if (rnd() > share) continue;
        ctx.fillStyle = rnd() < 0.8 ? '#ffcf8a' : '#dfe9ff'; // tube-light white now and then
        ctx.fillRect(gx * LIT_CELL + x * k, gy * LIT_CELL + y * k, w * k, h * k);
      }
    }
  }
}

const NIGHT_EMISSIVE = { dawn: 0, noon: 0, dusk: 0.45, night: 1.1 };

// Turn window glow up/down for a time-of-day preset on every facade.
export function setFacadeNight(timeOfDay) {
  const v = NIGHT_EMISSIVE[timeOfDay] ?? 0;
  for (const m of cache.values()) if (m.emissiveMap) m.emissiveIntensity = v;
}

export function facadeMaterial({ category = 'utility', accent, seed = 1, levels = 3 } = {}) {
  const family = FACADE_PARAMS[category] ? category : 'utility';
  const p = { ...FACADE_PARAMS[family] };
  if (accent) p.band = accent;
  const levelBucket = Math.min(9, Math.max(1, Math.round(levels)));
  const key = `${family}|${accent ?? '-'}|${levelBucket}|${seed % 6}`;
  if (cache.has(key)) return cache.get(key);

  if (!canvasSupported()) {
    const m = new THREE.MeshStandardMaterial({ color: p.wall, roughness: 0.9 });
    cache.set(key, m);
    return m;
  }

  const { canvas, ctx } = makeCanvas(TILE);
  const panes = drawFacade(ctx, p, seed + hashString(family));
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: family === 'workshop' ? 0.55 : 0.82,
    metalness: 0.04,
  });
  const share = LIT_SHARE[family];
  if (share) {
    const lit = makeCanvas(LIT_SIZE);
    drawLitWindows(lit.ctx, panes, share, seed);
    const litTex = new THREE.CanvasTexture(lit.canvas);
    litTex.wrapS = THREE.RepeatWrapping;
    litTex.wrapT = THREE.RepeatWrapping;
    litTex.repeat.set(1 / LIT_GRID, 1 / LIT_GRID);
    litTex.colorSpace = THREE.SRGBColorSpace;
    mat.emissive = new THREE.Color('#ffffff');
    mat.emissiveMap = litTex;
    mat.emissiveIntensity = 0;
  }
  mat.userData.plinthColor = p.plinth;
  mat.userData.wallColor = p.wall;
  cache.set(key, mat);
  return mat;
}

export function disposeFacadeCache() {
  for (const m of cache.values()) {
    m.map?.dispose?.();
    m.emissiveMap?.dispose?.();
    m.dispose?.();
  }
  cache.clear();
}
