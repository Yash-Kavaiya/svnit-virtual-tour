import * as THREE from 'three';
import { createRenderer } from './core/Renderer.js';
import { Clock } from './core/Clock.js';
import { SceneManager } from './core/SceneManager.js';
import { Settings } from './core/Settings.js';
import { events } from './core/events.js';
import { createSky } from './world/Sky.js';
import { createLighting } from './world/Lighting.js';

const canvas = document.getElementById('scene');
const { renderer, setSize } = createRenderer(canvas);
const scenes = new SceneManager(renderer);

// Placeholder scene — replaced by the 'campus' scene once its module lands.
scenes.register('placeholder', async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(Settings.get('fov'), innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(0, 22, 90);
  camera.lookAt(0, 4, 0);

  const sky = createSky(scene);
  const lighting = createLighting(scene, renderer);
  sky.setPreset(Settings.get('timeOfDay'));
  lighting.setPreset(Settings.get('timeOfDay'));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: '#6f7d4a', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const boxMat = new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const h = 6 + i * 3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), boxMat);
    b.position.set(-60 + i * 18, h / 2, Math.sin(i) * 20);
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
  }
  scene.add(new THREE.GridHelper(400, 40, '#3a5a78', '#2a425855'));

  let t = 0;
  return {
    scene,
    camera,
    update(dt) {
      t += dt;
      camera.position.x = Math.sin(t * 0.08) * 110;
      camera.position.z = Math.cos(t * 0.08) * 110;
      camera.lookAt(0, 6, 0);
      lighting.updateShadowTarget(new THREE.Vector3(0, 0, 0));
    },
    dispose() {
      sky.dispose();
      lighting.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
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

await scenes.activate('placeholder');
resize();
frame();
