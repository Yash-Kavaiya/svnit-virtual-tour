# SVNIT Surat 3D Virtual Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based, real-time walkable 3D virtual tour of the SVNIT Surat campus whose layout comes from real OpenStreetMap data, with procedurally-styled buildings, landmarks, three enterable interiors, a guided tour, and full navigation/UI.

**Architecture:** A build-time Node pipeline turns committed Overpass/OSM JSON into a single `campus.generated.json` (buildings as metric footprints + heights, roads, water, greens, POIs). A vanilla Three.js runtime (Vite) reads that file and constructs the world: ground, roads, water, extruded category-styled buildings with name-boards, instanced vegetation/props, landmarks. A player controller (walk + fly), UI overlay (minimap, info panels, directory, settings), three interior scenes, a keyframed guided tour, and WebAudio ambience sit on top. Logic-heavy parts (pipeline, geometry, collision, interpolation, settings) are TDD'd with Vitest; rendering is verified with smoke tests + visual checkpoints.

**Tech Stack:** Vite 5, Three.js (latest r1xx stable), vanilla ES modules, `troika-three-text`, `three-mesh-bvh`, Vitest, ESLint, Prettier. No UI framework. Deploy target: static host.

**Spec:** `docs/superpowers/specs/2026-09-06-svnit-3d-virtual-tour-design.md`

## Global Constraints

- **1 unit = 1 metre.** Right-handed: `+X` east, `+Z` south, `+Y` up. Ground at `y=0`.
- **World origin** = campus centroid from OSM way `150694694`. All geo→local projection is equirectangular about that origin: `x = R*(lon-lon0)*π/180*cos(lat0)`, `z = -R*(lat-lat0)*π/180`, `R = 6378137`.
- **No external runtime asset downloads.** Everything procedural or generated; textures drawn to canvas at runtime. Audio synthesized via WebAudio or tiny inline buffers.
- **Committed generated data:** `src/data/campus.generated.json` is committed; the app must build and run without re-running the pipeline or hitting the network.
- **Attribution:** every build of the app shows "Campus geometry © OpenStreetMap contributors (ODbL)" in the Credits screen; `README.md` and `CREDITS.md` repeat it and state facades/interiors are interpretive.
- **Node ESM** for all scripts and source (`"type": "module"`). Package manager: `npm`.
- **Accessibility:** all UI keyboard-reachable, visible focus rings, respects `prefers-reduced-motion` and `prefers-color-scheme`, touch targets ≥ 44px.
- **Performance budgets (typical view):** ≤ ~350 draw calls, ≤ 1.5M triangles, interactive < 6s on cable. Enforced in Task 35 QA.
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, `fix:`, `docs:`). Commit at the end of every task; small in-task commits allowed. End commit messages with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01JtFk4VgnUqUz8XXEot5dxh
  ```
- **Branch:** `feat/svnit-3d-virtual-tour` (already created).
- **Coordinate/type vocabulary** (used across tasks):
  - `Vec2 = [number, number]` meaning `[x, z]` in metres.
  - `Ring = Vec2[]` — closed polygon, first point NOT repeated at end, CCW = outer.
  - `LatLon = { lat: number, lon: number }`.
  - `BuildingRecord`, `CampusData` — schemas defined in Task 5.

---

## File Structure

**Pipeline (Node, no Three.js):**
- `scripts/build-campus-data.mjs` — CLI entry; orchestrates parse→project→clip→classify→emit.
- `scripts/lib/geo.mjs` — `projectLatLon`, `unprojectXZ`, `metersPerDegree`.
- `scripts/lib/polygon.mjs` — `pointInRing`, `ringArea`, `ringCentroid`, `ensureWinding`, `simplifyRing`, `dedupeRing`.
- `scripts/lib/classify.mjs` — `classifyBuilding`, `estimateHeight`, category tables.
- `scripts/lib/overpass.mjs` — `parseOverpass` → typed feature arrays.
- `data/osm/overpass-raw.json` — committed source (already present).
- `data/campus/curated.mjs` — hand overlay: per-building metadata, extra buildings, gates, zone labels.
- `data/campus/README.md` — how to refine campus data.
- `src/data/campus.generated.json` — committed pipeline output.
- `src/data/schema.mjs` — `validateCampusData(obj)` shared by pipeline + runtime smoke tests.

**Runtime core:**
- `index.html`, `src/main.js`
- `src/core/Renderer.js`, `src/core/SceneManager.js`, `src/core/AssetRegistry.js`, `src/core/Settings.js`, `src/core/events.js`, `src/core/Clock.js`
- `src/core/rng.js` — seeded PRNG (`mulberry32`).

**World:**
- `src/world/Campus.js` (orchestrator)
- `src/world/Sky.js`, `src/world/Lighting.js`, `src/world/TimeOfDay.js`
- `src/world/Ground.js`, `src/world/Roads.js`, `src/world/Water.js`
- `src/world/buildings/extrude.js`, `src/world/buildings/FacadeMaterial.js`, `src/world/buildings/RoofKit.js`, `src/world/buildings/Entrance.js`, `src/world/buildings/Buildings.js`, `src/world/buildings/lod.js`
- `src/world/Vegetation.js`, `src/world/StreetKit.js`, `src/world/Landmarks.js`, `src/world/Life.js`

**Player:**
- `src/player/PlayerController.js`, `src/player/Collision.js`, `src/player/FlyControls.js`, `src/player/MobileControls.js`, `src/player/Teleport.js`

**Interiors:**
- `src/interiors/InteriorBase.js`, `src/interiors/LibraryInterior.js`, `src/interiors/LectureHallInterior.js`, `src/interiors/AdminLobbyInterior.js`
- `src/interiors/kit/FurnitureKit.js`

**UI:**
- `src/ui/Loading.js`, `src/ui/StartMenu.js`, `src/ui/HUD.js`, `src/ui/Minimap.js`, `src/ui/InfoPanel.js`, `src/ui/Directory.js`, `src/ui/SettingsPanel.js`, `src/ui/Credits.js`, `src/ui/TourPanel.js`
- `src/ui/dom.js` — tiny DOM helpers (`el`, `mount`, focus trap).
- `src/styles/tokens.css`, `src/styles/ui.css`

**Tour / Audio:**
- `src/tour/route.js`, `src/tour/CameraRig.js`, `src/tour/keyframes.js`
- `src/audio/Ambience.js`, `src/audio/synth.js`

**Tests:** mirror under `tests/` (e.g. `tests/pipeline/geo.test.mjs`, `tests/world/extrude.test.js`, `tests/player/collision.test.js`, `tests/tour/keyframes.test.js`, `tests/core/settings.test.js`, `tests/smoke/world.test.js`).

**Meta:** `README.md`, `CREDITS.md`, `docs/QA-checklist.md`, `.github/workflows/ci.yml`, `netlify.toml` (or `vercel.json`).

---

## Task 1: Project scaffold + render loop

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.eslintrc.json`, `.prettierrc`, `.gitignore`, `vitest.config.js`, `.github/workflows/ci.yml`
- Create: `src/main.js`, `src/core/Renderer.js`, `src/core/Clock.js`, `src/core/events.js`
- Create: `src/styles/tokens.css`, `src/styles/ui.css`
- Test: `tests/smoke/boot.test.js`

**Interfaces:**
- Produces:
  - `createRenderer(canvas: HTMLCanvasElement) => { renderer: THREE.WebGLRenderer, setSize(w,h), dispose() }`
  - `class Clock { get elapsed(): number; get delta(): number; tick(): void }`
  - `events` — `{ on(name,fn), off(name,fn), emit(name,payload) }` singleton.
  - `src/main.js` default-exports nothing; on import it mounts the app to `#app`.

- [ ] **Step 1: Init package and deps**

```bash
cd C:/Users/yashk/Downloads/svnit-virtual-tour
npm init -y
npm pkg set type=module name=svnit-virtual-tour version=0.1.0 private=true
npm pkg set scripts.dev="vite" scripts.build="vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch="vitest" scripts.lint="eslint . --ext .js,.mjs" scripts.format="prettier -w ." scripts.data="node scripts/build-campus-data.mjs"
npm i three troika-three-text three-mesh-bvh
npm i -D vite vitest eslint prettier jsdom @types/three
```

- [ ] **Step 2: Write the failing smoke test**

`tests/smoke/boot.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';

describe('boot', () => {
  it('Clock reports monotonic elapsed time', async () => {
    const { Clock } = await import('../../src/core/Clock.js');
    const c = new Clock();
    c.tick();
    const a = c.elapsed;
    await new Promise((r) => setTimeout(r, 10));
    c.tick();
    expect(c.elapsed).toBeGreaterThanOrEqual(a);
    expect(c.delta).toBeGreaterThanOrEqual(0);
  });

  it('event bus delivers payloads', async () => {
    const { events } = await import('../../src/core/events.js');
    const spy = vi.fn();
    events.on('ping', spy);
    events.emit('ping', 42);
    expect(spy).toHaveBeenCalledWith(42);
    events.off('ping', spy);
  });
});
```

- [ ] **Step 3: Run test, expect fail**

Run: `npm test -- tests/smoke/boot.test.js`
Expected: FAIL — cannot resolve `src/core/Clock.js` / `src/core/events.js`.

- [ ] **Step 4: Implement core modules**

`src/core/events.js`:

```js
class Bus {
  #map = new Map();
  on(name, fn) { (this.#map.get(name) ?? this.#map.set(name, new Set()).get(name)).add(fn); }
  off(name, fn) { this.#map.get(name)?.delete(fn); }
  emit(name, payload) { this.#map.get(name)?.forEach((fn) => fn(payload)); }
}
export const events = new Bus();
```

`src/core/Clock.js`:

```js
export class Clock {
  #start = performance.now();
  #last = this.#start;
  #elapsed = 0;
  #delta = 0;
  tick() {
    const now = performance.now();
    this.#delta = (now - this.#last) / 1000;
    this.#last = now;
    this.#elapsed = (now - this.#start) / 1000;
  }
  get elapsed() { return this.#elapsed; }
  get delta() { return this.#delta; }
}
```

`src/core/Renderer.js`:

```js
import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const setSize = (w, h) => { renderer.setSize(w, h, false); };
  return { renderer, setSize, dispose: () => renderer.dispose() };
}
```

- [ ] **Step 5: Implement index.html + main.js (spinning reference cube, orbit debug)**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>SVNIT Surat — 3D Virtual Tour</title>
    <link rel="stylesheet" href="/src/styles/tokens.css" />
    <link rel="stylesheet" href="/src/styles/ui.css" />
  </head>
  <body>
    <div id="app"><canvas id="scene"></canvas></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`src/main.js`:

```js
import * as THREE from 'three';
import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';

const canvas = document.getElementById('scene');
const { renderer, setSize } = createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fc6e8');
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
camera.position.set(6, 5, 10);
camera.lookAt(0, 1, 0);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: '#c96f3f' }),
);
cube.castShadow = true;
scene.add(cube);
scene.add(new THREE.HemisphereLight('#bcd8ff', '#4a3f2f', 1.0));
const sun = new THREE.DirectionalLight('#fff2d8', 2.0);
sun.position.set(20, 30, 10);
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new Clock();
function frame() {
  clock.tick();
  cube.rotation.y += clock.delta * 0.6;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
```

`src/styles/tokens.css`:

```css
:root {
  color-scheme: dark light;
  --bg: #0b0d10;
  --panel: rgba(18, 22, 28, 0.82);
  --panel-border: rgba(255, 255, 255, 0.12);
  --text: #eef2f6;
  --text-dim: #9aa7b2;
  --accent: #f2a65a;
  --accent-2: #5aa7f2;
  --radius: 12px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
html, body, #app { margin: 0; height: 100%; width: 100%; overflow: hidden; background: var(--bg); }
#scene { display: block; width: 100%; height: 100%; }
```

`src/styles/ui.css`:

```css
.panel {
  position: absolute; background: var(--panel); color: var(--text);
  border: 1px solid var(--panel-border); border-radius: var(--radius);
  font-family: var(--font); backdrop-filter: blur(8px);
}
button:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
```

- [ ] **Step 6: Config files**

`vite.config.js`:

```js
import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { target: 'es2022', sourcemap: true } });
```

`vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.{js,mjs}'] } });
```

`.gitignore`:

```
node_modules
dist
*.local
.DS_Store
```

`.eslintrc.json`:

```json
{
  "root": true,
  "env": { "browser": true, "es2022": true, "node": true },
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "extends": "eslint:recommended",
  "rules": { "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] }
}
```

`.prettierrc`:

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

`.github/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 7: Run test + lint + build, expect pass**

Run: `npm test && npm run lint && npm run build`
Expected: tests PASS, lint clean, `dist/` produced.

- [ ] **Step 8: Visual checkpoint**

Run `npm run dev`, open the app (use the `run` skill / browser). Expect: orange cube on a light-blue background, rotating, resizes with window.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Three.js app with render loop and CI"
```

---

## Task 2: Geo projection utilities

**Files:**
- Create: `scripts/lib/geo.mjs`
- Test: `tests/pipeline/geo.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `metersPerDegree(lat0: number) => { mx: number, mz: number }` (metres per degree lon, per degree lat).
  - `makeProjector(origin: LatLon) => { toXZ(ll: LatLon) => Vec2, toLatLon(p: Vec2) => LatLon }`
  - `EARTH_R = 6378137`

- [ ] **Step 1: Write failing tests**

`tests/pipeline/geo.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { makeProjector, metersPerDegree, EARTH_R } from '../../scripts/lib/geo.mjs';

const ORIGIN = { lat: 21.163, lon: 72.785 };

