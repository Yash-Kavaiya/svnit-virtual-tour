export const CATEGORIES = [
  'academic',
  'admin',
  'library',
  'hostel',
  'workshop',
  'lab',
  'sports',
  'dining',
  'health',
  'utility',
  'residence',
  'gate',
  'amenity',
];

const isVec2 = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isRing = (r, min = 3) => Array.isArray(r) && r.length >= min && r.every(isVec2);

export function validateCampusData(o) {
  const errors = [];
  if (!o || typeof o !== 'object') return { ok: false, errors: ['not an object'] };

  if (!o.origin || !Number.isFinite(o.origin.lat) || !Number.isFinite(o.origin.lon)) {
    errors.push('origin missing or invalid');
  }
  for (const k of ['minX', 'maxX', 'minZ', 'maxZ']) {
    if (!Number.isFinite(o.bounds?.[k])) errors.push(`bounds.${k} invalid`);
  }
  if (!isRing(o.boundary)) errors.push('boundary invalid');

  if (!Array.isArray(o.buildings)) {
    errors.push('buildings not an array');
  } else {
    for (const b of o.buildings) {
      if (!b.id) errors.push('building.id missing');
      if (!CATEGORIES.includes(b.category)) {
        errors.push(`building ${b.id} bad category "${b.category}"`);
      }
      if (!isRing(b.footprint)) errors.push(`building ${b.id} footprint invalid`);
      if (b.holes !== undefined && !(Array.isArray(b.holes) && b.holes.every((h) => isRing(h)))) {
        errors.push(`building ${b.id} holes invalid`);
      }
      if (!isVec2(b.centroid)) errors.push(`building ${b.id} centroid invalid`);
      if (!(b.height > 0)) errors.push(`building ${b.id} height invalid`);
      if (!Number.isFinite(b.levels) || b.levels < 1) errors.push(`building ${b.id} levels invalid`);
      if (!b.meta || typeof b.meta !== 'object') errors.push(`building ${b.id} meta missing`);
    }
  }

  for (const key of ['roads', 'water', 'greens', 'grounds', 'pois', 'gates']) {
    if (!Array.isArray(o[key])) errors.push(`${key} not an array`);
  }
  for (const r of o.roads ?? []) {
    if (!isRing(r.path, 2)) errors.push('road path invalid');
    if (!(r.width > 0)) errors.push('road width invalid');
  }
  for (const w of o.water ?? []) if (!isRing(w.polygon)) errors.push('water polygon invalid');
  for (const g of o.greens ?? []) if (!isRing(g.polygon)) errors.push('green polygon invalid');
  for (const g of o.grounds ?? []) if (!isRing(g.polygon)) errors.push('ground polygon invalid');
  for (const p of o.pois ?? []) {
    if (typeof p.name !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.z)) {
      errors.push('poi invalid');
    }
  }
  for (const g of o.gates ?? []) {
    if (typeof g.name !== 'string' || !Number.isFinite(g.x) || !Number.isFinite(g.z)) {
      errors.push('gate invalid');
    }
  }

  return { ok: errors.length === 0, errors };
}
