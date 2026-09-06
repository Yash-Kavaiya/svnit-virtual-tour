import * as THREE from 'three';
import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { AssetRegistry } from './core/AssetRegistry.js';
import { createSky } from './world/Sky.js';
import { createLighting } from './world/Lighting.js';
import { createGround } from './world/Ground.js';
import campus from './data/campus.generated.json';

const canvas = document.getElementById('scene');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

// Dev preview scene — an orbiting look at the campus base as world modules land.
// Task 15 replaces this with the real 'campus' scene + player controller.
scenes.register('preview', async () => {
  const scene = new THREE.Scene();
  const registry = new AssetRegistry();
  const camera = new THREE.PerspectiveCamera(Settings.get('fov'), innerWidth / innerHeight, 0.1, 4000);
  camera.position.set(0, 260, 620);
  camera.lookAt(0, 0, 0);

  const sky = createSky(scene);
  const lighting = createLighting(scene, renderer);
  const ground = createGround(campus, registry);
  scene.add(ground.group);

  const applyTime = () => {
    sky.setPreset(Settings.get('timeOfDay'));
    lighting.setPreset(Settings.get('timeOfDay'));
  };
  applyTime();
  const onSettings = ({ key }) => key === 'timeOfDay' && applyTime();
  events.on('settings:change', onSettings);

  let t = 0;
  return {
    scene,
    camera,
    api: { scene, registry, campus },
    update(dt) {
      t += dt * 0.06;
      const r = 640;
      camera.position.set(Math.sin(t) * r, 240 + Math.sin(t * 0.5) * 60, Math.cos(t) * r);
      camera.lookAt(0, 0, 0);
      lighting.updateShadowTarget(new THREE.Vector3(0, 0, 0));
    },
    dispose() {
      events.off('settings:change', onSettings);
      sky.dispose();
      lighting.dispose();
      ground.dispose();
      registry.disposeAll();
    },
  };
});

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

await scenes.activate('preview');
resize();
frame();
