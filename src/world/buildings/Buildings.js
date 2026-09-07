import * as THREE from 'three';
import { extrudeFootprint, footprintBounds } from './extrude.js';
import { facadeMaterial } from './FacadeMaterial.js';
import { buildFacadeDetail, buildRoofCrown, buildPlinth, buildApron } from './facadeDetails.js';
import { populateRoof } from './RoofKit.js';
import { attachEntrance, nearestRoadPointTo } from './Entrance.js';
import { lodLevel } from './lod.js';
import { hashString } from '../../core/rng.js';
import { Settings } from '../../core/Settings.js';

const ACCENT_MAT_CACHE = new Map();
const CONCRETE_MAT_CACHE = new Map();
function sharedMat(cache, key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

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

    const { w, d, angle } = footprintBounds(b.footprint);
    const family = b.meta.facade ?? b.category;

    const facade = facadeMaterial({ category: family, accent: b.meta.accent, seed, levels: b.levels });
    const concreteMat = sharedMat(CONCRETE_MAT_CACHE, family, () => {
      const base = new THREE.Color(facade.userData?.wallColor ?? '#d9d2c4');
      base.lerp(new THREE.Color('#8f8676'), 0.42); // weathered RCC, not glaring white
      return new THREE.MeshStandardMaterial({ color: base, roughness: 0.96 });
    });
    const accentMat = sharedMat(ACCENT_MAT_CACHE, b.meta.accent ?? family, () =>
      new THREE.MeshStandardMaterial({ color: b.meta.accent ?? '#a8542f', roughness: 0.85 }),
    );
    const trimMat = sharedMat(CONCRETE_MAT_CACHE, `trim-${family}`, () =>
      new THREE.MeshStandardMaterial({ color: '#c7bfae', roughness: 0.9 }),
    );
    const plinthMat = registry.mat('plinth', () =>
      new THREE.MeshStandardMaterial({ color: '#6f6252', roughness: 0.95 }),
    );
    // roof cap gets its own weathered-concrete slab material — the facade
    // texture smeared across a roof read as a muddy void from above.
    const roofSlabMat = registry.mat('roof-slab', () =>
      new THREE.MeshStandardMaterial({ color: '#b0a996', roughness: 0.97 }),
    );

    // ---- FULL: shell + 3D detail + plinth + roof clutter + entrance
    const full = new THREE.Group();
    const shell = new THREE.Mesh(extrudeFootprint(b.footprint, b.height), [facade, roofSlabMat]);
    shell.castShadow = true;
    shell.receiveShadow = true;
    full.add(shell);

    full.add(
      buildFacadeDetail(b.footprint, b.height, b.levels, {
        concreteMat,
        accentMat,
        trimMat,
        copingMat: trimMat,
        accent: b.meta.accent,
      }),
    );

    const plinthGeo = buildPlinth(b.footprint);
    if (plinthGeo) {
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.receiveShadow = true;
      full.add(plinth);
    }

    populateRoof(full, {
      footprint: b.footprint,
      height: b.height,
      category: b.category,
      seed,
      registry,
    });

    // paved apron around the base so buildings don't float on grass
    const apronGeo = buildApron(b.footprint, 2.4);
    if (apronGeo) {
      const apron = new THREE.Mesh(
        apronGeo,
        registry.mat('apron', () => new THREE.MeshStandardMaterial({ color: '#b3aa97', roughness: 1 })),
      );
      apron.receiveShadow = true;
      full.add(apron);
    }

    let doorWorldPos;
    try {
      const target = nearestRoadPointTo(b.centroid, roads);
      const ent = attachEntrance(full, {
        footprint: b.footprint,
        height: b.height,
        name: b.name.replace(/\s*\(.*\)\s*/, ''),
        target,
        accent: b.meta.accent,
        category: b.category,
      });
      doorWorldPos = ent.doorWorldPos;
    } catch {
      doorWorldPos = new THREE.Vector3(b.centroid[0], 1.7, b.centroid[1]);
    }

    // ---- MID: same facade material + roof crown only (no chajjas/clutter)
    const mid = new THREE.Group();
    const midShell = new THREE.Mesh(extrudeFootprint(b.footprint, b.height), [facade, roofSlabMat]);
    midShell.castShadow = true;
    mid.add(midShell);
    mid.add(buildRoofCrown(b.footprint, b.height, { concreteMat, copingMat: trimMat }));

    // ---- non-rendering raycast proxy
    const pick = new THREE.Mesh(
      registry.geo('pick-box', () => new THREE.BoxGeometry(1, 1, 1)),
      registry.mat('pick-mat', () => new THREE.MeshBasicMaterial({ visible: false })),
    );
    pick.scale.set(Math.max(w, 4), b.height, Math.max(d, 4));
    pick.position.set(b.centroid[0], b.height / 2, b.centroid[1]);
    pick.rotation.y = angle;
    pick.userData.buildingId = b.id;

    bgroup.add(full, mid, pick);
    full.visible = false;
    mid.visible = true;

    group.add(bgroup);
    pickables.push(pick);
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
      if (frame % 4 !== 0) return;
      const q = Settings.get('quality');
      for (const { group: bg, record } of byId.values()) {
        tmp.set(record.centroid[0], 0, record.centroid[1]);
        const dist = tmp.distanceTo(cameraPos);
        const level = lodLevel(dist, q);
        const [full, mid] = bg.children;
        full.visible = level === 'full';
        mid.visible = level === 'mid';
        bg.visible = dist < 1800;
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
      });
      for (const m of ACCENT_MAT_CACHE.values()) m.dispose();
      for (const m of CONCRETE_MAT_CACHE.values()) m.dispose();
      ACCENT_MAT_CACHE.clear();
      CONCRETE_MAT_CACHE.clear();
    },
  };
}
