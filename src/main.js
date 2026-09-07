import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { createCampusScene } from './world/Campus.js';
import { Loading } from './ui/Loading.js';
import { StartMenu } from './ui/StartMenu.js';
import { GameUI } from './ui/GameUI.js';
import { InteriorRouter } from './interiors/router.js';
import { Ambience } from './audio/Ambience.js';
import { PerfMonitor } from './core/perf.js';
import { el } from './ui/dom.js';
import campus from './data/campus.generated.json';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
const fadeEl = document.getElementById('fade');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

const TOTAL_STEPS = 11;
const loading = new Loading(uiRoot).show();
let progressCount = 0;

scenes.register('campus', (params) =>
  createCampusScene({
    campus,
    renderer,
    domElement: canvas,
    onProgress: (label) => {
      progressCount += 1;
      loading.setProgress(progressCount / TOTAL_STEPS, `Building ${label}…`);
    },
    ...params,
  }),
);

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  setSize(w, h);
  const cam = view?.camera;
  if (cam) {
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
}
addEventListener('resize', resize);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resize).observe(document.getElementById('app'));
}

const clock = new Clock();
const perf = new PerfMonitor(180);
let perfNotified = false;
let running = false;
let gameUI = null;
let view = null; // current render target: campus scene or an interior scene

function frame() {
  clock.tick();
  const dt = Math.min(clock.delta, 0.1);
  if (running && view) {
    const paused = !!menu || (gameUI && gameUI.anyPanelOpen());
    view.update(paused ? 0 : dt);
    if (view === campusView && !router?.inInterior) gameUI?.update(dt);
    if (!paused) ambience?.update({ position: view.camera.position });
    renderer.render(view.scene, view.camera);

    perf.sample(dt);
    if (!perfNotified) {
      const lower = perf.suggestQuality(Settings.get('quality'));
      if (lower) {
        perfNotified = true;
        Settings.set('quality', lower);
        toast(`Graphics set to ${lower} to keep things smooth — change it in Settings.`);
      }
    }
  }
  requestAnimationFrame(frame);
}

function toast(text) {
  const t = el('div', {
    className: 'panel',
    style: {
      left: '50%',
      top: '4rem',
      transform: 'translateX(-50%)',
      padding: '.5rem 1rem',
      fontSize: '.85rem',
    },
  });
  t.textContent = text;
  uiRoot.append(t);
  setTimeout(() => t.remove(), 6000);
}

events.on('settings:change', ({ key }) => {
  const cam = view?.camera;
  if (key === 'fov' && cam) {
    cam.fov = Settings.get('fov');
    cam.updateProjectionMatrix();
  }
});

const campusView = await scenes.activate('campus');
loading.done();
view = campusView;
resize();
running = true;
const api = campusView.api;

gameUI = new GameUI({
  root: uiRoot,
  fadeEl,
  api,
  onEnterInterior: (record) => events.emit('interior:request', record),
});

const ambience = new Ambience(campus);
function startAudio() {
  ambience.start();
}
function lockPointer() {
  try {
    const p = canvas.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* pointer lock needs a user gesture / not supported */
  }
}

// interior enter/leave
const interiorBanner = el('div', {
  className: 'panel',
  style: {
    left: '50%',
    top: '1rem',
    transform: 'translateX(-50%)',
    padding: '.4rem 1rem',
    fontSize: '.85rem',
    fontWeight: '600',
  },
});
interiorBanner.hidden = true;
uiRoot.append(interiorBanner);

const router = new InteriorRouter({
  domElement: canvas,
  campusView,
  onViewChange: (v) => {
    view = v;
    resize();
    const inside = v !== campusView;
    interiorBanner.hidden = !inside;
    if (inside) interiorBanner.textContent = `${v.title}  ·  walk into the EXIT portal or press Esc to leave`;
    gameUI.setInteriorMode?.(inside);
  },
});

// --- menu handling
let menu = null;
function openMenu() {
  if (menu) return;
  api.player.releasePointer?.();
  gameUI?.closePanels();
  menu = new StartMenu({
    root: uiRoot,
    onEnter: () => {
      menu = null;
      startAudio();
      lockPointer();
    },
    onTour: () => {
      menu = null;
      startAudio();
      events.emit('tour:start');
    },
    onDirectory: () => {
      menu?.hide();
      menu = null;
      events.emit('ui:directory');
    },
    onSettings: () => {
      menu?.hide();
      menu = null;
      events.emit('ui:settings');
    },
    onCredits: () => {
      menu?.hide();
      menu = null;
      events.emit('ui:credits');
    },
  }).show();
}
openMenu();

events.on('interior:enter', () => {
  menu?.hide();
  menu = null;
  gameUI?.closePanels();
});
events.on('tour:start', () => {
  menu?.hide();
  menu = null;
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (menu) {
    menu.hide();
    menu = null;
  } else if (gameUI?.anyPanelOpen()) {
    gameUI.closePanels();
  } else if (router.inInterior) {
    events.emit('interior:exit');
  } else {
    openMenu();
  }
});

frame();

if (import.meta.env.DEV) {
  window.__scenes = scenes;
  window.__api = api;
  window.__ui = gameUI;
  window.__renderer = renderer;
}
