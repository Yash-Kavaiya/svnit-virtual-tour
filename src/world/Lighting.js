import * as THREE from 'three';
import { TIME_PRESETS } from './TimeOfDay.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';

const SHADOW_MAP = { low: 0, medium: 1024, high: 2048, ultra: 4096 };
const SUN_DISTANCE = 260;

export function createLighting(scene, renderer) {
  const hemi = new THREE.HemisphereLight('#bcd8ff', '#5a4d3a', 0.9);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight('#9a9a9a', 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight('#fff4e0', 3.1);
  sun.castShadow = true;
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = SUN_DISTANCE * 2.2;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  let currentPreset = 'noon';

  function applyQuality() {
    const q = Settings.get('quality');
    const size = SHADOW_MAP[q] ?? 2048;
    if (size === 0) {
      sun.castShadow = false;
      renderer.shadowMap.enabled = false;
    } else {
      sun.castShadow = true;
      renderer.shadowMap.enabled = true;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    }
  }

  function setPreset(name) {
    const p = TIME_PRESETS[name] ?? TIME_PRESETS.noon;
    currentPreset = name;
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemiIntensity;
    ambient.color.set(p.ambient);
    ambient.intensity = p.ambientIntensity ?? 0.4;
    sun.color.set(p.sunColor);
    sun.intensity = p.sunIntensity;
    renderer.toneMappingExposure = p.exposure;
    updateSunPosition(lastTarget);
  }

  const lastTarget = new THREE.Vector3();
  function updateSunPosition(target) {
    lastTarget.copy(target);
    const p = TIME_PRESETS[currentPreset] ?? TIME_PRESETS.noon;
    const dir = new THREE.Vector3(...p.sunDir).normalize();
    sun.position.copy(target).addScaledVector(dir, SUN_DISTANCE);
    sun.target.position.copy(target);
    sun.target.updateMatrixWorld();
  }

  function updateShadowTarget(pos) {
    updateSunPosition(pos);
  }

  const onSettings = ({ key }) => {
    if (key === 'quality') applyQuality();
    if (key === 'timeOfDay') setPreset(Settings.get('timeOfDay'));
  };
  events.on('settings:change', onSettings);

  applyQuality();
  setPreset(Settings.get('timeOfDay'));

  function dispose() {
    events.off('settings:change', onSettings);
    scene.remove(hemi, ambient, sun, sun.target);
    sun.shadow.map?.dispose();
    sun.dispose();
    hemi.dispose();
    ambient.dispose();
  }

  return { hemi, ambient, sun, setPreset, updateShadowTarget, dispose };
}
