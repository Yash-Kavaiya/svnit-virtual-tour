import * as THREE from 'three';
import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';

const canvas = document.getElementById('scene');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

// Placeholder scene — replaced by the 'campus' scene once its module lands.
scenes.register('placeholder', async () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fbfe8');
  const camera = new THREE.PerspectiveCamera(Settings.get('fov'), innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(0, 40, 120);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#cfe6ff', '#4a3f2f', 1));
  const grid = new THREE.GridHelper(400, 40, '#3a5a78', '#2a4258');
  scene.add(grid);
  let t = 0;
  return {
    scene,
    camera,
    update(dt) {
      t += dt;
      camera.position.x = Math.sin(t * 0.1) * 120;
      camera.position.z = Math.cos(t * 0.1) * 120;
      camera.lookAt(0, 0, 0);
    },
    dispose() {},
  };
});

function resize() {
  setSize(innerWidth, innerHeight);
  const cam = scenes.active?.camera;
  if (cam) {
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }
}
addEventListener('resize', resize);

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

await scenes.activate('placeholder');
resize();
frame();
