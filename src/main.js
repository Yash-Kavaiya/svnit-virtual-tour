import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { createCampusScene } from './world/Campus.js';
import { Loading } from './ui/Loading.js';
import { StartMenu } from './ui/StartMenu.js';
import campus from './data/campus.generated.json';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

const PROGRESS_STEPS = [
  'Sky',
  'Lighting',
  'Ground & lawns',
  'Roads',
  'Water',
  'Buildings',
  'Trees & gardens',
  'Street furniture',
  'Landmarks',
];

const loading = new Loading(uiRoot).show();
let progressCount = 0;

scenes.register('campus', (params) =>
  createCampusScene({
    campus,
    renderer,
    domElement: canvas,
    onProgress: (label) => {
      progressCount += 1;
      loading.setProgress(progressCount / (PROGRESS_STEPS.length + 1), `Building ${label}…`);
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
function frame() {
  clock.tick();
  if (running) scenes.update(Math.min(clock.delta, 0.1));
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
frame();

const api = scene.api;

// --- Start menu + pause menu
let menu = null;
function openMenu() {
  if (menu) return;
  api.player.releasePointer?.();
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
    onDirectory: () => events.emit('ui:directory'),
    onSettings: () => events.emit('ui:settings'),
    onCredits: () => events.emit('ui:credits'),
  }).show();
}
openMenu();

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (menu) {
      menu.hide();
      menu = null;
    } else {
      openMenu();
    }
  }
});

if (import.meta.env.DEV) {
  window.__scenes = scenes;
  window.__api = api;
}