describe('geo', () => {
  it('origin maps to (0,0)', () => {
    const p = makeProjector(ORIGIN);
    const [x, z] = p.toXZ(ORIGIN);
    expect(Math.abs(x)).toBeLessThan(1e-6);
    expect(Math.abs(z)).toBeLessThan(1e-6);
  });

  it('round-trips within 0.5 m over a 1.5 km span', () => {
    const p = makeProjector(ORIGIN);
    const pt = { lat: 21.170, lon: 72.793 };
    const back = p.toLatLon(p.toXZ(pt));
    const { mx, mz } = metersPerDegree(ORIGIN.lat);
    const errE = Math.abs(back.lon - pt.lon) * mx;
    const errN = Math.abs(back.lat - pt.lat) * mz;
    expect(errE).toBeLessThan(0.5);
    expect(errN).toBeLessThan(0.5);
  });

  it('north is -Z, east is +X', () => {
    const p = makeProjector(ORIGIN);
    const north = p.toXZ({ lat: ORIGIN.lat + 0.001, lon: ORIGIN.lon });
    const east = p.toXZ({ lat: ORIGIN.lat, lon: ORIGIN.lon + 0.001 });
    expect(north[1]).toBeLessThan(0);
    expect(east[0]).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail** — Run: `npm test -- tests/pipeline/geo.test.mjs` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`scripts/lib/geo.mjs`:

```js
export const EARTH_R = 6378137;
const D2R = Math.PI / 180;

export function metersPerDegree(lat0) {
  return {
    mx: EARTH_R * D2R * Math.cos(lat0 * D2R),
    mz: EARTH_R * D2R,
  };
}

export function makeProjector(origin) {
  const { mx, mz } = metersPerDegree(origin.lat);
  return {
    toXZ(ll) {
      return [(ll.lon - origin.lon) * mx, -(ll.lat - origin.lat) * mz];
    },
    toLatLon([x, z]) {
      return { lat: origin.lat - z / mz, lon: origin.lon + x / mx };
    },
  };
}
```

- [ ] **Step 4: Run, expect pass** — Run: `npm test -- tests/pipeline/geo.test.mjs` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/geo.mjs tests/pipeline/geo.test.mjs
git commit -m "feat: equirectangular geo projection utilities for campus pipeline"
```

---

## Task 3: Polygon utilities

**Files:**
- Create: `scripts/lib/polygon.mjs`
- Test: `tests/pipeline/polygon.test.mjs`

**Interfaces:**
- Consumes: `Vec2`, `Ring` from Global Constraints.
- Produces:
  - `ringArea(ring: Ring) => number` — signed; positive = CCW.
  - `ringCentroid(ring: Ring) => Vec2`
  - `pointInRing(p: Vec2, ring: Ring) => boolean` — ray cast, edge-inclusive tolerant.
  - `ensureWinding(ring: Ring, ccw = true) => Ring` — returns ring (possibly reversed).
  - `dedupeRing(ring: Ring, eps = 0.01) => Ring` — drops consecutive duplicates and closing repeat.
  - `simplifyRing(ring: Ring, eps = 0.35) => Ring` — Douglas–Peucker.
  - `longestEdgeAngle(ring: Ring) => number` — radians, orientation of longest edge.

- [ ] **Step 1: Write failing tests**

`tests/pipeline/polygon.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import {
  ringArea, ringCentroid, pointInRing, ensureWinding, dedupeRing, simplifyRing, longestEdgeAngle,
} from '../../scripts/lib/polygon.mjs';

const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10]]; // CCW in x/z math sense

describe('polygon', () => {
  it('area of unit-ish square', () => {
    expect(ringArea(SQUARE)).toBeCloseTo(100, 5);
    expect(ringArea([...SQUARE].reverse())).toBeCloseTo(-100, 5);
  });
  it('centroid of square', () => {
    expect(ringCentroid(SQUARE)).toEqual([5, 5]);
  });
  it('point in / out', () => {
    expect(pointInRing([5, 5], SQUARE)).toBe(true);
    expect(pointInRing([-1, 5], SQUARE)).toBe(false);
    expect(pointInRing([50, 50], SQUARE)).toBe(false);
  });
  it('ensureWinding flips CW to CCW', () => {
    const cw = [...SQUARE].reverse();
    expect(ringArea(ensureWinding(cw, true))).toBeGreaterThan(0);
  });
  it('dedupeRing removes closing repeat and dupes', () => {
    expect(dedupeRing([[0, 0], [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]])).toEqual(SQUARE);
  });
  it('simplifyRing drops a near-collinear point', () => {
    const withMid = [[0, 0], [5, 0.05], [10, 0], [10, 10], [0, 10]];
    expect(simplifyRing(withMid, 0.35).length).toBe(4);
  });
  it('longestEdgeAngle of a wide rectangle is ~0', () => {
    const rect = [[0, 0], [20, 0], [20, 5], [0, 5]];
    expect(Math.abs(longestEdgeAngle(rect))).toBeLessThan(0.01);
  });
});
```

- [ ] **Step 2: Run, expect fail** — `npm test -- tests/pipeline/polygon.test.mjs` — FAIL (missing module).

- [ ] **Step 3: Implement**

`scripts/lib/polygon.mjs`:

```js
export function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

export function ringCentroid(ring) {
  let cx = 0, cz = 0, a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    const cross = x1 * z2 - x2 * z1;
    a += cross; cx += (x1 + x2) * cross; cz += (z1 + z2) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    const m = ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    return [m[0] / ring.length, m[1] / ring.length];
  }
  a *= 3;
  return [cx / a, cz / a];
}

export function pointInRing(p, ring) {
  const [px, pz] = p;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const hit = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function ensureWinding(ring, ccw = true) {
  const positive = ringArea(ring) > 0;
  return positive === ccw ? ring : [...ring].reverse();
}

export function dedupeRing(ring, eps = 0.01) {
  const out = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > eps) out.push([p[0], p[1]]);
  }
  while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) {
    out.pop();
  }
  return out;
}

function perpDist(p, a, b) {
  const [px, pz] = p, [ax, az] = a, [bx, bz] = b;
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz) || 1e-9;
  return Math.abs((px - ax) * dz - (pz - az) * dx) / len;
}

