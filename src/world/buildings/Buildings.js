import * as THREE from 'three';
import { extrudeFootprint, footprintBounds } from './extrude.js';
import { facadeMaterial } from './FacadeMaterial.js';
import { populateRoof } from './RoofKit.js';
import { attachEntrance, nearestRoadPointTo } from './Entrance.js';
import { lodLevel } from './lod.js';
import { hashString } from '../../core/rng.js';
import { Settings } from '../../core/Settings.js';

const CATEGORY_COLOR = {
  academic: '#d8c7a8',
  admin: '#cdd6e0',
  library: '#e7d9be',
  hostel: '#d9cdb0',
  workshop: '#c6cace',
  lab: '#d2c3ac',
  sports: '#bcd0b8',
  dining: '#e0c9a8',
  health: '#e4c9c9',
  utility: '#cbc3b2',
  residence: '#e6dcc4',
  gate: '#d8c39c',
  amenity: '#cbc3b2',
};

export function createBuildings(campus, registry) {
  const group = new THREE.Group();
  group.name = 'buildings';
  const pickables = [];
  const byId = new Map();

  const roads = campus.roads;

  for (const b of campus.buildings) {
    const seed = hashString(b.id);
    const bgroup = new THREE.Group();
    bgroup.name = b.name;
    bgroup.userData.buildingId = b.id;

    const { w, d } = footprintBounds(b.footprint);
    const flatColor = CATEGORY_COLOR[b.category] ?? '#ccc4b3';

    // FULL
    const full = new THREE.Group();
    const wallGeo = extrudeFootprint(b.footprint, b.height);
    const facade = facadeMaterial({
      category: b.meta.facade ?? b.category,
      accent: b.meta.accent,
      seed,
      levels: b.levels,
    });
    const shell = new THREE.Mesh(wallGeo, facade);
    shell.castShadow = true;
    shell.receiveShadow = true;
    full.add(shell);

    // plinth (wider base course)
    const plinthGeo = extrudeFootprint(offsetRing(b.footprint, 0.35), 1.0);
    const plinth = new THREE.Mesh(
      plinthGeo,
      registry.mat('plinth', () => new THREE.MeshStandardMaterial({ color: '#8b8069', roughness: 0.95 })),
    );
    plinth.receiveShadow = true;
    full.add(plinth);

    populateRoof(full, {
      footprint: b.footprint,
      height: b.height,
      category: b.category,
      seed,
      registry,
    });

    let doorWorldPos;
    try {
      const target = nearestRoadPointTo(b.centroid, roads);
      const ent = attachEntrance(full, {
        footprint: b.footprint,
        height: b.height,
        name: b.name.replace(/\s*\(.*\)\s*/, ''),
        target,
        accent: b.meta.accent,
      });
      doorWorldPos = ent.doorWorldPos;
    } catch {
      doorWorldPos = new THREE.Vector3(b.centroid[0], 1.7, b.centroid[1]);
    }

    // MID — extruded shell with a cheap flat facade, no clutter
    const mid = new THREE.Mesh(
      extrudeFootprint(b.footprint, b.height),
      registry.mat(`mid-${b.category}`, () =>
        new THREE.MeshStandardMaterial({ color: flatColor, roughness: 0.9 }),
      ),
    );
    mid.castShadow = true;
    mid.userData.buildingId = b.id;

    // FAR — flat-shaded box
    const far = new THREE.Mesh(
      registry.geo('far-box', () => new THREE.BoxGeometry(1, 1, 1)),
      registry.mat(`far-${b.category}`, () =>
        new THREE.MeshLambertMaterial({ color: flatColor }),
      ),
    );
    far.scale.set(Math.max(w, 4), b.height, Math.max(d, 4));
    far.position.set(b.centroid[0], b.height / 2, b.centroid[1]);
    {
      const fb = footprintBounds(b.footprint);
      far.rotation.y = fb.angle;
    }

    bgroup.add(full, mid, far);
    mid.visible = false;
    far.visible = false;

    group.add(bgroup);
    pickables.push(mid);
    byId.set(b.id, { group: bgroup, record: b, doorWorldPos });
  }

  let frame = 0;
  const tmp = new THREE.Vector3();

  return {
    group,
    pickables,
    byId,
    update(cameraPos) {
      frame++;
      if (frame % 6 !== 0) return;
      const q = Settings.get('quality');
      for (const { group: bg, record } of byId.values()) {
        tmp.set(record.centroid[0], 0, record.centroid[1]);
        const dist = tmp.distanceTo(cameraPos);
        const level = lodLevel(dist, q);
        const [full, mid, far] = bg.children;
        full.visible = level === 'full';
        mid.visible = level === 'mid';
        far.visible = level === 'far';
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
        if (o.dispose) o.dispose();
      });
    },
  };
}

function offsetRing(ring, delta) {
  // crude outward offset via centroid scaling — fine for a short plinth course
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, z]) => {
    const dx = x - cx;
    const dz = z - cz;
    const len = Math.hypot(dx, dz) || 1;
    return [x + (dx / len) * delta, z + (dz / len) * delta];
  });
}
