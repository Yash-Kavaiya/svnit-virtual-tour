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
  const w = innerWidth;
  const h = innerHeight;
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