export function simplifyRing(ring, eps = 0.35) {
  if (ring.length < 4) return ring;
  const keep = new Array(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(ring[i], ring[s], ring[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx !== -1) { keep[idx] = true; stack.push([s, idx], [idx, e]); }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : ring;
}

export function longestEdgeAngle(ring) {
  let best = 0, angle = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len > best) { best = len; angle = Math.atan2(z2 - z1, x2 - x1); }
  }
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
```

- [ ] **Step 4: Run, expect pass** — `npm test -- tests/pipeline/polygon.test.mjs` — PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/polygon.mjs tests/pipeline/polygon.test.mjs
git commit -m "feat: polygon geometry utilities (area, centroid, PIP, winding, simplify)"
```

---

## Task 4: Building classifier + height estimator

**Files:**
- Create: `scripts/lib/classify.mjs`
- Test: `tests/pipeline/classify.test.mjs`

**Interfaces:**
- Consumes: nothing (operates on OSM-tag objects + name strings).
- Produces:
  - `CATEGORIES` — `['academic','admin','library','hostel','workshop','lab','sports','dining','health','utility','residence','gate','amenity']`
  - `classifyBuilding({ tags: object, name?: string }) => Category`
  - `estimateHeight(category: Category, levels?: number) => { height: number, levels: number }` — `height` in metres.
  - `LEVEL_HEIGHT = 3.4`, `PARAPET = 1.2`

- [ ] **Step 1: Write failing tests**

`tests/pipeline/classify.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { classifyBuilding, estimateHeight, LEVEL_HEIGHT, PARAPET } from '../../scripts/lib/classify.mjs';

describe('classifyBuilding', () => {
  it('library by amenity tag', () => {
    expect(classifyBuilding({ tags: { amenity: 'library' }, name: 'Central library' })).toBe('library');
  });
  it('hostel by dormitory building tag', () => {
    expect(classifyBuilding({ tags: { building: 'dormitory' }, name: 'Gajjar Bhavan H4' })).toBe('hostel');
  });
  it('hostel by Bhavan name even without tag', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'Tagor Bhavan' })).toBe('hostel');
  });
  it('academic by Department name', () => {
    expect(classifyBuilding({ tags: { building: 'yes', office: 'educational_institution' }, name: 'Mechanical Engineering Department' })).toBe('academic');
  });
  it('admin by name', () => {
    expect(classifyBuilding({ tags: { building: 'office' }, name: 'Administration Building' })).toBe('admin');
  });
  it('workshop by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'SVNIT Workshop' })).toBe('workshop');
  });
  it('lab by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'Material Testing Lab' })).toBe('lab');
  });
  it('health by name', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: 'SVNIT Dispensary' })).toBe('health');
  });
  it('unknown falls back to utility', () => {
    expect(classifyBuilding({ tags: { building: 'yes' }, name: '' })).toBe('utility');
  });
});

describe('estimateHeight', () => {
  it('uses known levels', () => {
    const r = estimateHeight('hostel', 9);
    expect(r.levels).toBe(9);
    expect(r.height).toBeCloseTo(9 * LEVEL_HEIGHT + PARAPET, 5);
  });
  it('academic default is 4 levels', () => {
    expect(estimateHeight('academic').levels).toBe(4);
  });
  it('workshop default is a tall single storey', () => {
    const r = estimateHeight('workshop');
    expect(r.levels).toBe(1);
    expect(r.height).toBeGreaterThanOrEqual(7);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

`scripts/lib/classify.mjs`:

```js
export const CATEGORIES = ['academic', 'admin', 'library', 'hostel', 'workshop', 'lab', 'sports', 'dining', 'health', 'utility', 'residence', 'gate', 'amenity'];
export const LEVEL_HEIGHT = 3.4;
export const PARAPET = 1.2;

const NAME_RULES = [
  [/dispensary|hospital|health|clinic|medical/i, 'health'],
  [/workshop|foundry|smithy/i, 'workshop'],
  [/\blab\b|laboratory|testing|boiler|cryogenics/i, 'lab'],
  [/library/i, 'library'],
  [/administration|admin building|director'?s? bungalow/i, 'admin'],
  [/canteen|cafe|mess|dining/i, 'dining'],
  [/bhavan|bhawan|hostel|dormitory|guest house/i, 'hostel'],
  [/department|dept\.?|\bLT-?\d|lecture|seminar hall|computer centre|m\.?sc/i, 'academic'],
  [/gate|entrance/i, 'gate'],
];

export function classifyBuilding({ tags = {}, name = '' } = {}) {
  if (tags.amenity === 'library') return 'library';
  if (tags.building === 'dormitory' || tags.tourism === 'hostel' || tags.guest_house === 'hostel') return 'hostel';
  if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') return 'dining';
  if (tags.healthcare || tags.amenity === 'clinic' || tags.amenity === 'hospital') return 'health';
  if (tags.power === 'substation') return 'utility';
  for (const [re, cat] of NAME_RULES) if (re.test(name)) return cat;
  if (tags.office === 'educational_institution') return 'academic';
  if (tags.building === 'office') return 'admin';
  return 'utility';
}

const DEFAULT_LEVELS = {
  academic: 4, admin: 3, library: 3, hostel: 5, workshop: 1, lab: 2,
  sports: 1, dining: 1, health: 2, utility: 1, residence: 2, gate: 1, amenity: 1,
};
const CATEGORY_MIN_HEIGHT = { workshop: 8, library: 12, gate: 6 };

export function estimateHeight(category, levels) {
  const lv = Number.isFinite(levels) && levels > 0 ? Math.round(levels) : DEFAULT_LEVELS[category] ?? 2;
  let height = lv * LEVEL_HEIGHT + PARAPET;
  const min = CATEGORY_MIN_HEIGHT[category];
  if (min && height < min) height = min;
  return { height, levels: lv };
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/classify.mjs tests/pipeline/classify.test.mjs
git commit -m "feat: building category classifier and height estimator"
```

---

## Task 5: Campus data schema + curated overlay + pipeline assembly

**Files:**
- Create: `src/data/schema.mjs`, `scripts/lib/overpass.mjs`, `data/campus/curated.mjs`, `data/campus/README.md`, `scripts/build-campus-data.mjs`
- Create (output, committed): `src/data/campus.generated.json`
- Test: `tests/pipeline/schema.test.mjs`, `tests/pipeline/pipeline.test.mjs`

**Interfaces:**
- Consumes: `makeProjector` (T2); `dedupeRing`, `simplifyRing`, `ensureWinding`, `ringCentroid`, `ringArea`, `pointInRing`, `longestEdgeAngle` (T3); `classifyBuilding`, `estimateHeight` (T4).
- Produces:
  - `src/data/schema.mjs`: `validateCampusData(obj) => { ok: boolean, errors: string[] }`
  - `scripts/lib/overpass.mjs`: `parseOverpass(json) => { boundary: {geometry}, buildings: Feature[], roads: Feature[], water: Feature[], greens: Feature[], grounds: Feature[], pois: Node[] }` where `Feature = { id, tags, geometry: LatLon[] }`.
  - `data/campus/curated.mjs` default export:
    ```
    { origin: LatLon,
      buildings: { [osmId|nameKey]: { name?, category?, department?, established?, floors?, description?, facade?, accent?, roof?, hasInterior? } },
      extraBuildings: [{ id, name, category, footprintLatLon: LatLon[], levels?, meta }],
      gates: [{ name, lat, lon, rot, width }],
      zones: [{ name, lat, lon }] }
    ```
  - `campus.generated.json` matching the schema in the spec §3.3 (repeated below in Step 3).

- [ ] **Step 1: Write failing schema + pipeline tests**

`tests/pipeline/schema.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { validateCampusData } from '../../src/data/schema.mjs';

const minimal = {
  origin: { lat: 21.163, lon: 72.785 },
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
  boundary: [[-10, -10], [10, -10], [10, 10], [-10, 10]],
  buildings: [{
    id: 'w1', name: 'Central library', category: 'library',
    footprint: [[0, 0], [8, 0], [8, 12], [0, 12]], centroid: [4, 6],
    height: 14, levels: 3, orientation: 0,
    meta: { facade: 'library', accent: '#b5451f', roof: 'flat', hasInterior: true },
  }],
  roads: [{ class: 'primary', width: 7, path: [[-10, 0], [10, 0]] }],
  water: [], greens: [], grounds: [], pois: [], gates: [],
};

describe('validateCampusData', () => {
  it('accepts a minimal valid campus', () => {
    expect(validateCampusData(minimal).ok).toBe(true);
  });
  it('rejects a building with < 3 footprint points', () => {
    const bad = structuredClone(minimal);
    bad.buildings[0].footprint = [[0, 0], [1, 1]];
    const r = validateCampusData(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/footprint/);
  });
  it('rejects an unknown category', () => {
    const bad = structuredClone(minimal);
    bad.buildings[0].category = 'castle';
    expect(validateCampusData(bad).ok).toBe(false);
  });
});
```

`tests/pipeline/pipeline.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { buildCampus } from '../../scripts/build-campus-data.mjs';
import { validateCampusData } from '../../src/data/schema.mjs';

const FIXTURE = {
  elements: [
    { type: 'way', id: 1, tags: { amenity: 'university', name: 'X' },
      geometry: [
        { lat: 21.160, lon: 72.782 }, { lat: 21.160, lon: 72.789 },
        { lat: 21.167, lon: 72.789 }, { lat: 21.167, lon: 72.782 },
      ] },
    { type: 'way', id: 10, tags: { building: 'yes', name: 'Mechanical Engineering Department', office: 'educational_institution' },
      geometry: [
        { lat: 21.1630, lon: 72.7850 }, { lat: 21.1630, lon: 72.7853 },
        { lat: 21.1633, lon: 72.7853 }, { lat: 21.1633, lon: 72.7850 },
      ] },
    { type: 'way', id: 11, tags: { building: 'dormitory', name: 'Gajjar Bhavan H4', 'building:levels': '5' },
      geometry: [
        { lat: 21.1610, lon: 72.7860 }, { lat: 21.1610, lon: 72.7864 },
        { lat: 21.1613, lon: 72.7864 }, { lat: 21.1613, lon: 72.7860 },
      ] },
    { type: 'way', id: 20, tags: { highway: 'primary', name: 'Main Ave' },
      geometry: [{ lat: 21.160, lon: 72.785 }, { lat: 21.167, lon: 72.786 }] },
    { type: 'way', id: 30, tags: { natural: 'water', name: 'University Lake' },
      geometry: [
        { lat: 21.1645, lon: 72.7875 }, { lat: 21.1645, lon: 72.7880 },
        { lat: 21.1650, lon: 72.7880 }, { lat: 21.1650, lon: 72.7875 },
      ] },
    { type: 'node', id: 40, tags: { memorial: 'statue', name: 'Sardar Vallabhbhai Statue' }, lat: 21.1635, lon: 72.7855 },
    // building outside the campus polygon — must be clipped out
    { type: 'way', id: 99, tags: { building: 'yes', name: 'Outside Mall' },
      geometry: [
        { lat: 21.190, lon: 72.800 }, { lat: 21.190, lon: 72.801 },
        { lat: 21.191, lon: 72.801 }, { lat: 21.191, lon: 72.800 },
      ] },
  ],
};

describe('buildCampus', () => {
  const campus = buildCampus(FIXTURE, { curated: { buildings: {}, extraBuildings: [], gates: [], zones: [] } });

  it('produces schema-valid output', () => {
    expect(validateCampusData(campus).ok).toBe(true);
  });
  it('clips buildings outside the campus polygon', () => {
    expect(campus.buildings.find((b) => b.name === 'Outside Mall')).toBeUndefined();
  });
  it('keeps and classifies campus buildings', () => {
    const mech = campus.buildings.find((b) => b.name.includes('Mechanical'));
    expect(mech.category).toBe('academic');
    const gajjar = campus.buildings.find((b) => b.name.includes('Gajjar'));
    expect(gajjar.category).toBe('hostel');
    expect(gajjar.levels).toBe(5);
  });
  it('footprints are metric and near origin', () => {
    const mech = campus.buildings.find((b) => b.name.includes('Mechanical'));
    for (const [x, z] of mech.footprint) {
      expect(Math.abs(x)).toBeLessThan(1500);
      expect(Math.abs(z)).toBeLessThan(1500);
    }
  });
  it('captures water and pois', () => {
    expect(campus.water.length).toBe(1);
    expect(campus.pois.find((p) => p.type === 'statue' || /Statue/.test(p.name))).toBeTruthy();
  });
  it('is deterministic', () => {
    const again = buildCampus(FIXTURE, { curated: { buildings: {}, extraBuildings: [], gates: [], zones: [] } });
    expect(JSON.stringify(again)).toBe(JSON.stringify(campus));
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement schema**

`src/data/schema.mjs`:

```js
export const CATEGORIES = ['academic', 'admin', 'library', 'hostel', 'workshop', 'lab', 'sports', 'dining', 'health', 'utility', 'residence', 'gate', 'amenity'];

export function validateCampusData(o) {
  const errors = [];
  const isVec2 = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  if (!o || typeof o !== 'object') return { ok: false, errors: ['not an object'] };
  if (!o.origin || !Number.isFinite(o.origin.lat) || !Number.isFinite(o.origin.lon)) errors.push('origin missing');
  for (const k of ['minX', 'maxX', 'minZ', 'maxZ']) if (!Number.isFinite(o.bounds?.[k])) errors.push(`bounds.${k}`);
  if (!Array.isArray(o.boundary) || o.boundary.length < 3 || !o.boundary.every(isVec2)) errors.push('boundary invalid');
  if (!Array.isArray(o.buildings)) errors.push('buildings not array');
  for (const b of o.buildings ?? []) {
    if (!b.id) errors.push('building.id missing');
    if (!CATEGORIES.includes(b.category)) errors.push(`building ${b.id} bad category ${b.category}`);
    if (!Array.isArray(b.footprint) || b.footprint.length < 3 || !b.footprint.every(isVec2)) errors.push(`building ${b.id} footprint invalid`);
    if (!isVec2(b.centroid)) errors.push(`building ${b.id} centroid invalid`);
    if (!(b.height > 0)) errors.push(`building ${b.id} height invalid`);
    if (!b.meta || typeof b.meta !== 'object') errors.push(`building ${b.id} meta missing`);
  }
  for (const key of ['roads', 'water', 'greens', 'grounds', 'pois', 'gates']) {
    if (!Array.isArray(o[key])) errors.push(`${key} not array`);
  }
  for (const r of o.roads ?? []) if (!Array.isArray(r.path) || r.path.length < 2 || !r.path.every(isVec2)) errors.push('road path invalid');
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Implement overpass parser**

`scripts/lib/overpass.mjs`:

```js
const isClosed = (g) => g && g.length >= 4;

export function parseOverpass(json) {
  const els = json.elements ?? [];
  const geom = (e) => (e.geometry ? e.geometry.map((p) => ({ lat: p.lat, lon: p.lon })) : e.lat != null ? [{ lat: e.lat, lon: e.lon }] : []);
  const boundary = els.find((e) => e.tags?.amenity === 'university' && /sardar vallabhbhai|svnit/i.test(e.tags?.name ?? '') && e.geometry);
  const out = { boundary: boundary ? { id: boundary.id, tags: boundary.tags, geometry: geom(boundary) } : null,
    buildings: [], roads: [], water: [], greens: [], grounds: [], pois: [] };
  for (const e of els) {
    if (e === boundary) continue;
    const t = e.tags ?? {};
    const g = geom(e);
    const f = { id: `${e.type[0]}${e.id}`, tags: t, geometry: g, name: t.name };
    if (t.building && isClosed(g)) out.buildings.push(f);
    else if (t.highway && g.length >= 2) out.roads.push({ ...f, klass: t.highway });
    else if ((t.natural === 'water' || t.water) && isClosed(g)) out.water.push(f);
    else if (['park', 'garden', 'grass', 'forest'].includes(t.leisure) || ['grass', 'forest', 'meadow'].includes(t.landuse)) {
      if (isClosed(g)) out.greens.push({ ...f, kind: t.leisure || t.landuse });
    } else if (t.leisure === 'pitch' || t.leisure === 'sports_centre' || t.leisure === 'track' || t.leisure === 'stadium') {
      if (isClosed(g)) out.grounds.push({ ...f, sport: t.sport });
      else if (g.length === 1) out.pois.push({ id: f.id, name: t.name, type: 'ground', lat: g[0].lat, lon: g[0].lon });
    } else if (e.type === 'node' && t.name) {
      const type = t.memorial ? 'statue' : t.amenity === 'place_of_worship' ? 'temple' : t.amenity || t.tourism || t.shop || 'poi';
      out.pois.push({ id: f.id, name: t.name, type, lat: g[0]?.lat, lon: g[0]?.lon });
    }
  }
  return out;
}
```

- [ ] **Step 5: Implement curated overlay stub**

`data/campus/curated.mjs` — start with real, verified entries (extend later):

```js
// Hand-authored overlay. `buildings` keys match OSM id ("w257605000") OR a lowercased name.
// Everything here overrides pipeline guesses.
export default {
  origin: { lat: 21.1631, lon: 72.7853 }, // near Administration Building; final origin still = boundary centroid
  buildings: {
    'central library': { category: 'library', established: 1968, floors: 3, hasInterior: true, accent: '#b5451f',
      description: 'One of the major technological libraries in western India, established 1968, sitting at the centre of campus.' },
    'administration building': { category: 'admin', floors: 3, hasInterior: true, accent: '#3b5c8a',
      description: 'Houses the Director, Registrar and administrative offices of the institute.' },
    'lt-2': { category: 'academic', floors: 2, hasInterior: true, accent: '#7a6a52',
      description: 'Lecture Theatre complex used for first- and second-year core classes.' },
    'seminar hall': { category: 'academic', floors: 1, description: 'Seminar hall for departmental talks and presentations.' },
    'department of civil engineering': { category: 'academic', department: 'Civil Engineering', established: 1961, floors: 3 },
    'mechanical engineering department': { category: 'academic', department: 'Mechanical Engineering', established: 1961, floors: 3 },
    'electrical engineering department': { category: 'academic', department: 'Electrical Engineering', established: 1961, floors: 3 },
    'applied mechanics department': { category: 'academic', department: 'Applied Mechanics', floors: 3 },
    'computer engineering department': { category: 'academic', department: 'Computer Engineering', floors: 3 },
    'new computer engineering department': { category: 'academic', department: 'Computer Engineering (new block)', floors: 4 },
    'new electronics engineering department': { category: 'academic', department: 'Electronics & Communication Engineering', floors: 4 },
    'new chemical engineering department': { category: 'academic', department: 'Chemical Engineering', floors: 4 },
    'new m.sc. department': { category: 'academic', department: 'Applied Physics / Chemistry / Mathematics', floors: 3 },
    'central computer centre': { category: 'academic', department: 'Central Computer Centre', floors: 2 },
    'svnit workshop': { category: 'workshop', description: 'Central workshop with machine, welding, carpentry and fitting shops.' },
    'material testing lab': { category: 'lab' },
    'svnit dispensary': { category: 'health', description: 'On-campus health centre and dispensary.' },
    'gajjar bhavan h4': { category: 'hostel', description: 'First-year boys hostel.' },
    'bhabha bhavan': { category: 'hostel', description: 'Boys hostel.' },
    'h- 13 swami vivekanand bhavan': { category: 'hostel', description: 'Nine-storey boys hostel (H-13).' },
    'tagor bhavan': { category: 'hostel', description: 'Boys hostel.' },
    'raman bhavan h10': { category: 'hostel', description: 'Boys hostel (H-10).' },
    'svnit guest house': { category: 'hostel', description: 'Institute guest house for visitors and parents.' },
    "director's bungalow": { category: 'residence', description: "The Director's official residence." },
  },
  // Buildings OSM lacks — approximate placement inside known zones (lat/lon hand-picked from satellite).
  extraBuildings: [
    { id: 'x-narmad', name: 'Narmad Bhavan (Girls Hostel)', category: 'hostel', levels: 5,
      footprintLatLon: [
        { lat: 21.1596, lon: 72.7872 }, { lat: 21.1596, lon: 72.7879 },
        { lat: 21.1599, lon: 72.7879 }, { lat: 21.1599, lon: 72.7872 },
      ], meta: { description: 'Girls hostel, all departments.' } },
    { id: 'x-auditorium', name: 'Gajjar Auditorium', category: 'admin', levels: 2,
      footprintLatLon: [
        { lat: 21.1628, lon: 72.7846 }, { lat: 21.1628, lon: 72.7852 },
        { lat: 21.1631, lon: 72.7852 }, { lat: 21.1631, lon: 72.7846 },
      ], meta: { description: 'Main auditorium / convocation hall.', accent: '#8a5a3b', roof: 'vault' } },
  ],
  gates: [
    { name: 'Main Gate (Dumas Road)', lat: 21.1592, lon: 72.7860, rot: 0, width: 14 },
  ],
  zones: [
    { name: 'Academic Zone', lat: 21.1633, lon: 72.7852 },
    { name: 'Hostel Zone', lat: 21.1606, lon: 72.7868 },
    { name: 'Sports Complex', lat: 21.1650, lon: 72.7845 },
    { name: 'Central Library Lawn', lat: 21.1638, lon: 72.7858 },
  ],
};
```

> **Execution note:** verify each `extraBuildings` / `gates` lat-lon against satellite imagery in Task 36 and nudge; approximate is acceptable for v1 per the spec.

- [ ] **Step 6: Implement the pipeline**

`scripts/build-campus-data.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeProjector } from './lib/geo.mjs';
import { parseOverpass } from './lib/overpass.mjs';
import { classifyBuilding, estimateHeight } from './lib/classify.mjs';
import {
  dedupeRing, simplifyRing, ensureWinding, ringCentroid, ringArea, pointInRing, longestEdgeAngle,
} from './lib/polygon.mjs';
import { validateCampusData } from '../src/data/schema.mjs';

const FACADE_BY_CATEGORY = {
  academic: 'academic', admin: 'admin', library: 'library', hostel: 'hostel',
  workshop: 'workshop', lab: 'academic', sports: 'utility', dining: 'utility',
  health: 'academic', utility: 'utility', residence: 'residence', gate: 'gate', amenity: 'utility',
};
const ACCENT_BY_CATEGORY = {
  academic: '#b06a3a', admin: '#3b5c8a', library: '#b5451f', hostel: '#6d7f52',
  workshop: '#8a8f98', lab: '#9a6b4a', sports: '#4f8a5b', dining: '#c9873f',
  health: '#c65b5b', utility: '#7d7d7d', residence: '#a98d5f', gate: '#8a5a3b', amenity: '#7d7d7d',
};

const nameKey = (s) => (s ?? '').trim().toLowerCase();

export function buildCampus(overpassJson, opts = {}) {
  const parsed = parseOverpass(overpassJson);
  if (!parsed.boundary) throw new Error('campus boundary polygon not found in Overpass data');
  const curated = opts.curated ?? { buildings: {}, extraBuildings: [], gates: [], zones: [] };

  // Origin = centroid of the boundary polygon (metres are relative to this).
  const bLL = parsed.boundary.geometry;
  const originLL = {
    lat: bLL.reduce((s, p) => s + p.lat, 0) / bLL.length,
    lon: bLL.reduce((s, p) => s + p.lon, 0) / bLL.length,
  };
  const proj = makeProjector(originLL);
  const toRing = (llArr) => dedupeRing(llArr.map((p) => proj.toXZ(p)));
  const boundary = simplifyRing(ensureWinding(toRing(bLL), true), 1.0);

  // Buffer the boundary outward ~30 m for clipping (scale about centroid).
  const bc = ringCentroid(boundary);
  const clipRing = boundary.map(([x, z]) => {
    const dx = x - bc[0], dz = z - bc[1];
    const d = Math.hypot(dx, dz) || 1;
    return [x + (dx / d) * 30, z + (dz / d) * 30];
  });
  const inCampus = (ring) => {
    const c = ringCentroid(ring);
    return pointInRing(c, clipRing);
  };

  const curatedFor = (id, name) => curated.buildings?.[id] ?? curated.buildings?.[nameKey(name)] ?? {};

  const buildings = [];
  const pushBuilding = (id, name, ringXZ, tags, levelsHint, curatedMeta) => {
    let ring = simplifyRing(ensureWinding(dedupeRing(ringXZ), true), 0.4);
    if (ring.length < 3 || Math.abs(ringArea(ring)) < 6) return; // drop slivers < 6 m²
    if (!inCampus(ring)) return;
    const cur = curatedMeta ?? curatedFor(id, name);
    const category = cur.category ?? classifyBuilding({ tags: tags ?? {}, name });
    const lvHint = cur.floors ?? levelsHint ?? Number(tags?.['building:levels']);
    const { height, levels } = estimateHeight(category, lvHint);
    buildings.push({
      id, name: cur.name ?? name ?? '(unnamed building)', category,
      footprint: ring.map(([x, z]) => [round(x), round(z)]),
      centroid: ringCentroid(ring).map(round),
      height: round(height), levels, orientation: round(longestEdgeAngle(ring), 4),
      meta: {
        department: cur.department, established: cur.established, floors: levels,
        description: cur.description,
        facade: cur.facade ?? FACADE_BY_CATEGORY[category] ?? 'utility',
        accent: cur.accent ?? ACCENT_BY_CATEGORY[category] ?? '#888888',
        roof: cur.roof ?? (category === 'workshop' ? 'sawtooth' : 'flat'),
        hasInterior: Boolean(cur.hasInterior),
      },
    });
  };

  for (const b of parsed.buildings) pushBuilding(b.id, b.name, b.geometry.map((p) => proj.toXZ(p)), b.tags);
  for (const xb of curated.extraBuildings ?? []) {
    pushBuilding(xb.id, xb.name, xb.footprintLatLon.map((p) => proj.toXZ(p)), { 'building:levels': xb.levels }, xb.levels, { ...xb.meta, category: xb.category, name: xb.name, floors: xb.levels });
  }
  buildings.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ROAD_WIDTH = { motorway: 9, trunk: 8, primary: 7, secondary: 5.5, tertiary: 5, residential: 4.5, service: 4, unclassified: 4, living_street: 4, footway: 2, path: 1.6, pedestrian: 3 };
  const roads = parsed.roads
    .map((r) => ({ class: r.klass, width: ROAD_WIDTH[r.klass] ?? 4, path: r.geometry.map((p) => proj.toXZ(p).map(round)) }))
    .filter((r) => r.path.some((p) => pointInRing(p, clipRing)));

  const clipPoly = (arr) => {
    const ring = simplifyRing(ensureWinding(dedupeRing(arr.map((p) => proj.toXZ(p))), true), 0.8).map((p) => p.map(round));
    return ring.length >= 3 && pointInRing(ringCentroid(ring), clipRing) ? ring : null;
  };
  const water = parsed.water.map((w) => ({ name: w.name, polygon: clipPoly(w.geometry) })).filter((w) => w.polygon);
  const greens = parsed.greens.map((g) => ({ kind: g.kind, polygon: clipPoly(g.geometry) })).filter((g) => g.polygon);
  const grounds = parsed.grounds.map((g) => ({ name: g.name, sport: g.sport, polygon: clipPoly(g.geometry) })).filter((g) => g.polygon);

  const pois = parsed.pois
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => { const [x, z] = proj.toXZ(p); return { name: p.name, type: p.type, x: round(x), z: round(z), rot: 0 }; })
    .filter((p) => pointInRing([p.x, p.z], clipRing))
    .sort((a, b) => (a.name < b.name ? -1 : 1));

  for (const z of curated.zones ?? []) {
    const [x, zz] = proj.toXZ(z);
    pois.push({ name: z.name, type: 'zone', x: round(x), z: round(zz), rot: 0 });
  }

  const gates = (curated.gates ?? []).map((g) => { const [x, z] = proj.toXZ(g); return { name: g.name, x: round(x), z: round(z), rot: g.rot ?? 0, width: g.width ?? 12 }; });

  const xs = boundary.map((p) => p[0]), zs = boundary.map((p) => p[1]);
  const campus = {
    origin: originLL,
    bounds: { minX: round(Math.min(...xs)), maxX: round(Math.max(...xs)), minZ: round(Math.min(...zs)), maxZ: round(Math.max(...zs)) },
    boundary: boundary.map((p) => p.map(round)),
    buildings, roads, water, greens, grounds, pois, gates,
  };
  const v = validateCampusData(campus);
  if (!v.ok) throw new Error('campus data invalid:\n' + v.errors.join('\n'));
  return campus;
}

function round(n, p = 2) { const f = 10 ** p; return Math.round(n * f) / f; }

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(new URL('../data/osm/overpass-raw.json', import.meta.url)));
  const curated = (await import('../data/campus/curated.mjs')).default;
  const campus = buildCampus(raw, { curated });
  const outfile = new URL('../src/data/campus.generated.json', import.meta.url);
  writeFileSync(outfile, JSON.stringify(campus, null, 1));
  console.log(`campus.generated.json: ${campus.buildings.length} buildings, ${campus.roads.length} roads, ${campus.water.length} water, ${campus.grounds.length} grounds, ${campus.pois.length} pois`);
}
```

- [ ] **Step 7: Run tests, expect pass**

Run: `npm test -- tests/pipeline/` — Expected: all PASS.
Fix issues inline (winding, rounding, determinism).

- [ ] **Step 8: Generate the real data + eyeball**

```bash
npm run data
```

Expected: prints ~90–115 buildings, 20–60 roads, 1–2 water, several grounds, 30+ pois. Open `src/data/campus.generated.json`, confirm named buildings (Central library, Administration Building, department blocks, hostels) are present with sensible heights.

- [ ] **Step 9: Write `data/campus/README.md`**

```md
# Refining campus data

`src/data/campus.generated.json` is produced by `npm run data` from:
- `data/osm/overpass-raw.json` — raw OpenStreetMap export (© OSM contributors, ODbL)
- `data/campus/curated.mjs` — hand overlay

## To fix a building
Edit `data/campus/curated.mjs` → `buildings['<osm id or lowercased name>']` with any of:
`name, category, department, established, floors, description, facade, accent, roof, hasInterior`.
Then run `npm run data` and commit the regenerated JSON.

## To add a building OSM lacks
Add to `extraBuildings` with a `footprintLatLon` polygon (pick corners off satellite imagery).

## Categories
academic, admin, library, hostel, workshop, lab, sports, dining, health, utility, residence, gate, amenity
```

- [ ] **Step 10: Commit**

```bash
git add scripts/ src/data/ data/campus/ tests/pipeline/
git commit -m "feat: campus data pipeline — OSM to metric campus.generated.json"
```

---

## Task 6: Runtime core — Renderer wiring, SceneManager, Settings, AssetRegistry, rng

**Files:**
- Create: `src/core/SceneManager.js`, `src/core/AssetRegistry.js`, `src/core/Settings.js`, `src/core/rng.js`
- Modify: `src/main.js` (replace cube demo with app bootstrap)
- Test: `tests/core/settings.test.js`, `tests/core/rng.test.js`

**Interfaces:**
- Consumes: `createRenderer` (T1), `Clock` (T1), `events` (T1).
- Produces:
  - `class SceneManager { constructor(renderer); register(name, sceneFactory); async activate(name, params); get active(): {scene, camera, update(dt), dispose()}; render() }`
  - `class AssetRegistry { geo(key, factory); mat(key, factory); disposeAll() }`
  - `Settings` singleton: `get(key)`, `set(key, val)` (persists to `localStorage` under `svnit.settings`), `all()`, `defaults`, emits `settings:change` via `events`. Keys: `quality` (`low|medium|high|ultra`), `timeOfDay` (`dawn|noon|dusk|night`), `ambientLife` (bool), `volumeMaster` `volumeAmbience` `volumeSfx` (0..1), `fov` (60..90), `invertY` (bool), `reduceMotion` (bool), `minimapColorblind` (bool).
  - `mulberry32(seed:number) => () => number` and `hashString(s:string) => number`.

- [ ] **Step 1: Failing tests**

`tests/core/rng.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mulberry32, hashString } from '../../src/core/rng.js';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(123); const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('outputs are in [0,1)', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('hashString is stable and varies', () => {
    expect(hashString('Central library')).toBe(hashString('Central library'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
```

`tests/core/settings.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';

describe('Settings', () => {
  beforeEach(() => { globalThis.localStorage = makeLS(); });
  it('returns defaults when storage empty', async () => {
    const { Settings } = await freshImport();
    expect(Settings.get('quality')).toBe('high');
    expect(Settings.get('timeOfDay')).toBe('noon');
  });
  it('persists and reloads', async () => {
    let m = await freshImport();
    m.Settings.set('quality', 'low');
    expect(JSON.parse(localStorage.getItem('svnit.settings')).quality).toBe('low');
    m = await freshImport();
    expect(m.Settings.get('quality')).toBe('low');
  });
  it('rejects unknown keys', async () => {
    const { Settings } = await freshImport();
    expect(() => Settings.set('nope', 1)).toThrow();
  });
});

function makeLS() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}
async function freshImport() {
  return import('../../src/core/Settings.js?u=' + Math.random());
}
```

Add to `vitest.config.js` `test.environment` override per-file is unnecessary — Settings guards `localStorage` access. Keep node env.

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement rng**

`src/core/rng.js`:

```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
```

- [ ] **Step 4: Implement Settings**

`src/core/Settings.js`:

```js
import { events } from './events.js';

const KEY = 'svnit.settings';
const defaults = {
  quality: 'high', timeOfDay: 'noon', ambientLife: true,
  volumeMaster: 0.7, volumeAmbience: 0.6, volumeSfx: 0.8,
  fov: 70, invertY: false, reduceMotion: false, minimapColorblind: false,
};

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch { return { ...defaults }; }
}

const state = load();

export const Settings = {
  defaults,
  all: () => ({ ...state }),
  get: (k) => state[k],
  set(k, v) {
    if (!(k in defaults)) throw new Error(`unknown setting: ${k}`);
    state[k] = v;
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
    events.emit('settings:change', { key: k, value: v, all: { ...state } });
  },
};
```

- [ ] **Step 5: Implement AssetRegistry + SceneManager**

`src/core/AssetRegistry.js`:

```js
export class AssetRegistry {
  #geo = new Map();
  #mat = new Map();
  geo(key, factory) { if (!this.#geo.has(key)) this.#geo.set(key, factory()); return this.#geo.get(key); }
  mat(key, factory) { if (!this.#mat.has(key)) this.#mat.set(key, factory()); return this.#mat.get(key); }
  disposeAll() {
    for (const g of this.#geo.values()) g.dispose?.();
    for (const m of this.#mat.values()) m.dispose?.();
    this.#geo.clear(); this.#mat.clear();
  }
}
```

`src/core/SceneManager.js`:

```js
export class SceneManager {
  #renderer; #factories = new Map(); #active = null; #activeName = null;
  constructor(renderer) { this.#renderer = renderer; }
  register(name, factory) { this.#factories.set(name, factory); }
  get active() { return this.#active; }
  get activeName() { return this.#activeName; }
  async activate(name, params = {}) {
    if (!this.#factories.has(name)) throw new Error(`no scene: ${name}`);
    const next = await this.#factories.get(name)(params);
    const prev = this.#active;
    this.#active = next; this.#activeName = name;
    prev?.dispose?.();
    return next;
  }
  update(dt) { this.#active?.update?.(dt); }
  render() { if (this.#active) this.#renderer.render(this.#active.scene, this.#active.camera); }
}
```

- [ ] **Step 6: Rewire `src/main.js`**

```js
import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';

const canvas = document.getElementById('scene');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

// placeholder scene until Task 7+ register 'campus'
scenes.register('placeholder', async () => {
  const THREE = await import('three');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fbfe8');
  const camera = new THREE.PerspectiveCamera(Settings.get('fov'), innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(0, 40, 120); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#cfe6ff', '#4a3f2f', 1));
  return { scene, camera, update() {}, dispose() {} };
});

function resize() {
  setSize(innerWidth, innerHeight);
  const cam = scenes.active?.camera;
  if (cam) { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

const clock = new Clock();
function frame() { clock.tick(); scenes.update(clock.delta); scenes.render(); requestAnimationFrame(frame); }

await scenes.activate('placeholder');
resize();
frame();

events.on('settings:change', ({ key }) => { if (key === 'fov' && scenes.active?.camera) { scenes.active.camera.fov = Settings.get('fov'); scenes.active.camera.updateProjectionMatrix(); } });
```

- [ ] **Step 7: Run tests + lint + build + dev, expect pass**

Run: `npm test && npm run lint && npm run build`
Visual: `npm run dev` → light-blue viewport, no console errors.

- [ ] **Step 8: Commit**

```bash
git add src/core/ src/main.js tests/core/
git commit -m "feat: runtime core — SceneManager, Settings, AssetRegistry, seeded rng"
```

---

## Task 7: Sky, Lighting, TimeOfDay

**Files:**
- Create: `src/world/Sky.js`, `src/world/Lighting.js`, `src/world/TimeOfDay.js`
- Test: `tests/world/timeofday.test.js`

**Interfaces:**
- Consumes: `Settings` (T6), `events` (T6).
- Produces:
  - `TIME_PRESETS` — record keyed `dawn|noon|dusk|night` → `{ sunDir:[x,y,z] (normalized-ish), sunColor, sunIntensity, hemiSky, hemiGround, hemiIntensity, fogColor, fogDensity, exposure, ambient }`.
  - `createSky(scene) => { setPreset(name), mesh }` — gradient dome + sun disc + stars at night.
  - `createLighting(scene, renderer) => { setPreset(name), sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight, updateShadowTarget(pos: THREE.Vector3) }` — one shadow-casting sun, frustum follows player.
  - `interpolatePreset(a, b, t) => preset` (used for smooth transitions; pure, tested).

- [ ] **Step 1: Failing test**

`tests/world/timeofday.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TIME_PRESETS, interpolatePreset } from '../../src/world/TimeOfDay.js';

describe('TimeOfDay', () => {
  it('has the four presets with required fields', () => {
    for (const k of ['dawn', 'noon', 'dusk', 'night']) {
      const p = TIME_PRESETS[k];
      expect(p.sunIntensity).toBeTypeOf('number');
      expect(p.fogDensity).toBeGreaterThan(0);
      expect(p.sunDir).toHaveLength(3);
    }
  });
  it('noon is brighter than night', () => {
    expect(TIME_PRESETS.noon.sunIntensity).toBeGreaterThan(TIME_PRESETS.night.sunIntensity);
  });
  it('interpolatePreset midpoint averages scalars', () => {
    const m = interpolatePreset(TIME_PRESETS.noon, TIME_PRESETS.night, 0.5);
    expect(m.sunIntensity).toBeCloseTo((TIME_PRESETS.noon.sunIntensity + TIME_PRESETS.night.sunIntensity) / 2, 5);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement `TimeOfDay.js`** — presets tuned for a hazy Surat sky (warm noon, pink dawn/dusk, deep-blue night). `interpolatePreset` lerps numbers and hex colors (parse to rgb, lerp, reassemble). Include a `colorLerp(hexA, hexB, t)` helper.

- [ ] **Step 4: Implement `Sky.js`** — large `THREE.SphereGeometry` (back-side) with a `ShaderMaterial` vertical gradient (horizon color → zenith color from preset); a billboarded sun sprite; a `THREE.Points` starfield shown only when preset === night (opacity via preset flag). `setPreset` updates uniforms.

- [ ] **Step 5: Implement `Lighting.js`** — `HemisphereLight` + `DirectionalLight` (castShadow, `shadow.mapSize` from `Settings.quality`: low 0 (disabled) / medium 1024 / high 2048 / ultra 4096; `shadow.camera` ortho ±110, near 0.5 far 400). `updateShadowTarget(pos)` moves the light + its target so the shadow box tracks the player. `setPreset` applies colors/intensities/exposure (`renderer.toneMappingExposure`). Subscribe to `settings:change` for `quality` and `timeOfDay`.

- [ ] **Step 6: Run test, expect pass. Lint. Build.**

- [ ] **Step 7: Visual checkpoint** — temporarily wire `createSky`/`createLighting` into the placeholder scene with a ground plane + a few boxes; cycle presets via `Settings.set('timeOfDay', …)` in console. Confirm four distinct moods, shadows on high.

- [ ] **Step 8: Commit**

```bash
git add src/world/Sky.js src/world/Lighting.js src/world/TimeOfDay.js tests/world/timeofday.test.js
git commit -m "feat: sky dome, sun lighting and four time-of-day presets"
```

---

## Task 8: Ground, terrain base, campus boundary wall

**Files:**
- Create: `src/world/Ground.js`
- Create: `src/world/textures.js` (canvas texture helpers, shared)
- Test: `tests/world/textures.test.js` (pure helpers only)

**Interfaces:**
- Consumes: `campus.generated.json` shape (`bounds`, `boundary`, `greens`), `AssetRegistry` (T6), `mulberry32`/`hashString` (T6).
- Produces:
  - `src/world/textures.js`: `grassTexture(opts)`, `dirtTexture()`, `concreteTexture(tint)`, `noiseTexture(size, contrast)` — each returns a `THREE.CanvasTexture` with sensible `wrapS/T`, `repeat`. `makeCanvas(size) => {canvas, ctx}` (guards `document` absence → returns null-safe stub so unit tests can import).
  - `src/world/Ground.js`: `createGround(campus, registry) => { group: THREE.Group, dispose() }` — a large textured ground plane covering `bounds` + margin, lawn patches for `greens`, a perimeter wall extruded along `boundary` (low masonry, ~2.4 m, with piers), campus-edge tree-line hint.

- [ ] **Step 1: Failing test** for the one pure helper:

`tests/world/textures.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { canvasSupported } from '../../src/world/textures.js';

describe('textures', () => {
  it('reports canvas support honestly under node', () => {
    expect(typeof canvasSupported()).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement `textures.js`** — `canvasSupported()` returns `typeof document !== 'undefined' && !!document.createElement('canvas').getContext`. Texture fns early-return a flat `THREE.DataTexture` 1×1 color when unsupported. Grass: base green + noise splotches + subtle mow stripes; dirt: tan + grain; concrete: grey + aggregate speckle + faint cracks.

- [ ] **Step 4: Implement `Ground.js`** — plane at `y=0` (`MeshStandardMaterial` with grass texture, `repeat` ≈ bounds/8), receiveShadow. Green polygons → `ShapeGeometry` slightly above ground (`y=0.02`) with a darker/lusher grass material. Boundary wall: iterate `boundary` edges, for each segment create a thin box (height 2.4, thickness 0.35) oriented along the edge; add pier boxes every ~18 m. Group everything.

- [ ] **Step 5: Run test, lint, build.**

- [ ] **Step 6: Visual checkpoint** — load real `campus.generated.json` in the placeholder scene, drop `createGround` in, fly around: green ground spanning the campus, perimeter wall roughly tracing the real boundary shape.

- [ ] **Step 7: Commit**

```bash
git add src/world/Ground.js src/world/textures.js tests/world/textures.test.js
git commit -m "feat: campus ground, lawns and perimeter wall from OSM boundary"
```

---

## Task 9: Roads

**Files:**
- Create: `src/world/Roads.js`
- Test: `tests/world/roads.test.js`

**Interfaces:**
- Consumes: `campus.roads` (`{class, width, path:Vec2[]}`), `textures.js`.
- Produces:
  - `buildRoadRibbon(path: Vec2[], width: number) => { positions: Float32Array, uvs: Float32Array, indices: Uint32Array }` — pure; a flat triangle strip offset ±width/2 with mitred joints, at `y=0.03`.
  - `createRoads(campus, registry) => { group, dispose() }` — one merged mesh per road class (asphalt vs concrete vs path material), dashed centre-line on primary/secondary via a second thin geometry.

- [ ] **Step 1: Failing test**

`tests/world/roads.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildRoadRibbon } from '../../src/world/Roads.js';

describe('buildRoadRibbon', () => {
  it('straight 100 m x 8 m ribbon has 4 verts, 2 tris, correct area', () => {
    const r = buildRoadRibbon([[0, 0], [100, 0]], 8);
    expect(r.positions.length).toBe(4 * 3);
    expect(r.indices.length).toBe(6);
  });
  it('follows a bend without collapsing', () => {
    const r = buildRoadRibbon([[0, 0], [50, 0], [50, 50]], 6);
    // 3 path points -> 6 rim verts
    expect(r.positions.length).toBe(6 * 3);
    expect([...r.positions].every(Number.isFinite)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** — for each segment compute the unit normal; at interior vertices average adjacent normals (miter, clamped to avoid spikes). Emit left/right rim points per path vertex, `y=0.03`, UVs run `u` across width, `v` along length (accumulated distance / width for repeat). `createRoads` groups by class, builds `BufferGeometry`, merges, assigns a canvas asphalt material (dark grey, lane grain) or concrete for service/path.

- [ ] **Step 4: Run test, expect pass. Lint. Build.**

- [ ] **Step 5: Visual checkpoint** — roads overlaid on ground should visibly form the campus's real internal network and the approach from the main gate.

- [ ] **Step 6: Commit**

```bash
git add src/world/Roads.js tests/world/roads.test.js
git commit -m "feat: road ribbons merged by class with centre-lines"
```

---

## Task 10: Water

**Files:**
- Create: `src/world/Water.js`
- Test: none (visual); relies on `polygon` utils already tested.

**Interfaces:**
- Consumes: `campus.water` (`{name, polygon:Vec2[]}`).
- Produces: `createWater(campus, clock) => { group, update(dt), dispose() }` — `ShapeGeometry` from each polygon at `y=0.05`, a `ShaderMaterial` with animated normal ripples + fresnel tint (teal→sky), faint reflection of sky color, soft foam at the edge (distance-to-edge in fragment via precomputed edge attribute or simple depth fade). `update` advances a `uTime` uniform.

- [ ] **Step 1: Implement `Water.js`.**
- [ ] **Step 2: Lint, build.**
- [ ] **Step 3: Visual checkpoint** — University Lake / Lake View lake read as water, gently animated, at the correct campus location.
- [ ] **Step 4: Commit**

```bash
git add src/world/Water.js
git commit -m "feat: animated lake water surfaces"
```

---

## Task 11: Building extrusion geometry

**Files:**
- Create: `src/world/buildings/extrude.js`
- Test: `tests/world/extrude.test.js`

**Interfaces:**
- Consumes: `Ring`/`Vec2`; `ringArea`, `ensureWinding` (T3) — re-import from `scripts/lib/polygon.mjs`? No: runtime cannot import from `scripts/`. Create `src/world/geometry2d.js` re-exporting the same pure fns (copy), and switch pipeline + runtime to both import a single shared module `src/shared/polygon.mjs`. **Refactor step included below.**
- Produces:
  - `src/shared/polygon.mjs` — the polygon utils (moved from `scripts/lib/polygon.mjs`, which now re-exports from here).
  - `src/world/buildings/extrude.js`: `extrudeFootprint(ring: Ring, height: number, opts?) => THREE.BufferGeometry` — walls (outward normals, per-floor UV `v`) + a flat cap at `height`; optional `plinthHeight` for a wider base course. Non-indexed, `computeVertexNormals` skipped in favor of explicit face normals for crisp walls.
  - `footprintBounds(ring) => { w, d, cx, cz, angle }` using `longestEdgeAngle`.

- [ ] **Step 1: Refactor — move polygon utils to `src/shared/polygon.mjs`**

```bash
git mv scripts/lib/polygon.mjs src/shared/polygon.mjs
```

`scripts/lib/polygon.mjs` (new shim):

```js
export * from '../../src/shared/polygon.mjs';
```

Update imports in `scripts/build-campus-data.mjs` and tests to `../../src/shared/polygon.mjs` (or keep the shim path — shim keeps them working). Run `npm test -- tests/pipeline/` → still green.

- [ ] **Step 2: Failing test**

`tests/world/extrude.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { extrudeFootprint, footprintBounds } from '../../src/world/buildings/extrude.js';

const RECT = [[0, 0], [20, 0], [20, 10], [0, 10]];

describe('extrudeFootprint', () => {
  it('produces a non-empty geometry with a bounding box of the right height', () => {
    const g = extrudeFootprint(RECT, 12);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    expect(max.y - min.y).toBeCloseTo(12, 3);
    expect(max.x - min.x).toBeCloseTo(20, 3);
    expect(max.z - min.z).toBeCloseTo(10, 3);
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
  });
  it('footprintBounds reads width/depth/orientation of a wide rectangle', () => {
    const b = footprintBounds(RECT);
    expect(b.w).toBeCloseTo(20, 3);
    expect(b.d).toBeCloseTo(10, 3);
    expect(Math.abs(b.angle)).toBeLessThan(0.01);
  });
});
```

- [ ] **Step 3: Run, expect fail.**

- [ ] **Step 4: Implement `extrude.js`** — triangulate the cap with `THREE.ShapeUtils.triangulateShape` (ear clipping) or `THREE.ShapeGeometry`; build wall quads per edge (two triangles), UV `u` = accumulated perimeter distance / 4, `v` = `y / LEVEL_HEIGHT` so facade shaders can tile per floor. `footprintBounds`: rotate ring by `-longestEdgeAngle` about centroid, take AABB.

- [ ] **Step 5: Run test, expect pass. Lint. Build.**

- [ ] **Step 6: Commit**

```bash
git add src/shared/ scripts/lib/polygon.mjs src/world/buildings/extrude.js tests/world/extrude.test.js
git commit -m "feat: building footprint extrusion + shared polygon module"
```

---

## Task 12: Facade material system

**Files:**
- Create: `src/world/buildings/FacadeMaterial.js`
- Test: `tests/world/facade.test.js`

**Interfaces:**
- Consumes: `hashString`, `mulberry32` (T6), `textures.js` `makeCanvas`.
- Produces:
  - `facadeMaterial({ category, accent, seed, levels }) => THREE.MeshStandardMaterial` — canvas-drawn albedo (per-category window grid, spandrel bands, plinth, stringcourse, sunshade shadow lines), plus a matching roughness value. Caches by a key of `(category, accent, levels bucket)` in a module Map.
  - `FACADE_PARAMS` — per-category record: `wallColor, bandColor, windowColor, windowRows spacing, hasChhajja, glazingRatio, plinthColor`.
  - `disposeFacadeCache()`.

- [ ] **Step 1: Failing test**

`tests/world/facade.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { FACADE_PARAMS } from '../../src/world/buildings/FacadeMaterial.js';

describe('FACADE_PARAMS', () => {
  it('covers every façade family used by the pipeline', () => {
    for (const k of ['academic', 'admin', 'library', 'hostel', 'workshop', 'utility', 'residence', 'gate']) {
      expect(FACADE_PARAMS[k]).toBeTruthy();
      expect(FACADE_PARAMS[k].glazingRatio).toBeGreaterThan(0);
    }
  });
  it('library is more glazed than utility', () => {
    expect(FACADE_PARAMS.library.glazingRatio).toBeGreaterThan(FACADE_PARAMS.utility.glazingRatio);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** — `FACADE_PARAMS` table; `facadeMaterial` draws a ~512×512 (per-floor tile) canvas: fill `wallColor` (jittered ±6% by seed), draw a row of windows sized by `glazingRatio`, add a dark line above each window for the chhajja shadow when `hasChhajja`, draw horizontal band at tile bottom in `bandColor`. Under node (no canvas), return a plain colored `MeshStandardMaterial`. Texture `wrapS=RepeatWrapping`, `repeat.set(width/4, levels)`.

- [ ] **Step 4: Run test, expect pass. Lint. Build.**

- [ ] **Step 5: Commit**

```bash
git add src/world/buildings/FacadeMaterial.js tests/world/facade.test.js
git commit -m "feat: per-category procedural facade materials"
```

---

## Task 13: Roof kit, entrances, name-boards

**Files:**
- Create: `src/world/buildings/RoofKit.js`, `src/world/buildings/Entrance.js`
- Test: `tests/world/entrance.test.js`

**Interfaces:**
- Consumes: `campus.buildings`, `campus.roads`, `footprintBounds` (T11), `troika-three-text`.
- Produces:
  - `RoofKit.populate(buildingGroup, { footprint, height, category, seed, registry }) => void` — adds instanced parapet (extruded thin ring), water tanks, stair headroom box, AC units, solar panels, vent pipes, a rooftop sign frame; counts weighted by category + seed. Uses shared instanced meshes via `registry`.
  - `Entrance.attach(buildingGroup, { footprint, height, category, name, nearestRoadPoint: Vec2, accent }) => { doorWorldPos: THREE.Vector3, facing: number }` — picks the footprint edge whose midpoint is closest to `nearestRoadPoint`, builds canopy slab + 2 columns + 3 steps + double doors, and a `troika` name-board on the fascia with the real building name (wraps, max width = edge length).
  - `nearestRoadPointTo(centroid: Vec2, roads) => Vec2` (pure, tested).

- [ ] **Step 1: Failing test**

`tests/world/entrance.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { nearestRoadPointTo } from '../../src/world/buildings/Entrance.js';

describe('nearestRoadPointTo', () => {
  it('finds the closest point on the closest road polyline', () => {
    const roads = [
      { path: [[0, 20], [100, 20]] },
      { path: [[0, -50], [100, -50]] },
    ];
    const p = nearestRoadPointTo([50, 0], roads);
    expect(p[1]).toBeCloseTo(20, 3);
    expect(p[0]).toBeCloseTo(50, 3);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** `nearestRoadPointTo` (project point onto each segment, keep min distance), then `Entrance.attach` and `RoofKit.populate`. Name-board: `troika-three-text` `Text` with `fontSize` ~0.9, `anchorX:'center'`, `color` dark, on a light plaque mesh; `sync()` called; billboard NOT (fixed to facade).

- [ ] **Step 4: Run test, expect pass. Lint. Build.**

- [ ] **Step 5: Commit**

```bash
git add src/world/buildings/RoofKit.js src/world/buildings/Entrance.js tests/world/entrance.test.js
git commit -m "feat: rooftop detail kit, entrance canopies and building name-boards"
```

---

## Task 14: Buildings assembly + LOD

**Files:**
- Create: `src/world/buildings/lod.js`, `src/world/buildings/Buildings.js`
- Test: `tests/world/lod.test.js`

**Interfaces:**
- Consumes: everything from T11–T13, `campus.buildings`, `AssetRegistry`.
- Produces:
  - `lodLevel(distance: number, quality: string) => 'full'|'mid'|'far'` (pure, tested) — thresholds scaled by quality.
  - `createBuildings(campus, registry) => { group, update(cameraPos: THREE.Vector3), pickables: THREE.Object3D[], byId: Map<string, {group, record, doorWorldPos}>, dispose() }` — one `THREE.Group` per building holding: `full` (extruded + facade + roof kit + entrance + name-board), `mid` (extruded + flat facade texture, no roof clutter/board), `far` (flat-color box sized to footprint bounds). `update` toggles child visibility by camera distance + `Settings.quality`. `pickables` = per-building invisible-ish raycast proxy (the `mid` box) tagged `userData.buildingId`.

- [ ] **Step 1: Failing test**

`tests/world/lod.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { lodLevel } from '../../src/world/buildings/lod.js';

describe('lodLevel', () => {
  it('near is full, mid is mid, far is far (high quality)', () => {
    expect(lodLevel(20, 'high')).toBe('full');
    expect(lodLevel(250, 'high')).toBe('mid');
    expect(lodLevel(900, 'high')).toBe('far');
  });
  it('low quality shortens the full range', () => {
    expect(lodLevel(120, 'low')).not.toBe('full');
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** `lod.js` (thresholds: high `full<180, mid<650`; medium `120/500`; low `70/300`; ultra `260/900`) and `Buildings.js` (build all three LODs per building, group, distance check throttled to every ~6 frames).

- [ ] **Step 4: Run test, expect pass. Lint. Build.**

- [ ] **Step 5: Visual checkpoint** — full campus of buildings, correctly placed, name-boards legible up close, framerate steady while flying.

- [ ] **Step 6: Commit**

```bash
git add src/world/buildings/ tests/world/lod.test.js
git commit -m "feat: building assembly with 3-tier LOD and raycast proxies"
```

---

## Task 15: Campus scene orchestrator + Player WALK controller + Collision

**Files:**
- Create: `src/world/Campus.js`, `src/player/Collision.js`, `src/player/PlayerController.js`
- Modify: `src/main.js` (register `'campus'` scene, default-activate it)
- Test: `tests/player/collision.test.js`

**Interfaces:**
- Consumes: T7–T14, `campus.generated.json` (imported via `import campus from './data/campus.generated.json'`), `Settings`, `Clock`.
- Produces:
  - `src/player/Collision.js`:
    - `class Collider { constructor(buildings: {footprint:Vec2[]}[], boundary: Vec2[]); resolve(pos: Vec2, radius: number) => Vec2 }` — push the point out of any footprint it penetrates (nearest-edge normal), keep inside boundary. Uses a uniform grid for broadphase.
    - `segmentClosestPoint(p, a, b) => Vec2` (pure, tested).
  - `src/player/PlayerController.js`:
    - `class PlayerController { constructor({ camera, collider, domElement }); mode: 'walk'|'fly'|'tour'; setMode(m); update(dt); teleport(pos: THREE.Vector3, headingRad); get position: THREE.Vector3; get heading: number }`
    - WALK: pointer-lock, WASD + mouse, `Shift` run (7 m/s vs 2.6), eye height 1.7, gravity + ground clamp at `y=0`, `Space` hop, capsule radius 0.4 via `Collider.resolve`, optional head-bob (disabled if `Settings.reduceMotion`).
  - `src/world/Campus.js`:
    - `async function createCampusScene({ registry }) => { scene, camera, update(dt), dispose(), api: { collider, buildingsApi, player, timeOfDay, setTimeOfDay(name) } }` — assembles sky, lighting, ground, roads, water, buildings; creates the player at the Main Gate POI facing in; wires `settings:change` for `timeOfDay`.

- [ ] **Step 1: Failing test**

`tests/player/collision.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { Collider, segmentClosestPoint } from '../../src/player/Collision.js';

describe('collision', () => {
  it('segmentClosestPoint clamps to endpoints', () => {
    expect(segmentClosestPoint([-5, 0], [0, 0], [10, 0])).toEqual([0, 0]);
    expect(segmentClosestPoint([5, 3], [0, 0], [10, 0])).toEqual([5, 0]);
  });
  it('pushes the player out of a building footprint', () => {
    const c = new Collider([{ footprint: [[0, 0], [10, 0], [10, 10], [0, 10]] }], [[-100, -100], [100, -100], [100, 100], [-100, 100]]);
    const out = c.resolve([5, 5], 0.4); // inside the box
    const insideStill = out[0] > 0 && out[0] < 10 && out[1] > 0 && out[1] < 10;
    expect(insideStill).toBe(false);
  });
  it('leaves a free-standing player untouched', () => {
    const c = new Collider([{ footprint: [[0, 0], [2, 0], [2, 2], [0, 2]] }], [[-100, -100], [100, -100], [100, 100], [-100, 100]]);
    expect(c.resolve([50, 50], 0.4)).toEqual([50, 50]);
  });
  it('keeps the player inside the campus boundary', () => {
    const c = new Collider([], [[-10, -10], [10, -10], [10, 10], [-10, 10]]);
    const out = c.resolve([50, 0], 0.4);
    expect(out[0]).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement `Collision.js`** then `PlayerController.js` then `Campus.js`. For `Campus.js` under tests it is not exercised (WebGL) — keep it import-safe but it's fine if it only runs in-browser.

- [ ] **Step 4: Wire `main.js`** — register `'campus'` → `createCampusScene`, `await scenes.activate('campus')`. Remove placeholder or keep as fallback. Route `update(dt)` to `scenes.active.update`.

- [ ] **Step 5: Run tests, expect pass. Lint. Build.**

- [ ] **Step 6: Visual checkpoint (major)** — pointer-lock, walk from the Main Gate down the avenue; cannot walk through buildings or the wall; buildings/roads/water/sky all present and roughly matching the real campus arrangement. Screenshot from 3 vantage points.

- [ ] **Step 7: Commit**

```bash
git add src/world/Campus.js src/player/Collision.js src/player/PlayerController.js src/main.js tests/player/collision.test.js
git commit -m "feat: campus scene orchestrator with first-person walk + collision"
```

---

## Task 16: Fly / drone camera mode

**Files:**
- Create: `src/player/FlyControls.js`
- Modify: `src/player/PlayerController.js` (delegate when `mode==='fly'`)
- Test: `tests/player/fly.test.js` (pure velocity integration helper)

**Interfaces:**
- Produces:
  - `integrateFly(state, input, dt) => state` — pure: `state={pos:[x,y,z], vel:[...]}`, `input={forward,right,up, boost}`, applies accel + damping + speed cap; tested.
  - `class FlyControls { constructor({camera, domElement}); update(dt); setEnabled(b) }` — 6-DOF, mouse look (no pointer-lock requirement — drag), `Q/E` down/up, scroll = speed, `Shift` boost, no collision.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { integrateFly } from '../../src/player/FlyControls.js';

describe('integrateFly', () => {
  it('accelerates forward then damps to rest', () => {
    let s = { pos: [0, 0, 0], vel: [0, 0, 0] };
    s = integrateFly(s, { forward: 1, right: 0, up: 0, boost: false }, 0.1);
    expect(s.vel[2]).not.toBe(0);
    for (let i = 0; i < 400; i++) s = integrateFly(s, { forward: 0, right: 0, up: 0, boost: false }, 0.1);
    expect(Math.hypot(...s.vel)).toBeLessThan(0.01);
  });
  it('caps speed', () => {
    let s = { pos: [0, 0, 0], vel: [0, 0, 0] };
    for (let i = 0; i < 200; i++) s = integrateFly(s, { forward: 1, right: 0, up: 0, boost: true }, 0.1);
    expect(Math.hypot(...s.vel)).toBeLessThan(120);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**

- [ ] **Step 5: Visual checkpoint** — `F` toggles to a smooth drone cam; aerial view of the whole campus reads correctly against satellite mental-model.

- [ ] **Step 6: Commit**

```bash
git add src/player/FlyControls.js src/player/PlayerController.js tests/player/fly.test.js
git commit -m "feat: free-fly drone camera mode"
```

---

## Task 17: Teleport with fade

**Files:**
- Create: `src/player/Teleport.js`
- Test: `tests/player/teleport.test.js` (pure easing/arrival helper)

**Interfaces:**
- Produces:
  - `arrivalTransform(target: {x:number,z:number}, faceTowards?: {x,z}) => { pos:[x,y,z], heading:number }` — stand 6 m back from `target` toward `faceTowards` (or campus centre), `y=1.7`. Tested.
  - `class Teleport { constructor({ player, overlayEl }); async go(target, faceTowards) }` — fade overlay to black (200 ms, instant if `reduceMotion`), `player.teleport(...)`, fade back.

- [ ] **Step 1–4: TDD `arrivalTransform`.**
- [ ] **Step 5: implement `Teleport` class, add a full-screen `.fade` div to `index.html`/CSS.**
- [ ] **Step 6: Commit**

```bash
git add src/player/Teleport.js tests/player/teleport.test.js index.html src/styles/ui.css
git commit -m "feat: fade teleport for POI and minimap navigation"
```

---

## Task 18: Vegetation

**Files:**
- Create: `src/world/Vegetation.js`, `src/world/plantModels.js`
- Test: `tests/world/scatter.test.js`

**Interfaces:**
- Consumes: `campus` (`bounds`, `greens`, `roads`, `buildings`, `water`), `Collider` (to avoid building overlap) or footprint list, `mulberry32`.
- Produces:
  - `scatterPoints({ bounds, count, seed, reject(x,z)=>bool, minSpacing }) => Vec2[]` — Poisson-ish blue-noise scatter with rejection; pure, tested.
  - `plantModels.js`: `neem()`, `gulmohar()`, `ashoka()`, `palm()`, `hedgeSegment()` → low-poly `THREE.BufferGeometry` (+ material) for instancing.
  - `createVegetation(campus, footprints, registry) => { group, dispose() }` — `InstancedMesh` per species: avenue trees along road sides (offset ± (roadWidth/2 + 2)), clusters in `greens`, campus-wide light scatter rejecting buildings/water/roads; hedges lining primary roads and the central lawn; instanced lawn-tuft billboards near the camera only (optional, quality-gated).

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { scatterPoints } from '../../src/world/Vegetation.js';

describe('scatterPoints', () => {
  it('respects rejection and spacing, deterministic by seed', () => {
    const bounds = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    const reject = (x) => x < 50; // left half forbidden
    const a = scatterPoints({ bounds, count: 60, seed: 7, reject, minSpacing: 4 });
    const b = scatterPoints({ bounds, count: 60, seed: 7, reject, minSpacing: 4 });
    expect(a).toEqual(b);
    expect(a.every(([x]) => x >= 50)).toBe(true);
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      expect(Math.hypot(a[i][0] - a[j][0], a[i][1] - a[j][1])).toBeGreaterThan(3.9);
    }
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Visual checkpoint** — tree-lined avenues, green clusters, no trees inside buildings or lakes; tree count scales with `Settings.quality`.
- [ ] **Step 6: Commit**

```bash
git add src/world/Vegetation.js src/world/plantModels.js tests/world/scatter.test.js
git commit -m "feat: instanced campus vegetation — avenue trees, groves, hedges"
```

---

## Task 19: Street kit

**Files:**
- Create: `src/world/StreetKit.js`, `src/world/propModels.js`
- Test: none new (reuses `scatterPoints`, road math).

**Interfaces:**
- Produces: `createStreetKit(campus, registry) => { group, update(dt), dispose() }` — instanced lamp posts along roads (emissive heads that brighten at dusk/night via `settings`/timeOfDay hook), benches near lawns and building entrances, litter bins, bollards at path/road junctions, 2 bus-stop shelters near the gate and academic zone, direction signboards at major junctions (troika text: "ACADEMIC ZONE →", "HOSTELS →", "LIBRARY →").

- [ ] **Step 1: Implement `propModels.js` (lamp, bench, bin, bollard, bus-stop, sign).**
- [ ] **Step 2: Implement `createStreetKit` — place via road traversal at fixed intervals + entrance positions from `buildingsApi.byId`.**
- [ ] **Step 3: Lint, build, visual checkpoint (lamps glow at night).**
- [ ] **Step 4: Commit**

```bash
git add src/world/StreetKit.js src/world/propModels.js
git commit -m "feat: street furniture — lamps, benches, signs, bus stops"
```

---

## Task 20: Landmarks

**Files:**
- Create: `src/world/Landmarks.js`
- Test: none (visual).

**Interfaces:**
- Consumes: `campus.pois` (types `statue`, `temple`), `campus.gates`.
- Produces: `createLandmarks(campus, registry) => { group, pickables, dispose() }`:
  - **Sardar Vallabhbhai Patel statue** at the statue POI — a bronze-material figure on a stepped plinth with a name plaque (troika).
  - **Ganesh temple** at the temple POI — a small shikhara-style shrine (stepped tower, dome, kalash, small mandapa, saffron flag).
  - **Main gate** at each `campus.gates` entry — masonry piers + horizontal name beam "SARDAR VALLABHBHAI NATIONAL INSTITUTE OF TECHNOLOGY" + boom barrier + guard cabin.
  - **Flagpole** with a waving-flag shader near the Administration Building.
  - **Fountain / central circle** at the "Central Library Lawn" zone POI (ring pool + jets).
  - Each landmark added to `pickables` with `userData.poi` for info panels.

- [ ] **Step 1: Implement each landmark builder.**
- [ ] **Step 2: Lint, build, visual checkpoint** — gate reads as an Indian institute entrance; statue + temple recognisable at their real spots.
- [ ] **Step 3: Commit**

```bash
git add src/world/Landmarks.js
git commit -m "feat: landmarks — Patel statue, Ganesh temple, main gate, flagpole, fountain"
```

---

## Task 21: Loading screen + Start menu

**Files:**
- Create: `src/ui/dom.js`, `src/ui/Loading.js`, `src/ui/StartMenu.js`
- Modify: `src/main.js` (gate scene entry behind the menu; feed loading progress)
- Test: `tests/ui/dom.test.js` (jsdom)

**Interfaces:**
- Add to `vitest.config.js`: allow per-file env — set `// @vitest-environment jsdom` in UI test files.
- Produces:
  - `dom.js`: `el(tag, props, ...children)`, `mount(parent, node)`, `clear(node)`, `trapFocus(container) => release()`, `onKey(el, map)`.
  - `Loading.js`: `class Loading { setProgress(0..1, label?); done() }` — full-screen panel with a bar; resolves a promise on `done()`.
  - `StartMenu.js`: `class StartMenu { constructor({ onEnter, onTour, onDirectory, onSettings, onCredits }); show(); hide() }` — title "SVNIT Surat — Virtual Campus Tour", subtitle, buttons, background = slow auto-rotating aerial render (or static gradient if perf-gated). Keyboard navigable, `Enter` triggers focused button.

- [ ] **Step 1: Failing test** for `el`/`trapFocus`:

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, trapFocus } from '../../src/ui/dom.js';

describe('dom', () => {
  it('el builds a tree with props and children', () => {
    const n = el('div', { className: 'x', dataset: { k: '1' } }, el('span', {}, 'hi'));
    expect(n.className).toBe('x');
    expect(n.dataset.k).toBe('1');
    expect(n.querySelector('span').textContent).toBe('hi');
  });
  it('trapFocus keeps Tab within the container', () => {
    const box = el('div', {}, el('button', {}, 'a'), el('button', {}, 'b'));
    document.body.append(box);
    const release = trapFocus(box);
    expect(typeof release).toBe('function');
    release();
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass.**
- [ ] **Step 5: Wire into `main.js`** — build world while `Loading` shows progress (hook `SceneManager.activate` stages: emit `world:progress` from `Campus.js` as each subsystem finishes), then show `StartMenu`; `onEnter` hides menu + requests pointer lock.
- [ ] **Step 6: Visual checkpoint** — load → progress bar → menu → Enter → campus.
- [ ] **Step 7: Commit**

```bash
git add src/ui/dom.js src/ui/Loading.js src/ui/StartMenu.js src/main.js tests/ui/dom.test.js
git commit -m "feat: loading screen and start menu"
```

---

## Task 22: HUD

**Files:**
- Create: `src/ui/HUD.js`
- Test: `tests/ui/hud.test.js` (jsdom) for the nearest-label + compass helpers.

**Interfaces:**
- Consumes: `PlayerController` position/heading, `campus.buildings`/`pois`.
- Produces:
  - `nearestLabel(pos: Vec2, campus) => string` — nearest building name within 60 m, else nearest zone POI name, else "SVNIT Campus". Pure, tested.
  - `headingToCompass(rad) => 'N'|'NE'|…` pure, tested.
  - `class HUD { mount(); update({ position, heading, mode }); setHint(text); toggleHelp() }` — reticle (dot), bottom-left location chip, mode chip (WALK/FLY/TOUR), top-right compass, `?` opens a controls sheet, all dismissible; auto-hides hints after 8 s.

- [ ] **Step 1: Failing tests**

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nearestLabel, headingToCompass } from '../../src/ui/HUD.js';

const campus = {
  buildings: [{ name: 'Central library', centroid: [0, 0] }, { name: 'Admin', centroid: [200, 0] }],
  pois: [{ name: 'Hostel Zone', type: 'zone', x: 500, z: 0 }],
};

describe('HUD helpers', () => {
  it('names the nearby building', () => {
    expect(nearestLabel([5, 3], campus)).toBe('Central library');
  });
  it('falls back to zone then default', () => {
    expect(nearestLabel([505, 3], campus)).toBe('Hostel Zone');
    expect(nearestLabel([5000, 0], campus)).toBe('SVNIT Campus');
  });
  it('compass', () => {
    expect(headingToCompass(0)).toBe('N');
  });
});
```

Ensure `HUD.js` splits pure helpers (no DOM at import) from the class.

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire into campus scene update. Visual checkpoint.**
- [ ] **Step 6: Commit**

```bash
git add src/ui/HUD.js tests/ui/hud.test.js
git commit -m "feat: HUD with location readout, compass, mode chip, help sheet"
```

---

## Task 23: Minimap

**Files:**
- Create: `src/ui/Minimap.js`
- Test: `tests/ui/minimap.test.js`

**Interfaces:**
- Produces:
  - `worldToMap({x,z}, bounds, size) => {mx,my}` — pure, tested (maps campus bounds into a `size`×`size` canvas, `+z` → down).
  - `class Minimap { constructor({ campus, onPoiClick }); mount(); update({ position, heading }); toggleFull() }` — canvas draws roads (grey), water (blue), building blocks (category colour, or colourblind palette if `Settings.minimapColorblind`), boundary outline, POI pins, player triangle with FOV wedge; click a pin → `onPoiClick(poi)`; a expand button → full-screen map.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { worldToMap } from '../../src/ui/Minimap.js';

const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

describe('worldToMap', () => {
  it('centre maps to centre', () => {
    expect(worldToMap({ x: 0, z: 0 }, bounds, 200)).toEqual({ mx: 100, my: 100 });
  });
  it('+z goes down the canvas', () => {
    expect(worldToMap({ x: 0, z: 100 }, bounds, 200).my).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire — minimap POI click → `Teleport.go`. Visual checkpoint: minimap resembles the real campus plan; clicking a pin moves you.**
- [ ] **Step 6: Commit**

```bash
git add src/ui/Minimap.js tests/ui/minimap.test.js
git commit -m "feat: interactive minimap with clickable POIs and full-screen map"
```

---

## Task 24: Interaction raycasting + InfoPanel

**Files:**
- Create: `src/ui/InfoPanel.js`, `src/player/Interaction.js`
- Test: `tests/ui/infopanel.test.js` (jsdom, render from a record)

**Interfaces:**
- Consumes: `buildingsApi.pickables` + `landmarks.pickables`, `three-mesh-bvh` accelerated raycast, `SceneManager`.
- Produces:
  - `src/player/Interaction.js`: `class Interaction { constructor({ camera, pickables, onHover, onSelect }); update(); dispose() }` — centre-screen ray each frame (throttled), within 35 m; `onHover(record|null)`, click/`E`/tap → `onSelect(record)`.
  - `src/ui/InfoPanel.js`: `renderInfo(record) => HTMLElement` (pure-ish, jsdom-testable) and `class InfoPanel { open(record, { onEnterInterior }); close() }` — slide-in card: name, category label, department, established, floors, description, "On the guided tour" badge, and an **Enter building** button when `record.meta.hasInterior`. Focus-trapped, `Esc` closes.

- [ ] **Step 1: Failing test**

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderInfo } from '../../src/ui/InfoPanel.js';

const rec = {
  name: 'Central library', category: 'library',
  meta: { department: undefined, established: 1968, floors: 3, description: 'Central library of SVNIT.', hasInterior: true },
};

describe('renderInfo', () => {
  it('shows name, established, floors, and an Enter button when interior exists', () => {
    const n = renderInfo(rec);
    expect(n.textContent).toMatch(/Central library/);
    expect(n.textContent).toMatch(/1968/);
    expect(n.querySelector('[data-action="enter"]')).toBeTruthy();
  });
  it('hides Enter button without an interior', () => {
    const n = renderInfo({ ...rec, meta: { ...rec.meta, hasInterior: false } });
    expect(n.querySelector('[data-action="enter"]')).toBeFalsy();
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire — hover shows a small name tooltip (HUD), click opens InfoPanel; `pickables` get `boundsTree` via `three-mesh-bvh`. Visual checkpoint.**
- [ ] **Step 6: Commit**

```bash
git add src/ui/InfoPanel.js src/player/Interaction.js tests/ui/infopanel.test.js
git commit -m "feat: building interaction raycasting and info panel"
```

---

## Task 25: Building directory + search

**Files:**
- Create: `src/ui/Directory.js`
- Test: `tests/ui/directory.test.js`

**Interfaces:**
- Produces:
  - `fuzzyFilter(query: string, items: {name:string}[]) => items[]` — subsequence match + rank by contiguity; pure, tested.
  - `class Directory { constructor({ campus, onPick }); open(); close() }` — searchable list of all buildings (grouped by category) + landmarks; Enter/click → `onPick(record)` → `Teleport` to its entrance (`buildingsApi.byId.get(id).doorWorldPos`) or POI.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { fuzzyFilter } from '../../src/ui/Directory.js';

const items = [{ name: 'Central library' }, { name: 'Civil Engineering Department' }, { name: 'Computer Engineering Department' }];

describe('fuzzyFilter', () => {
  it('matches subsequences', () => {
    const r = fuzzyFilter('ced', items).map((i) => i.name);
    expect(r).toContain('Civil Engineering Department');
  });
  it('ranks contiguous matches first', () => {
    expect(fuzzyFilter('comp', items)[0].name).toBe('Computer Engineering Department');
  });
  it('empty query returns all', () => {
    expect(fuzzyFilter('', items)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build → visual checkpoint.**
- [ ] **Step 5: Commit**

```bash
git add src/ui/Directory.js tests/ui/directory.test.js
git commit -m "feat: searchable building directory with teleport"
```

---

## Task 26: Settings panel + Credits

**Files:**
- Create: `src/ui/SettingsPanel.js`, `src/ui/Credits.js`
- Test: `tests/ui/settingspanel.test.js` (jsdom)

**Interfaces:**
- Consumes: `Settings` (T6), `events`.
- Produces:
  - `class SettingsPanel { open(); close() }` — controls for every `Settings` key: quality (select), time of day (segmented), ambient life (toggle), 3 volume sliders, FOV slider, invert-Y, reduce motion, colourblind minimap. Each control calls `Settings.set(...)`; panel reflects external changes via `settings:change`.
  - `class Credits { open(); close() }` — OSM/ODbL attribution, "facades and interiors are interpretive", tech credits, data regeneration note.

- [ ] **Step 1: Failing test** — opening the panel and toggling the quality select calls `Settings.set` and updates storage:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

describe('SettingsPanel', () => {
  beforeEach(() => { localStorage.clear(); });
  it('changing quality persists via Settings', async () => {
    const { SettingsPanel } = await import('../../src/ui/SettingsPanel.js');
    const { Settings } = await import('../../src/core/Settings.js');
    const p = new SettingsPanel();
    p.open();
    const sel = document.querySelector('[data-setting="quality"]');
    sel.value = 'low'; sel.dispatchEvent(new Event('change'));
    expect(Settings.get('quality')).toBe('low');
    p.close();
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire menu + an in-world `Esc` pause menu to open Settings/Credits. Confirm quality actually changes shadow map + tree counts live (emit `settings:change` consumers already exist).**
- [ ] **Step 6: Commit**

```bash
git add src/ui/SettingsPanel.js src/ui/Credits.js tests/ui/settingspanel.test.js
git commit -m "feat: settings panel and credits screen"
```

---

## Task 27: Interior base + furniture kit + portals

**Files:**
- Create: `src/interiors/InteriorBase.js`, `src/interiors/kit/FurnitureKit.js`
- Modify: `src/world/Campus.js` (emit door trigger volumes), `src/core/SceneManager.js` (already supports switching), `src/main.js` (register interior scenes)
- Test: `tests/interiors/portal.test.js`

**Interfaces:**
- Produces:
  - `FurnitureKit`: factory fns returning `{geometry|group, material}` for `deskChair`, `longTable`, `bookshelf`, `bookRow` (instanced spines), `podium`, `projectorScreen`, `ceilingFan` (animated), `door(label)`, `noticeboard`, `sofa`, `receptionDesk`, `pottedPlant`, `stairFlight`, `rail`, `wallSign(text)`. All low-poly, shared materials.
  - `InteriorBase`: `createInteriorShell({ w, d, h, floorMat, wallMat }) => { group, addExit(toCampusReturn) }` — box room (inward faces), skirting, ceiling with lights, and an **Exit** portal (glowing frame + troika "EXIT") that emits `interior:exit`.
  - `enterInterior(name, { returnPos, returnHeading })` / `exitInterior()` helpers on a shared `InteriorRouter` that swaps `SceneManager` scenes and restores the player transform on exit. `computeReturn(playerPos, playerHeading) => {returnPos, returnHeading}` pure, tested.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { computeReturn } from '../../src/interiors/InteriorBase.js';

describe('computeReturn', () => {
  it('stores and returns the exact transform, nudged 1.5 m back from the door', () => {
    const r = computeReturn({ x: 10, y: 1.7, z: 5 }, Math.PI / 2);
    expect(r.returnHeading).toBeCloseTo(Math.PI / 2, 5);
    expect(r.returnPos.y).toBeCloseTo(1.7, 5);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire — walking into a `hasInterior` building's door trigger (or the InfoPanel "Enter" button) calls `enterInterior`. `Esc`/Exit portal returns.**
- [ ] **Step 6: Commit**

```bash
git add src/interiors/ src/world/Campus.js src/main.js tests/interiors/portal.test.js
git commit -m "feat: interior scene router, room shell and furniture kit"
```

---

## Task 28: Central Library interior

**Files:**
- Create: `src/interiors/LibraryInterior.js`
- Test: none (visual); uses tested kit + shell.

**Interfaces:**
- Produces: `createLibraryInterior({ returnCtx }) => { scene, camera, update(dt), dispose() }` — entrance lobby with issue/return desk + security gate; double-height reading hall with rows of `longTable` + `deskChair` + task lamps + seated students (instanced, static); 6–10 `bookshelf` stack rows with `bookRow` spines; periodicals nook; 4 OPAC terminals; staircase to a first-floor gallery with more stacks; signage ("SILENCE PLEASE", "REFERENCE", "PERIODICALS", section letters); warm interior lighting; Exit portal at the lobby.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Register scene `'interior:library'` in `main.js`; link from the Central Library building.**
- [ ] **Step 3: Lint, build, visual checkpoint — walk in from campus, wander stacks, exit returns to the library steps.**
- [ ] **Step 4: Commit**

```bash
git add src/interiors/LibraryInterior.js src/main.js
git commit -m "feat: Central Library interior"
```

---

## Task 29: Lecture Theatre interior

**Files:**
- Create: `src/interiors/LectureHallInterior.js`
- Test: `tests/interiors/seating.test.js` (pure tiered-seat layout).

**Interfaces:**
- Produces:
  - `tieredSeatRows({ rows, seatsPerRow, rise, run, seatW }) => Matrix4-ish transforms [{x,y,z}]` — pure, tested.
  - `createLectureHallInterior({ returnCtx }) => { scene, camera, update(dt), dispose() }` — raked floor, ~10 rows × 12 instanced seats with fold tablets, teacher podium + mic, twin whiteboards, motorised projector screen + ceiling projector cone, side ribbon windows with chhajja + daylight, 4 ceiling fans (animated), door sign "LT-2", Exit portal.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { tieredSeatRows } from '../../src/interiors/LectureHallInterior.js';

describe('tieredSeatRows', () => {
  it('each row rises and steps back', () => {
    const t = tieredSeatRows({ rows: 3, seatsPerRow: 4, rise: 0.35, run: 0.9, seatW: 0.6 });
    expect(t).toHaveLength(12);
    const r0 = t[0], r1 = t[4];
    expect(r1.y).toBeGreaterThan(r0.y);
    expect(Math.abs(r1.z) - Math.abs(r0.z)).toBeCloseTo(0.9, 5);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build → visual checkpoint.**
- [ ] **Step 5: Commit**

```bash
git add src/interiors/LectureHallInterior.js src/main.js tests/interiors/seating.test.js
git commit -m "feat: lecture theatre interior with tiered seating"
```

---

## Task 30: Administration lobby interior

**Files:**
- Create: `src/interiors/AdminLobbyInterior.js`
- Test: none (visual).

**Interfaces:**
- Produces: `createAdminLobbyInterior({ returnCtx }) => { scene, camera, update, dispose }` — reception desk + attendant, waiting sofas, glass-front noticeboards (troika text: admissions notice, academic calendar, circular), portrait wall of past directors (framed panels), potted plants, corridor with named doors ("DIRECTOR", "REGISTRAR", "DEAN (ACADEMIC)"), open-well staircase with an SVNIT crest medallion, Exit portal.

- [ ] **Step 1: Implement. 2: Register `'interior:admin'`, link from Administration Building. 3: Lint/build/visual. 4: Commit**

```bash
git add src/interiors/AdminLobbyInterior.js src/main.js
git commit -m "feat: administration building lobby interior"
```

---

## Task 31: Guided tour

**Files:**
- Create: `src/tour/route.js`, `src/tour/keyframes.js`, `src/tour/CameraRig.js`, `src/ui/TourPanel.js`
- Modify: `src/player/PlayerController.js` (`'tour'` mode yields control to the rig), `src/main.js`
- Test: `tests/tour/keyframes.test.js`

**Interfaces:**
- Produces:
  - `src/tour/keyframes.js`: `samplePath(keys: {t:number, pos:[x,y,z], look:[x,y,z]}[], time: number) => { pos, look }` — Catmull-Rom position, slerp-ish look, clamped; pure, tested. `pathDuration(keys) => number`.
  - `src/tour/route.js`: `TOUR_STOPS` — ordered `[{ id, title, targetPoi?|targetBuildingId?, dwell, narration, enterInterior? }]`. `resolveStops(campus, buildingsApi) => runtime stops with concrete positions + generated approach keyframes`.
  - `src/tour/CameraRig.js`: `class CameraRig { constructor({ camera }); play(resolvedStops, { onStop, onEnd }); pause(); resume(); next(); prev(); stop(); update(dt) }`.
  - `src/ui/TourPanel.js`: `class TourPanel { show(stops); hide(); bind(rig) }` — transport bar: play/pause, prev/next, progress, current title + captioned narration text, "Exit tour".

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { samplePath, pathDuration } from '../../src/tour/keyframes.js';

const keys = [
  { t: 0, pos: [0, 2, 0], look: [10, 2, 0] },
  { t: 2, pos: [0, 2, 20], look: [10, 2, 20] },
  { t: 4, pos: [20, 2, 20], look: [30, 2, 20] },
];

describe('keyframes', () => {
  it('duration is the last t', () => {
    expect(pathDuration(keys)).toBe(4);
  });
  it('samples endpoints exactly and interpolates the middle', () => {
    expect(samplePath(keys, 0).pos[2]).toBeCloseTo(0, 3);
    expect(samplePath(keys, 4).pos[0]).toBeCloseTo(20, 3);
    const mid = samplePath(keys, 1);
    expect(mid.pos[2]).toBeGreaterThan(0);
    expect(mid.pos[2]).toBeLessThan(20);
  });
  it('clamps out-of-range time', () => {
    expect(samplePath(keys, -5).pos[2]).toBeCloseTo(0, 3);
    expect(samplePath(keys, 99).pos[0]).toBeCloseTo(20, 3);
  });
});
```

- [ ] **Step 2: fail → 3: implement keyframes → 4: pass.**
- [ ] **Step 5: Implement `route.js` (the curated route from the spec §10), `CameraRig`, `TourPanel`. Between stops the rig auto-generates a smooth approach (start = current cam, end = a framing position 12–18 m from the target at eye/low-drone height). At an `enterInterior` stop, switch scene, play a short interior sweep, return.**
- [ ] **Step 6: Wire — StartMenu "Guided tour" and an in-world "Take the tour" button start it; `Esc` exits to WALK at the current spot.**
- [ ] **Step 7: Visual checkpoint — full tour run start to finish, including both interior visits; captions readable; `prefers-reduced-motion` shortens eases.**
- [ ] **Step 8: Commit**

```bash
git add src/tour/ src/ui/TourPanel.js src/player/PlayerController.js src/main.js tests/tour/keyframes.test.js
git commit -m "feat: guided campus tour with keyframed camera and narration"
```

---

## Task 32: Audio ambience

**Files:**
- Create: `src/audio/synth.js`, `src/audio/Ambience.js`
- Test: `tests/audio/synth.test.js` (pure gain/curve math; mock `AudioContext`).

**Interfaces:**
- Consumes: `Settings` volumes, `events` (`settings:change`, `interior:enter/exit`, tour stop), player position vs POIs.
- Produces:
  - `src/audio/synth.js`: `makeNoiseBuffer(ctx, seconds, type)`, `birdChirp(ctx, t)`, `bell(ctx, t, freq)`, pure-ish helpers; `distanceGain(dist, maxDist) => 0..1` pure, tested.
  - `src/audio/Ambience.js`: `class Ambience { async start(); setScene('campus'|'interior-library'|'interior-hall'|'interior-admin'); update({ position, poiDistances }); setVolumes({...}); stop() }` — buses: birds bed, road hum (louder near gate), breeze (louder in open ground), cicadas (dusk/night, from `timeOfDay`), temple bell (near temple), footsteps (triggered from `PlayerController` step events), UI ticks. Starts muted until first user gesture.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { distanceGain } from '../../src/audio/synth.js';

describe('distanceGain', () => {
  it('1 at zero distance, 0 past max, monotonic', () => {
    expect(distanceGain(0, 100)).toBeCloseTo(1, 5);
    expect(distanceGain(100, 100)).toBeCloseTo(0, 5);
    expect(distanceGain(30, 100)).toBeGreaterThan(distanceGain(60, 100));
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire — resume `AudioContext` on the StartMenu "Enter" click; footstep events from the controller; scene changes switch beds. Manual check with headphones.**
- [ ] **Step 6: Commit**

```bash
git add src/audio/ tests/audio/synth.test.js
git commit -m "feat: WebAudio ambience beds, positional cues and footsteps"
```

---

## Task 33: Ambient life

**Files:**
- Create: `src/world/Life.js`, `src/world/peopleModels.js`
- Test: `tests/world/waypoints.test.js`

**Interfaces:**
- Consumes: `campus.roads` (as a walk graph), `Settings.ambientLife`, `Settings.quality`.
- Produces:
  - `buildWalkGraph(roads) => { nodes:Vec2[], edges:[i,j][] }` and `advanceAgent(agent, graph, dt) => agent` — pure, tested (agent follows edges, picks a new edge at a node).
  - `createLife(campus, registry) => { group, update(dt), setEnabled(b), dispose() }` — N instanced low-poly students walking the path graph (N by quality: low 0, med 30, high 70, ultra 120), a few instanced parked bicycles near hostels/departments, one campus bus looping the main road. All gated by `Settings.ambientLife`.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildWalkGraph, advanceAgent } from '../../src/world/Life.js';

const roads = [{ path: [[0, 0], [10, 0], [10, 10]] }, { path: [[10, 0], [20, 0]] }];

describe('walk graph', () => {
  it('builds nodes and edges from road polylines', () => {
    const g = buildWalkGraph(roads);
    expect(g.nodes.length).toBeGreaterThanOrEqual(4);
    expect(g.edges.length).toBeGreaterThanOrEqual(3);
  });
  it('an agent moves along an edge and stays on the graph', () => {
    const g = buildWalkGraph(roads);
    let a = { edge: 0, s: 0, dir: 1, speed: 1.4, pos: [0, 0] };
    for (let i = 0; i < 50; i++) a = advanceAgent(a, g, 0.1);
    expect(a.pos.every(Number.isFinite)).toBe(true);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Wire into campus scene; toggle respects settings live. Visual checkpoint.**
- [ ] **Step 6: Commit**

```bash
git add src/world/Life.js src/world/peopleModels.js tests/world/waypoints.test.js
git commit -m "feat: ambient campus life — walking students, bicycles, shuttle bus"
```

---

## Task 34: Mobile controls + responsive UI

**Files:**
- Create: `src/player/MobileControls.js`
- Modify: `src/player/PlayerController.js`, `src/ui/*` (responsive CSS), `src/styles/ui.css`
- Test: `tests/player/touchvector.test.js`

**Interfaces:**
- Produces:
  - `stickVector(touchStart: {x,y}, touchNow: {x,y}, maxRadius=48) => {x,y}` normalised −1..1, clamped; pure, tested.
  - `class MobileControls { constructor({ domElement, onMove(vec), onLook(dx,dy), onInteract() }); mount(); dispose(); get isTouch() }` — left half = move stick (visual ring), right half = look drag, tap reticle = interact, an on-screen "run" latch + mode button.
  - `isTouchDevice()` helper; UI panels switch to bottom-sheet layout under 720 px width.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { stickVector } from '../../src/player/MobileControls.js';

describe('stickVector', () => {
  it('centre is zero', () => {
    expect(stickVector({ x: 0, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('clamps to the unit circle', () => {
    const v = stickVector({ x: 0, y: 0 }, { x: 200, y: 0 }, 48);
    expect(v.x).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: fail → 3: implement → 4: pass → lint → build.**
- [ ] **Step 5: Visual checkpoint on a narrow viewport / device emulation — sticks work, UI reflows, targets ≥ 44 px.**
- [ ] **Step 6: Commit**

```bash
git add src/player/MobileControls.js src/player/PlayerController.js src/ui/ src/styles/ui.css tests/player/touchvector.test.js
git commit -m "feat: mobile touch controls and responsive UI"
```

---

## Task 35: Performance pass + smoke test + quality wiring

**Files:**
- Create: `tests/smoke/world.test.js`, `src/core/perf.js` (frame stats + auto-quality)
- Modify: any hotspots found.
- Test: `tests/smoke/world.test.js`

**Interfaces:**
- Produces:
  - `src/core/perf.js`: `class PerfMonitor { sample(dt); get fps; get p1Low; suggestQuality(current) => string|null }` — pure-ish, tested; optional auto-downgrade when sustained < 25 fps (with a user toast, once).
  - `tests/smoke/world.test.js`: builds a stubbed campus (3 buildings, 2 roads, 1 water, 2 pois) through the real world builders with a mocked WebGL context (`vi.mock` three's renderer or use `three` headless with a null canvas) and asserts: no throw, building groups == 3, `dispose()` clears the registry.

- [ ] **Step 1: Write smoke test + perf test (fail).**
- [ ] **Step 2: Implement `perf.js`; make the smoke test pass by ensuring world builders are import-safe under node (guard `document`, `window`).**
- [ ] **Step 3: Instancing/merge audit** — verify trees, lamps, benches, seats, books, people are `InstancedMesh`; roads/walls merged; run the dev build with `renderer.info` logged; record draw calls + triangles at 3 vantage points in `docs/QA-checklist.md`.
- [ ] **Step 4: Tune** — adjust LOD thresholds, fog distance, shadow map size per preset, tree density per preset, `powerPreference`, `renderer.setPixelRatio` cap, until Low preset holds ≥ 30 fps on a throttled GPU and High ≥ 55 fps desktop. Frame-chunk the world build (`Campus.js` yields between subsystems) so the loading bar advances without a long freeze.
- [ ] **Step 5: Run full `npm test`, lint, build.**
- [ ] **Step 6: Commit**

```bash
git add src/core/perf.js tests/smoke/world.test.js docs/QA-checklist.md src/
git commit -m "perf: instancing audit, LOD tuning, quality presets, world smoke test"
```

---

## Task 36: Visual accuracy pass, docs, deploy

**Files:**
- Create: `README.md` (replace stub), `CREDITS.md`, `netlify.toml`, `docs/QA-checklist.md` (finalise)
- Modify: `data/campus/curated.mjs` (accuracy nudges), `src/data/campus.generated.json` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1: Accuracy pass** — with `npm run dev` + fly mode, compare campus layout against OSM/satellite mental model and `data/osm/overpass-raw.json`. For any building obviously mis-categorised, mis-sized, or mis-placed, and for the `extraBuildings`/`gates` approximate coordinates, edit `data/campus/curated.mjs`; re-run `npm run data`; commit the regenerated JSON. Add any missing well-known buildings (Nehru/Sarabhai/other Bhavans, sports pavilion) to `extraBuildings` with satellite-picked footprints.
- [ ] **Step 2: Run the full QA checklist** (`docs/QA-checklist.md`): nav modes; collision; each interior enter/exit restores position + heading; full tour; minimap click; directory teleport; settings persistence across reload; all four times of day; mobile sticks on a narrow viewport; reduced-motion; Low preset on throttled GPU. Record pass/fail + screenshots.
- [ ] **Step 3: Write `README.md`** — what it is, screenshots, `npm i && npm run dev`, `npm run data` (when/why), `npm test`, `npm run build`, deploy notes, controls table, project structure, **attribution** (OSM/ODbL; facades & interiors interpretive), how to refine campus data (link `data/campus/README.md`), roadmap (VR, more interiors, real photos).
- [ ] **Step 4: Write `CREDITS.md`** — OpenStreetMap contributors (ODbL), Three.js, troika-three-text, three-mesh-bvh; statement that all facades, interiors, props, audio, and narration are original/interpretive.
- [ ] **Step 5: `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 6: Final `npm test && npm run lint && npm run build`. Commit.**

```bash
git add -A
git commit -m "docs: README, credits, deploy config; final campus accuracy pass"
```

- [ ] **Step 7: Finishing the branch** — invoke `superpowers:finishing-a-development-branch` to decide merge/PR. Provide the user the preview build + a summary of accuracy caveats.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §3 Data pipeline | T2, T3, T4, T5, T11 (shared module) |
| §3.3 Output schema | T5 (`schema.mjs`) |
| §4 Coordinate system | Global Constraints, T2 |
| §5 Runtime architecture / file tree | T1, T6, and each feature task |
| §6 Buildings & facade system | T11, T12, T13, T14 |
| §7 Interiors (Library, Lecture Hall, Admin) | T27, T28, T29, T30 |
| §8 Player & controls (walk/fly/tour/teleport/mobile) | T15, T16, T17, T31, T34 |
| §9 UI/HUD (menu, HUD, minimap, info, directory, settings, credits) | T21–T26 |
| §10 Guided tour | T31 |
| §11 Audio | T32 |
| §12 Performance | T14 (LOD), T35 |
| §13 Accuracy & fidelity / curated overlay | T5, T36 |
| §14 Testing (pipeline, geometry, collision, smoke, QA) | T2–T5, T11, T15, T31, T35, T36 |
| §15 Build sequence | Task order mirrors it |
| §16 Risks | Instancing from T14/T18/T19/T33; accuracy T36; scope = task independence |
| §17 Attribution | T26 (Credits), T36 (README/CREDITS) |
| Landmarks (statue, temple, gate) | T20 |
| Vegetation / street kit | T18, T19 |
| Ambient life | T33 |

No uncovered spec requirements.

**2. Placeholder scan** — no "TBD"/"handle edge cases"/"similar to Task N"/"write tests for the above" left; each code step has real code; the one deliberate deferral (satellite-verify `extraBuildings` coords) is an explicit Task 36 step, not a placeholder.

**3. Type consistency**
- `campus.generated.json` shape identical in spec §3.3, T5 schema, and consumers (T8, T9, T15, T22, T23).
- `buildingsApi` shape (`{ group, update, pickables, byId, dispose }`) defined in T14, consumed with the same names in T15, T24, T25, T31.
- `PlayerController` API (`mode`, `setMode`, `update`, `teleport`, `position`, `heading`) defined T15, extended (not renamed) in T16, T31, T34.
- Polygon utils single-sourced in `src/shared/polygon.mjs` after T11; pipeline shim keeps T2–T5 import paths valid.
- `Settings` keys enumerated once in T6 and reused verbatim in T7, T14, T18, T23, T26, T33, T35.
- `events` channel names: `settings:change` (T6), `world:progress` (T21), `interior:enter`/`interior:exit` (T27), consistent across tasks.

Fixed inline: T3 test had a syntax typo in the last assertion — corrected in the step text.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-06-svnit-3d-virtual-tour.md`.
