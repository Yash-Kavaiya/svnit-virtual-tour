import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeProjector } from './lib/geo.mjs';
import { parseOverpass } from './lib/overpass.mjs';
import { classifyBuilding, estimateHeight } from './lib/classify.mjs';
import {
  dedupeRing,
  simplifyRing,
  ensureWinding,
  ringCentroid,
  ringArea,
  pointInRing,
  longestEdgeAngle,
  convexHull,
  orientedBox,
  clampOrientedBox,
} from '../src/shared/polygon.mjs';
import { validateCampusData } from '../src/data/schema.mjs';

const FACADE_BY_CATEGORY = {
  academic: 'academic',
  admin: 'admin',
  library: 'library',
  hostel: 'hostel',
  workshop: 'workshop',
  lab: 'academic',
  sports: 'utility',
  dining: 'utility',
  health: 'academic',
  utility: 'utility',
  residence: 'residence',
  gate: 'gate',
  amenity: 'utility',
};

const ACCENT_BY_CATEGORY = {
  academic: '#b06a3a',
  admin: '#3b5c8a',
  library: '#b5451f',
  hostel: '#6d7f52',
  workshop: '#8a8f98',
  lab: '#9a6b4a',
  sports: '#4f8a5b',
  dining: '#c9873f',
  health: '#c65b5b',
  utility: '#7d7d7d',
  residence: '#a98d5f',
  gate: '#8a5a3b',
  amenity: '#7d7d7d',
};

const ROAD_WIDTH = {
  motorway: 9,
  trunk: 8,
  primary: 7,
  secondary: 5.5,
  tertiary: 5,
  residential: 4.5,
  unclassified: 4,
  living_street: 4,
  service: 4,
  pedestrian: 3,
  footway: 2,
  path: 1.6,
  track: 3,
  cycleway: 2,
  steps: 1.4,
};

const nameKey = (s) => (s ?? '').trim().toLowerCase();

function round(n, p = 2) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

function bboxSides(ring) {
  const a = longestEdgeAngle(ring);
  const [cx, cz] = ringCentroid(ring);
  const c = Math.cos(-a);
  const s = Math.sin(-a);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    const dx = x - cx;
    const dz = z - cz;
    const rx = dx * c - dz * s;
    const rz = dx * s + dz * c;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minZ = Math.min(minZ, rz);
    maxZ = Math.max(maxZ, rz);
  }
  return [maxX - minX, maxZ - minZ];
}

// Clean noisy / concave / hollow OSM footprints into convex prisms that
// extrude without triangulation artifacts. Courtyard detail is traded for
// robustness, which the spec permits for v1.
function sanitizeFootprint(ring) {
  let r = simplifyRing(ensureWinding(dedupeRing(ring), true), 1.6);
  if (r.length < 3) return null;

  const area = Math.abs(ringArea(r));
  const [w, d] = bboxSides(r);
  const bboxArea = w * d;
  const spread = bboxArea / Math.max(area, 1);

  if (r.length > 14 || spread > 2.2 || Math.max(w, d) > 85) {
    r = simplifyRing(convexHull(r), 1.2);
  }
  const [w2, d2] = bboxSides(r);
  if (Math.max(w2, d2) > 110 || r.length > 16) {
    r = clampOrientedBox(r, 96, 62);
  }
  r = simplifyRing(ensureWinding(dedupeRing(r), true), 1.0);
  if (r.length < 3 || Math.abs(ringArea(r)) < 20) {
    // last resort: a modest oriented box
    r = orientedBox(ring);
    if (Math.abs(ringArea(r)) < 20) return null;
  }
  return r;
}

