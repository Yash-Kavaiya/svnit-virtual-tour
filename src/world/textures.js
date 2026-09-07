import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

export function canvasSupported() {
  try {
    return (
      typeof document !== 'undefined' &&
      !!document.createElement('canvas').getContext &&
      !!document.createElement('canvas').getContext('2d')
    );
  } catch {
    return false;
  }
}

export function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function flatTexture(color) {
  const data = new Uint8Array([...new THREE.Color(color).toArray().map((v) => v * 255), 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function finish(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function noiseTexture(size = 256, contrast = 0.5, seed = 1) {
  if (!canvasSupported()) return flatTexture('#808080');
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 255 * contrast;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function grassTexture({ base = '#5f7040', size = 512, repeat = 1, seed = 7 } = {}) {
  if (!canvasSupported()) return flatTexture(base);
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // mow stripes
  for (let y = 0; y < size; y += 40) {
    ctx.fillStyle = (y / 40) % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, size, 40);
  }
  // splotches
  for (let i = 0; i < 900; i++) {
    const g = 60 + rnd() * 90;
    ctx.fillStyle = `rgba(${g * 0.7 | 0}, ${g | 0}, ${g * 0.45 | 0}, ${0.05 + rnd() * 0.12})`;
    const r = 2 + rnd() * 10;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(canvas, repeat);
}

export function dirtTexture({ base = '#9c7b52', size = 256, repeat = 1, seed = 3 } = {}) {
  if (!canvasSupported()) return flatTexture(base);
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const v = 120 + rnd() * 90;
    ctx.fillStyle = `rgba(${v | 0}, ${(v * 0.8) | 0}, ${(v * 0.55) | 0}, ${0.06 + rnd() * 0.14})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  return finish(canvas, repeat);
}

export function concreteTexture({ tint = '#b8b4ad', size = 256, repeat = 1, seed = 5 } = {}) {
  if (!canvasSupported()) return flatTexture(tint);
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 800; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.02 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(rnd() * size, rnd() * size);
    ctx.lineTo(rnd() * size, rnd() * size);
    ctx.stroke();
  }
  return finish(canvas, repeat);
}

export function asphaltTexture({ base = '#55565c', size = 256, repeat = 1, seed = 11 } = {}) {
  if (!canvasSupported()) return flatTexture(base);
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = 60 + rnd() * 90;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.05 + rnd() * 0.14})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return finish(canvas, repeat);
}
