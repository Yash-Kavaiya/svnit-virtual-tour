import * as THREE from 'three';
import { AssetRegistry } from '../core/AssetRegistry.js';
import { Settings } from '../core/Settings.js';
import { events } from '../core/events.js';
import { createSky } from './Sky.js';
import { createLighting } from './Lighting.js';
import { createGround } from './Ground.js';
import { createRoads } from './Roads.js';
import { createWater } from './Water.js';
import { createBuildings } from './buildings/Buildings.js';
import { createVegetation } from './Vegetation.js';
import { createStreetKit } from './StreetKit.js';
import { createLandmarks } from './Landmarks.js';
import { createLife } from './Life.js';
import { PlayerController } from '../player/PlayerController.js';
import { Collider } from '../player/Collision.js';
import { TIME_PRESETS } from './TimeOfDay.js';
import { gateFrame } from './gateFrame.js';

const D2R = Math.PI / 180;

export async function createCampusScene({ campus, renderer, domElement, onProgress = () => {} }) {
  const scene = new THREE.Scene();
  const registry = new AssetRegistry();
  const camera = new THREE.PerspectiveCamera(
    Settings.get('fov'),
    window.innerWidth / window.innerHeight,
    0.1,
    3500,
  );

  const step = async (label, fn) => {
    onProgress(label);
    const r = fn();
    await new Promise((res) => setTimeout(res, 0));
    return r;
  };

  const sky = await step('Sky', () => createSky(scene));
  const lighting = await step('Lighting', () => createLighting(scene, renderer));
  const ground = await step('Ground & lawns', () => createGround(campus, registry));
  const roads = await step('Roads', () => createRoads(campus, registry));
  const water = await step('Water', () => createWater(campus, registry));
  const buildings = await step('Buildings', () => createBuildings(campus, registry));
  const vegetation = await step('Trees & gardens', () => createVegetation(campus, registry));
  const streetKit = await step('Street furniture', () =>
    createStreetKit(campus, registry, buildings),
  );
  const landmarks = await step('Landmarks', () => createLandmarks(campus, registry));
  const life = await step('Campus life', () => createLife(campus, registry));

  scene.add(
    ground.group,
    roads.group,
    water.group,
    buildings.group,
    vegetation.group,
    streetKit.group,
    landmarks.group,
    life.group,
  );
  scene.fog = new THREE.FogExp2(TIME_PRESETS.noon.fogColor, TIME_PRESETS.noon.fogDensity);

  const collider = new Collider(campus.buildings, campus.boundary);

  const player = new PlayerController({ camera, collider, domElement });

  // Spawn just inside the Main Gate, facing into campus.
  const gate = campus.gates?.[0];
  const centre = [
    (campus.bounds.minX + campus.bounds.maxX) / 2,
    (campus.bounds.minZ + campus.bounds.maxZ) / 2,
  ];
  if (gate) {
    const { inx: dirx, inz: dirz } = gateFrame(gate, campus.bounds);
    // camera forward at yaw is (-sin yaw, -cos yaw); face the campus centre
    player.teleport(
      new THREE.Vector3(gate.x + dirx * 28, 1.7, gate.z + dirz * 28),
      Math.atan2(-dirx, -dirz),
    );
  } else {
    player.teleport(new THREE.Vector3(centre[0], 1.7, campus.bounds.maxZ - 45), 0);
  }

  const applyTime = () => {
    const name = Settings.get('timeOfDay');
    const p = TIME_PRESETS[name] ?? TIME_PRESETS.noon;
    sky.setPreset(name);
    lighting.setPreset(name);
    scene.fog.color.set(p.fogColor);
    scene.fog.density = p.fogDensity;
    scene.background = new THREE.Color(p.skyHorizon);
  };
  applyTime();
  const onSettings = ({ key }) => {
    if (key === 'timeOfDay') applyTime();
    if (key === 'ambientLife') life.setEnabled(Settings.get('ambientLife'));
    if (key === 'fov') {
      camera.fov = Settings.get('fov');
      camera.updateProjectionMatrix();
    }
  };
  events.on('settings:change', onSettings);

  const api = {
    scene,
    camera,
    registry,
    campus,
    player,
    collider,
    buildings,
    landmarks,
    vegetation,
    lighting,
    setTimeOfDay: (name) => Settings.set('timeOfDay', name),
    setMode: (m) => player.setMode(m),
  };

  return {
    scene,
    camera,
    api,
    update(dt) {
      player.update(dt);
      lighting.updateShadowTarget(camera.position);
      water.update(dt);
      buildings.update(camera.position);
      streetKit.update(dt);
      life.update(dt);
    },
    dispose() {
      events.off('settings:change', onSettings);
      player.dispose();
      sky.dispose();
      lighting.dispose();
      ground.dispose();
      roads.dispose();
      water.dispose();
      buildings.dispose();
      vegetation.dispose();
      streetKit.dispose();
      landmarks.dispose();
      life.dispose();
      registry.disposeAll();
    },
  };
}

export { D2R };