export function buildCampus(overpassJson, opts = {}) {
  const parsed = parseOverpass(overpassJson);
  if (!parsed.boundary) throw new Error('campus boundary polygon not found in Overpass data');
  const curated = opts.curated ?? { buildings: {}, extraBuildings: [], gates: [], zones: [] };

  // Origin = centroid of the boundary polygon; all metres are relative to it.
  const bLL = parsed.boundary.geometry;
  const originLL = {
    lat: bLL.reduce((s, p) => s + p.lat, 0) / bLL.length,
    lon: bLL.reduce((s, p) => s + p.lon, 0) / bLL.length,
  };
  const proj = makeProjector(originLL);
  const toRing = (llArr) => dedupeRing(llArr.map((p) => proj.toXZ(p)));
  const boundary = simplifyRing(ensureWinding(toRing(bLL), true), 1.0);

  // Clip ring: boundary pushed ~30 m outward from its centroid.
  const bc = ringCentroid(boundary);
  const clipRing = boundary.map(([x, z]) => {
    const dx = x - bc[0];
    const dz = z - bc[1];
    const d = Math.hypot(dx, dz) || 1;
    return [x + (dx / d) * 30, z + (dz / d) * 30];
  });
  const centroidInCampus = (ring) => pointInRing(ringCentroid(ring), clipRing);

  const curatedFor = (id, name) =>
    curated.buildings?.[id] ?? curated.buildings?.[nameKey(name)] ?? {};

  const buildings = [];
  const pushBuilding = (id, name, ringXZ, tags, levelsHint, curatedMeta) => {
    const ring = sanitizeFootprint(ringXZ);
    if (!ring) return; // degenerate
    if (!centroidInCampus(ring)) return;

    const cur = curatedMeta ?? curatedFor(id, name);
    const category = cur.category ?? classifyBuilding({ tags: tags ?? {}, name });
    const lvHint = cur.floors ?? levelsHint ?? Number(tags?.['building:levels']);
    const { height, levels } = estimateHeight(category, lvHint);

    buildings.push({
      id,
      name: cur.name ?? name ?? '(unnamed building)',
      category,
      footprint: ring.map(([x, z]) => [round(x), round(z)]),
      centroid: ringCentroid(ring).map((v) => round(v)),
      height: round(height),
      levels,
      orientation: round(longestEdgeAngle(ring), 4),
      meta: {
        department: cur.department,
        established: cur.established,
        floors: levels,
        description: cur.description,
        facade: cur.facade ?? FACADE_BY_CATEGORY[category] ?? 'utility',
        accent: cur.accent ?? ACCENT_BY_CATEGORY[category] ?? '#888888',
        roof: cur.roof ?? (category === 'workshop' ? 'sawtooth' : 'flat'),
        hasInterior: Boolean(cur.hasInterior),
      },
    });
  };

  for (const b of parsed.buildings) {
    pushBuilding(
      b.id,
      b.name,
      b.geometry.map((p) => proj.toXZ(p)),
      b.tags,
    );
  }
  for (const xb of curated.extraBuildings ?? []) {
    pushBuilding(
      xb.id,
      xb.name,
      xb.footprintLatLon.map((p) => proj.toXZ(p)),
      { 'building:levels': xb.levels },
      xb.levels,
      { ...(xb.meta ?? {}), category: xb.category, name: xb.name, floors: xb.levels },
    );
  }
  buildings.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Clip road polylines to the campus: keep only runs of segments whose
  // midpoint lies inside the actual boundary (no buffer), emit each run as its
  // own road, and drop stub runs shorter than 12 m.
  const runLength = (run) => {
    let d = 0;
    for (let i = 0; i < run.length - 1; i++) {
      d += Math.hypot(run[i + 1][0] - run[i][0], run[i + 1][1] - run[i][1]);
    }
    return d;
  };
  const roads = [];
  for (const r of parsed.roads) {
    const pts = r.geometry.map((p) => proj.toXZ(p).map((v) => round(v)));
    const width = ROAD_WIDTH[r.klass] ?? 4;
    let run = [];
    const flush = () => {
      if (run.length >= 2 && runLength(run) >= 12) {
        roads.push({ class: r.klass, width, path: run });
      }
      run = [];
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (pointInRing(mid, boundary)) {
        if (run.length === 0) run.push(a);
        run.push(b);
      } else {
        flush();
      }
    }
    flush();
  }

  const clipPoly = (llArr) => {
    const ring = simplifyRing(
      ensureWinding(dedupeRing(llArr.map((p) => proj.toXZ(p))), true),
      0.8,
    ).map((p) => p.map((v) => round(v)));
    return ring.length >= 3 && centroidInCampus(ring) ? ring : null;
  };

  // Curated grounds/water are trusted: accept `footprintXZ` (local metres) or
  // `footprintLatLon`, and skip the campus clip.
  const curatedRing = (item) => {
    const xz = item.footprintXZ
      ? item.footprintXZ.map(([x, z]) => [x, z])
      : item.footprintLatLon.map((p) => proj.toXZ(p));
    return ensureWinding(dedupeRing(xz), true).map((p) => p.map((v) => round(v)));
  };

  const water = [
    ...parsed.water.map((w) => ({ name: w.name, polygon: clipPoly(w.geometry) })),
    ...(curated.extraWater ?? []).map((w) => ({ name: w.name, polygon: curatedRing(w) })),
  ].filter((w) => w.polygon && w.polygon.length >= 3);

  const greens = parsed.greens
    .map((g) => ({ kind: g.kind, polygon: clipPoly(g.geometry) }))
    .filter((g) => g.polygon);

  const grounds = [
    ...parsed.grounds.map((g) => ({ name: g.name, sport: g.sport, polygon: clipPoly(g.geometry) })),
    ...(curated.extraGrounds ?? []).map((g) => ({
      name: g.name,
      sport: g.sport,
      polygon: curatedRing(g),
    })),
  ].filter((g) => g.polygon && g.polygon.length >= 3);

  const pois = parsed.pois
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => {
      const [x, z] = proj.toXZ(p);
      return { name: p.name, type: p.type, x: round(x), z: round(z), rot: 0 };
    })
    .filter((p) => pointInRing([p.x, p.z], clipRing))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const z of curated.zones ?? []) {
    const [x, zz] = proj.toXZ(z);
    pois.push({ name: z.name, type: 'zone', x: round(x), z: round(zz), rot: 0 });
  }
  for (const p of curated.extraPois ?? []) {
    const xz = p.xz ?? proj.toXZ(p);
    pois.push({ name: p.name, type: p.type ?? 'poi', x: round(xz[0]), z: round(xz[1]), rot: p.rot ?? 0 });
  }

  const gates = (curated.gates ?? []).map((g) => {
    const [x, z] = proj.toXZ(g);
    return { name: g.name, x: round(x), z: round(z), rot: g.rot ?? 0, width: g.width ?? 12 };
  });

  const xs = boundary.map((p) => p[0]);
  const zs = boundary.map((p) => p[1]);
  const campus = {
    origin: { lat: round(originLL.lat, 7), lon: round(originLL.lon, 7) },
    bounds: {
      minX: round(Math.min(...xs)),
      maxX: round(Math.max(...xs)),
      minZ: round(Math.min(...zs)),
      maxZ: round(Math.max(...zs)),
    },
    boundary: boundary.map((p) => p.map((v) => round(v))),
    buildings,
    roads,
    water,
    greens,
    grounds,
    pois,
    gates,
  };

  const v = validateCampusData(campus);
  if (!v.ok) throw new Error('campus data invalid:\n' + v.errors.join('\n'));
  return campus;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(new URL('../data/osm/overpass-raw.json', import.meta.url)));
  const curated = (await import('../data/campus/curated.mjs')).default;
  const campus = buildCampus(raw, { curated });
  const outfile = new URL('../src/data/campus.generated.json', import.meta.url);
  writeFileSync(outfile, JSON.stringify(campus, null, 1));
  const counts = {
    buildings: campus.buildings.length,
    roads: campus.roads.length,
    water: campus.water.length,
    greens: campus.greens.length,
    grounds: campus.grounds.length,
    pois: campus.pois.length,
    gates: campus.gates.length,
  };
  console.log('campus.generated.json written:', JSON.stringify(counts));
  const named = campus.buildings.filter((b) => !b.name.startsWith('(unnamed'));
  console.log(`named buildings: ${named.length} / ${campus.buildings.length}`);
}
