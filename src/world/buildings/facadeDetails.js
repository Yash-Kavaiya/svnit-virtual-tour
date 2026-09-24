import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { ensureWinding } from '../../shared/polygon.mjs';

const LEVEL_HEIGHT = 3.4;

// Edge a->b of a CCW ring: unit edge direction, outward unit normal, length,
// and the Y-rotation that aligns a box's local +X with the edge direction.
function edgeInfo(a, b) {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const len = Math.hypot(ex, ez) || 1;
  const dx = ex / len;
  const dz = ez / len;
  // outward normal for a CCW ring
  const nx = dz;
  const nz = -dx;
  // rotateY(theta) maps local +X (1,0,0) to (cos theta, 0, -sin theta); we want it
  // to point along the edge (dx, 0, dz), so theta = atan2(-dz, dx).
  const rotY = Math.atan2(-dz, dx);
  return { dx, dz, nx, nz, len, rotY };
}

function boxAlongEdge(length, h, depth, cx, cy, cz, rotY) {
  // length runs along local X (the edge), depth along local Z (outward)
  const g = new THREE.BoxGeometry(length, h, depth);
  g.rotateY(rotY);
  g.translate(cx, cy, cz);
  return g;
}

function mergeOrNull(geos) {
  if (!geos.length) return null;
  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

// Real 3D architectural detail for one building: projecting RCC sunshades
// (chhajjas) at every floor line, a slim string-course, corner pilasters,
// an overhanging roof cornice and a solid parapet with a coping.
// Returns a THREE.Group of a few merged meshes (cheap to draw).
export function buildFacadeDetail(footprint, height, levels, opts = {}) {
  // courtyard rings wind clockwise so every edge normal faces into the court
  const ring = ensureWinding(footprint, !opts.courtyard);
  const n = ring.length;
  const group = new THREE.Group();
  group.name = 'facade-detail';

  const concreteMat =
    opts.concreteMat ??
    new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.9 });
  const accentMat =
    opts.accentMat ?? new THREE.MeshStandardMaterial({ color: opts.accent ?? '#a85b38', roughness: 0.85 });
  const trimMat =
    opts.trimMat ?? new THREE.MeshStandardMaterial({ color: '#c7bfae', roughness: 0.9 });

  const chajjaGeos = [];
  const bandGeos = [];
  const pilasterGeos = [];

  const lvl = Math.max(1, Math.round(levels));
  const proj = opts.chajjaProjection ?? 0.5;

  // chhajjas + string courses at each floor line above the ground floor
  for (let i = 1; i <= lvl; i++) {
    const yLine = i * LEVEL_HEIGHT;
    for (let e = 0; e < n; e++) {
      const a = ring[e];
      const b = ring[(e + 1) % n];
      const ei = edgeInfo(a, b);
      if (ei.len < 3.2) continue; // skip short edges (corner notches)
      const mx = (a[0] + b[0]) / 2;
      const mz = (a[1] + b[1]) / 2;

      // sunshade slab — inset well short of the corners so nothing juts past the wall
      chajjaGeos.push(
        boxAlongEdge(
          ei.len - 1.6,
          0.11,
          proj,
          mx + ei.nx * (proj / 2 - 0.02),
          yLine - 0.95,
          mz + ei.nz * (proj / 2 - 0.02),
          ei.rotY,
        ),
      );
      // slim accent string course, barely proud of the wall
      bandGeos.push(
        boxAlongEdge(ei.len - 1.2, 0.11, 0.08, mx + ei.nx * 0.03, yLine + 0.02, mz + ei.nz * 0.03, ei.rotY),
      );
    }
  }

  // corner pilasters — slim vertical piers proud of the wall at each vertex
  for (let e = 0; e < n; e++) {
    const v = ring[e];
    const prev = ring[(e - 1 + n) % n];
    const next = ring[(e + 1) % n];
    const e1 = edgeInfo(prev, v);
    const e2 = edgeInfo(v, next);
    let ox = e1.nx + e2.nx;
    let oz = e1.nz + e2.nz;
    const ol = Math.hypot(ox, oz) || 1;
    ox /= ol;
    oz /= ol;
    pilasterGeos.push(
      boxAlongEdge(
        0.55,
        height + 0.4,
        0.55,
        v[0] + ox * 0.06,
        (height + 0.4) / 2,
        v[1] + oz * 0.06,
        Math.atan2(ox, oz),
      ),
    );
  }

  const chajjaMesh = wrapMesh(mergeOrNull(chajjaGeos), concreteMat);
  const bandMesh = wrapMesh(mergeOrNull(bandGeos), accentMat);
  const pilasterMesh = wrapMesh(mergeOrNull(pilasterGeos), trimMat);
  if (chajjaMesh) group.add(chajjaMesh);
  if (bandMesh) group.add(bandMesh);
  if (pilasterMesh) group.add(pilasterMesh);

  // --- overhanging roof cornice + solid parapet + coping
  group.add(buildRoofCrown(ring, height, { concreteMat, trimMat, ...opts }));

  return group;
}

