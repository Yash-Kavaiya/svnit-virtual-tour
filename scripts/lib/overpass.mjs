import { stitchRings, pointInRing } from '../../src/shared/polygon.mjs';
// Turn a raw Overpass JSON export into typed feature lists (still in lat/lon).

const isClosed = (g) => Array.isArray(g) && g.length >= 4;

const llEq = (p, q) => Math.abs(p.lat - q.lat) < 1e-9 && Math.abs(p.lon - q.lon) < 1e-9;
const llArea = (r) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i];
    const q = r[(i + 1) % r.length];
    a += p.lon * q.lat - q.lon * p.lat;
  }
  return Math.abs(a / 2);
};
const close = (r) => [...r, r[0]];

// Stitch a multipolygon's member ways (Overpass `out geom`) into its largest
// outer ring and the inner rings that sit inside it, all closed, in lat/lon.
function relationRings(members) {
  const lines = (role) =>
    members
      .filter((m) => m.type === 'way' && (m.role || 'outer') === role && Array.isArray(m.geometry))
      .map((m) => m.geometry.map((p) => ({ lat: p.lat, lon: p.lon })));
  const outers = stitchRings(lines('outer'), llEq);
  if (!outers.length) return null;
  const outer = outers.reduce((a, b) => (llArea(b) > llArea(a) ? b : a));
  const toXY = (p) => [p.lon, p.lat];
  const holes = stitchRings(lines('inner'), llEq).filter((h) =>
    pointInRing(toXY(h[0]), outer.map(toXY)),
  );
  return { outer: close(outer), holes: holes.map(close) };
}

const geomOf = (e) => {
  if (Array.isArray(e.geometry)) return e.geometry.map((p) => ({ lat: p.lat, lon: p.lon }));
  if (Number.isFinite(e.lat) && Number.isFinite(e.lon)) return [{ lat: e.lat, lon: e.lon }];
  return [];
};

export function parseOverpass(json) {
  const els = json.elements ?? [];

  const boundaryEl = els.find(
    (e) =>
      e.tags?.amenity === 'university' &&
      /sardar vallabhbhai|svnit|s\.?v\.?n\.?i\.?t/i.test(e.tags?.name ?? '') &&
      Array.isArray(e.geometry) &&
      e.geometry.length >= 3,
  );

  const out = {
    boundary: boundaryEl
      ? { id: boundaryEl.id, tags: boundaryEl.tags, geometry: geomOf(boundaryEl) }
      : null,
    buildings: [],
    roads: [],
    water: [],
    greens: [],
    grounds: [],
    pois: [],
  };

  for (const e of els) {
    if (e === boundaryEl) continue;
    const t = e.tags ?? {};
    const g = geomOf(e);
    const f = { id: `${e.type[0]}${e.id}`, tags: t, geometry: g, name: t.name };

    // multipolygon building: largest outer ring + inner rings (courtyards)
    if (e.type === 'relation' && t.building && Array.isArray(e.members)) {
      const mp = relationRings(e.members);
      if (mp) out.buildings.push({ ...f, geometry: mp.outer, holes: mp.holes });
      continue;
    }

    if (t.building && isClosed(g)) {
      out.buildings.push(f);
    } else if (t.highway && g.length >= 2) {
      out.roads.push({ ...f, klass: t.highway });
    } else if ((t.natural === 'water' || t.water) && isClosed(g)) {
      out.water.push(f);
    } else if (
      ['park', 'garden', 'grass', 'forest', 'nature_reserve'].includes(t.leisure) ||
      ['grass', 'forest', 'meadow', 'recreation_ground', 'village_green'].includes(t.landuse)
    ) {
      if (isClosed(g)) out.greens.push({ ...f, kind: t.leisure || t.landuse });
    } else if (['pitch', 'sports_centre', 'track', 'stadium'].includes(t.leisure)) {
      if (isClosed(g)) out.grounds.push({ ...f, sport: t.sport });
      else if (g.length === 1 && t.name) {
        out.pois.push({ id: f.id, name: t.name, type: 'ground', lat: g[0].lat, lon: g[0].lon });
      }
    } else if (e.type === 'node' && t.name) {
      const type = t.memorial
        ? 'statue'
        : t.historic === 'memorial'
          ? 'statue'
          : t.amenity === 'place_of_worship'
            ? 'temple'
            : (t.amenity ?? t.tourism ?? t.shop ?? t.man_made ?? 'poi');
      out.pois.push({ id: f.id, name: t.name, type, lat: g[0]?.lat, lon: g[0]?.lon });
    }
  }

  return out;
}
