import * as THREE from 'three';
import { canvasSupported, makeCanvas } from '../textures.js';
import { mulberry32, hashString } from '../../core/rng.js';

// Per-category facade recipe. glazingRatio = window height / floor height.
export const FACADE_PARAMS = {
  academic: {
    wall: '#e6dcc6',
    band: '#a85b38',
    window: '#3f5a63',
    frame: '#d8ccae',
    plinth: '#8f7f66',
    glazingRatio: 0.42,
    winW: 1.6,
    winGap: 1.0,
    hasChhajja: true,
  },
  admin: {
    wall: '#e9e2d2',
    band: '#3b5c8a',
    window: '#43606a',
    frame: '#d0c6ad',
    plinth: '#8a8377',
    glazingRatio: 0.46,
    winW: 1.8,
    winGap: 1.2,
    hasChhajja: true,
  },
  library: {
    wall: '#efe6d0',
    band: '#b5451f',
    window: '#4a6b74',
    frame: '#cdbf9f',
    plinth: '#7c7060',
    glazingRatio: 0.62,
    winW: 2.4,
    winGap: 0.7,
    hasChhajja: false,
  },
  hostel: {
    wall: '#e2d7bd',
    band: '#7d6a4a',
    window: '#42555a',
    frame: '#cfc3a4',
    plinth: '#8a7b60',
    glazingRatio: 0.34,
    winW: 1.1,
    winGap: 0.7,
    hasChhajja: true,
    balconyRail: true,
  },
  workshop: {
    wall: '#c8cace',
    band: '#8a8f98',
    window: '#5b6b73',
    frame: '#aeb2b8',
    plinth: '#7d7f84',
    glazingRatio: 0.5,
    winW: 3.0,
    winGap: 1.4,
    hasChhajja: false,
  },
  utility: {
    wall: '#cfc7b6',
    band: '#8f8674',
    window: '#586066',
    frame: '#b8ae98',
    plinth: '#7c766a',
    glazingRatio: 0.24,
    winW: 1.2,
    winGap: 1.6,
    hasChhajja: false,
  },
  residence: {
    wall: '#ece0c8',
    band: '#a98d5f',
    window: '#4c5f63',
    frame: '#d6c9a9',
    plinth: '#8b7c62',
    glazingRatio: 0.36,
    winW: 1.4,
    winGap: 1.3,
    hasChhajja: true,
  },
  gate: {
    wall: '#d8c39c',
    band: '#8a5a3b',
    window: '#4a5a60',
    frame: '#c6b28c',
    plinth: '#7a6a52',
    glazingRatio: 0.2,
    winW: 1.0,
    winGap: 2.0,
    hasChhajja: false,
  },
};

const TILE = 512; // pixels per floor tile
const cache = new Map();

function mix(hex, target, t) {
  const a = new THREE.Color(hex);
  const b = new THREE.Color(target);
  return a.lerp(b, t).getStyle();
}

function drawFacade(ctx, p, seed) {
  const rnd = mulberry32(seed);
  const wall = mix(p.wall, rnd() > 0.5 ? '#ffffff' : '#000000', 0.04 + rnd() * 0.05);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, TILE, TILE);

  // subtle vertical plaster streaks
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`;
    const x = rnd() * TILE;
    ctx.fillRect(x, 0, 1 + rnd() * 2, TILE);
  }

  const floorH = TILE;
  const winH = p.glazingRatio * floorH;
  const sillY = (floorH - winH) * 0.55;
  const pxPerM = TILE / 4; // tile spans 4 m of wall (matches UV.u / 4 in extrude)
  const winW = p.winW * pxPerM;
  const gap = p.winGap * pxPerM;
  const stride = winW + gap;

  for (let x = gap * 0.5; x + winW < TILE + stride; x += stride) {
    // window recess
    ctx.fillStyle = p.frame;
    ctx.fillRect(x - 3, sillY - 3, winW + 6, winH + 6);
    // glass with a slight gradient
    const g = ctx.createLinearGradient(x, sillY, x, sillY + winH);
    g.addColorStop(0, mix(p.window, '#dfeef2', 0.35));
    g.addColorStop(1, mix(p.window, '#0a1a1e', 0.25));
    ctx.fillStyle = g;
    ctx.fillRect(x, sillY, winW, winH);
    // mullion
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + winW / 2, sillY);
    ctx.lineTo(x + winW / 2, sillY + winH);
    ctx.moveTo(x, sillY + winH / 2);
    ctx.lineTo(x + winW, sillY + winH / 2);
    ctx.stroke();
    // lit window at random (for night)
    if (rnd() < 0.12) {
      ctx.fillStyle = 'rgba(255, 214, 140, 0.25)';
      ctx.fillRect(x, sillY, winW, winH);
    }
    // chhajja shadow line above
    if (p.hasChhajja) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x - 8, sillY - 10, winW + 16, 7);
    }
  }

  // spandrel band at the bottom of the tile (floor line)
  ctx.fillStyle = p.band;
  ctx.fillRect(0, floorH - 14, TILE, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, floorH - 14, TILE, 3);

  if (p.balconyRail) {
    ctx.strokeStyle = 'rgba(60,60,60,0.6)';
    ctx.lineWidth = 3;
    const railY = floorH - 26;
    ctx.beginPath();
    ctx.moveTo(0, railY);
    ctx.lineTo(TILE, railY);
    ctx.stroke();
    for (let x = 6; x < TILE; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, railY);
      ctx.lineTo(x, floorH - 14);
      ctx.stroke();
    }
  }
}

export function facadeMaterial({ category = 'utility', accent, seed = 1, levels = 3 } = {}) {
  const family = FACADE_PARAMS[category] ? category : (FACADE_PARAMS[category]?.facade ?? 'utility');
  const p = { ...FACADE_PARAMS[family] };
  if (accent) p.band = accent;
  const levelBucket = Math.min(9, Math.max(1, Math.round(levels)));
  const key = `${family}|${accent ?? '-'}|${levelBucket}|${seed % 8}`;
  if (cache.has(key)) return cache.get(key);

  if (!canvasSupported()) {
    const m = new THREE.MeshStandardMaterial({ color: p.wall, roughness: 0.9 });
    cache.set(key, m);
    return m;
  }

  const { canvas, ctx } = makeCanvas(TILE);
  drawFacade(ctx, p, seed + hashString(family));
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // UV.u is (perimeter metres)/4 and UV.v is (y metres)/LEVEL_HEIGHT, so the
  // tile already maps to 4 m wide x 1 floor tall: no extra repeat needed here,
  // the geometry UVs drive tiling.
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: family === 'workshop' ? 0.6 : 0.88,
    metalness: 0.02,
  });
  mat.userData.plinthColor = p.plinth;
  cache.set(key, mat);
  return mat;
}

export function disposeFacadeCache() {
  for (const m of cache.values()) {
    m.map?.dispose?.();
    m.dispose?.();
  }
  cache.clear();
}
