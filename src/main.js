import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { createCampusScene } from './world/Campus.js';
import { Loading } from './ui/Loading.js';
import { StartMenu } from './ui/StartMenu.js';
import { GameUI } from './ui/GameUI.js';
import campus from './data/campus.generated.json';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
const fadeEl = document.getElementById('fade');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

const TOTAL_STEPS = 10;
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
  const cam = scenes.active?.camera;
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
let running = false;
let gameUI = null;

function frame() {
  clock.tick();
  const dt = Math.min(clock.delta, 0.1);
  if (running) {
    const paused = !!menu || (gameUI && gameUI.anyPanelOpen());
    scenes.active?.update(paused ? 0 : dt);
    gameUI?.update(dt);
  }
  scenes.render();
  requestAnimationFrame(frame);
}

events.on('settings:change', ({ key }) => {
  const cam = scenes.active?.camera;
  if (key === 'fov' && cam) {
    cam.fov = Settings.get('fov');
    cam.updateProjectionMatrix();
  }
});

const scene = await scenes.activate('campus');
loading.done();
resize();
running = true;
const api = scene.api;

gameUI = new GameUI({
  root: uiRoot,
  fadeEl,
  api,
  onEnterInterior: (record) => events.emit('interior:request', record),
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
      canvas.requestPointerLock?.();
    },
    onTour: () => {
      menu = null;
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

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (menu) {
    menu.hide();
    menu = null;
  } else if (gameUI?.anyPanelOpen()) {
    gameUI.closePanels();
  } else {
    openMenu();
  }
});

frame();

if (import.meta.env.DEV) {
  window.__scenes = scenes;
  window.__api = api;
  window.__ui = gameUI;
}