function wrapMesh(geo, mat) {
  if (!geo) return null;
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildRoofCrown(footprint, height, opts = {}) {
  const ring = ensureWinding(footprint, !opts.courtyard);
  const g = new THREE.Group();
  g.name = 'roof-crown';

  const concreteMat =
    opts.concreteMat ?? new THREE.MeshStandardMaterial({ color: '#c3baa7', roughness: 0.95 });

  // cornice + parapet + coping, all one material -> one merged mesh (1 draw call)
  const geos = [];
  const n = ring.length;
  for (let e = 0; e < n; e++) {
    const a = ring[e];
    const b = ring[(e + 1) % n];
    const ei = edgeInfo(a, b);
    if (ei.len < 1.0) continue;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    geos.push(
      boxAlongEdge(ei.len + 0.2, 0.26, 0.42, mx + ei.nx * 0.11, height + 0.13, mz + ei.nz * 0.11, ei.rotY),
    );
    geos.push(
      boxAlongEdge(ei.len - 0.1, 0.85, 0.18, mx - ei.nx * 0.06, height + 0.68, mz - ei.nz * 0.06, ei.rotY),
    );
    geos.push(
      boxAlongEdge(ei.len + 0.1, 0.12, 0.28, mx - ei.nx * 0.06, height + 1.16, mz - ei.nz * 0.06, ei.rotY),
    );
  }
  const crown = wrapMesh(mergeOrNull(geos), concreteMat);
  if (crown) g.add(crown);
  return g;
}

// A thin paved skirt around the building base (footprint pushed out `inset` m),
// sitting a hair above the lawn.
export function buildApron(footprint, inset = 2.4, courtyard = false) {
  const ring = ensureWinding(footprint, !courtyard);
  const geos = [];
  const n = ring.length;
  for (let e = 0; e < n; e++) {
    const a = ring[e];
    const b = ring[(e + 1) % n];
    const ei = edgeInfo(a, b);
    if (ei.len < 1.5) continue;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    geos.push(
      boxAlongEdge(ei.len + inset * 2, 0.08, inset, mx + ei.nx * (inset / 2), 0.04, mz + ei.nz * (inset / 2), ei.rotY),
    );
  }
  return mergeOrNull(geos);
}

export function buildPlinth(footprint, courtyard = false) {
  const ring = ensureWinding(footprint, !courtyard);
  const geos = [];
  const n = ring.length;
  for (let e = 0; e < n; e++) {
    const a = ring[e];
    const b = ring[(e + 1) % n];
    const ei = edgeInfo(a, b);
    if (ei.len < 0.8) continue;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    geos.push(
      boxAlongEdge(ei.len + 0.3, 0.9, 0.45, mx + ei.nx * 0.16, 0.45, mz + ei.nz * 0.16, ei.rotY),
    );
  }
  return mergeOrNull(geos);
}
