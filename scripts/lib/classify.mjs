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
export const LEVEL_HEIGHT = 3.4;
export const PARAPET = 1.2;

const NAME_RULES = [
  [/dispensary|hospital|health centre|health center|clinic|medical/i, 'health'],
  [/workshop|foundry|smithy/i, 'workshop'],
  [/\blab\b|laboratory|testing|boiler|cryogenics/i, 'lab'],
  [/library/i, 'library'],
  [/administration|admin building|director'?s? bungalow/i, 'admin'],
  [/canteen|cafe|mess hall|dining hall/i, 'dining'],
  [/bhavan|bhawan|hostel|dormitory|guest house/i, 'hostel'],
  [/department|dept\.?|\bLT-?\d|lecture|seminar hall|computer centre|m\.?sc/i, 'academic'],
  [/gate|entrance/i, 'gate'],
];

export function classifyBuilding({ tags = {}, name = '' } = {}) {
  if (tags.amenity === 'library') return 'library';
  if (tags.building === 'dormitory' || tags.tourism === 'hostel' || tags.guest_house === 'hostel') {
    return 'hostel';
  }
  if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') return 'dining';
  if (tags.healthcare || tags.amenity === 'clinic' || tags.amenity === 'hospital') return 'health';
  if (tags.power === 'substation') return 'utility';
  if (/^(apartments|residential|house|detached|terrace)$/.test(tags.building ?? '')) {
    return 'residence';
  }

  for (const [re, cat] of NAME_RULES) if (re.test(name)) return cat;

  if (tags.office === 'educational_institution') return 'academic';
  if (tags.building === 'office') return 'admin';
  return 'utility';
}

const DEFAULT_LEVELS = {
  academic: 4,
  admin: 3,
  library: 3,
  hostel: 5,
  workshop: 1,
  lab: 2,
  sports: 1,
  dining: 1,
  health: 2,
  utility: 1,
  residence: 2,
  gate: 1,
  amenity: 1,
};
const CATEGORY_MIN_HEIGHT = { workshop: 8, library: 12, gate: 6 };

export function estimateHeight(category, levels) {
  const lv =
    Number.isFinite(levels) && levels > 0 ? Math.round(levels) : (DEFAULT_LEVELS[category] ?? 2);
  let height = lv * LEVEL_HEIGHT + PARAPET;
  const min = CATEGORY_MIN_HEIGHT[category];
  if (min && height < min) height = min;
  return { height, levels: lv };
}
