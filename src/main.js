import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { createCampusScene } from './world/Campus.js';
import campus from './data/campus.generated.json';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

// Minimal boot overlay (Task 21 replaces with the real loading screen + menu).
const boot = document.createElement('div');
boot.className = 'panel';
boot.style.cssText =
  'left:50%;top:50%;transform:translate(-50%,-50%);padding:1.4rem 2rem;text-align:center;min-width:260px';
boot.innerHTML =
  '<div style="font-size:1.05rem;font-weight:600">SVNIT Surat — Virtual Campus Tour</div>' +
  '<div id="boot-status" style="color:var(--text-dim);margin-top:.5rem;font-size:.85rem">Loading…</div>';
uiRoot.append(boot);
const bootStatus = boot.querySelector('#boot-status');

scenes.register('campus', (params) =>
  createCampusScene({
    campus,
    renderer,
    domElement: canvas,
    onProgress: (label) => {
      bootStatus.textContent = `Building ${label}…`;
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
function frame() {
  clock.tick();
  scenes.update(Math.min(clock.delta, 0.1));
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

await scenes.activate('campus');
boot.remove();
resize();
frame();

if (import.meta.env.DEV) {
  window.__scenes = scenes;
}
