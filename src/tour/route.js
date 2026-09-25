// Curated guided-tour route. Each stop names a target (a building id, a POI
// name, or explicit x/z) plus narration; resolveTour turns it into camera
// keyframes that fly from stop to stop.

export const TOUR_STOPS = [
  {
    id: 'gate',
    title: 'Old Gate (Ichchhanath)',
    target: { poi: 'Old Gate' },
    narration:
      'Welcome to the Sardar Vallabhbhai National Institute of Technology, Surat — SVNIT. Founded in 1961 as a Regional Engineering College and an NIT since 2002, the institute sits on a green 250-acre campus off Dumas Road, beside the Tapi river.',
    dwell: 6,
    height: 6,
  },
  {
    id: 'statue',
    title: 'Sardar Patel Statue',
    target: { poi: 'Sardar Vallabhbhai Statue' },
    narration:
      'Just inside the gate stands a statue of Sardar Vallabhbhai Patel, the "Iron Man of India", after whom the institute is named. The tree-lined central avenue runs from here into the academic zone.',
    dwell: 5,
    height: 5,
  },
  {
    id: 'new-gate',
    title: 'New Gate (Dumas Road)',
    target: { poi: 'New Gate' },
    narration:
      'The campus road runs west from the statue to the new gate on the Dumas Road junction — a long red wall carrying the institute name in Hindi and English beneath the big SVNIT letters, with the emblem on a red pillar beside it.',
    dwell: 5,
    height: 5,
  },
  {
    id: 'admin',
    title: 'Administration Building',
    target: { building: /administration/i },
    narration:
      'The Administration Building houses the Director, Registrar and Deans. Step inside from the info panel to see the lobby, notice boards and the wall of past directors.',
    dwell: 5,
    height: 5,
    enterInterior: 'admin',
  },
  {
    id: 'library',
    title: 'Central Library',
    target: { building: /central library/i },
    narration:
      'The Central Library, established in 1968, sits at the centre of campus with over a lakh print books, eleven thousand e-books and access to more than 7,700 online journals. Its reading halls and stacks are open to walk through.',
    dwell: 5,
    height: 5,
    enterInterior: 'library',
  },
  {
    id: 'academic',
    title: 'Academic Zone',
    target: { poi: 'Academic Zone' },
    narration:
      'Around the central lawn are the engineering departments — Civil and Mechanical among the oldest, alongside Electrical, Electronics & Communication, Computer Engineering, Chemical, Applied Mechanics and the Applied Sciences.',
    dwell: 6,
    height: 12,
  },
  {
    id: 'canteen',
    title: 'Campus Canteen',
    target: { building: /canteen/i },
    narration:
      'On the edge of the academic zone is the campus canteen — chai, samosas and thali plates, and where most of the campus ends up between lectures.',
    dwell: 4,
    height: 5,
  },
  {
    id: 'lt',
    title: 'Lecture Theatre',
    target: { building: /lt-2|lecture/i },
    narration:
      'First- and second-year classes are held in the lecture theatre complex — tiered halls with projection screens and the ceiling fans every Indian classroom needs.',
    dwell: 5,
    height: 4,
    enterInterior: 'lecture-hall',
  },
  {
    id: 'workshop',
    title: 'Central Workshop',
    target: { building: /workshop/i },
    narration:
      'The Central Workshop — machine, welding, carpentry and fitting shops — gives every engineering student hands-on lab courses in their first years.',
    dwell: 4,
    height: 6,
  },
  {
    id: 'sports',
    title: 'Sports Complex',
    target: { poi: 'Sports Complex' },
    narration:
      'At the heart of the campus lies the vast student activity ground — some twelve hectares of open field — with basketball and tennis courts beside it, and table tennis and badminton indoors at the Student Activity Centre.',
    dwell: 5,
    height: 16,
  },
  {
    id: 'hostels',
    title: 'Hostel Zone',
    target: { poi: 'Hostel Zone' },
    narration:
      'SVNIT is fully residential: ten hostels house over 5,000 students — seven for men (Gajjar, Bhabha, Tagore, Nehru, Swami Vivekanand, Sarabhai and Atal Bihari Vajpayee Bhavan), Mother Teresa and Narmad Bhavan for women, and Raman Bhavan for married scholars.',
    dwell: 6,
    height: 14,
  },
  {
    id: 'aerial',
    title: 'The Campus',
    target: { poi: 'Central Library Lawn' },
    narration:
      'That completes the tour of SVNIT Surat. Press "Exit tour" to explore freely on foot, or use the building directory to jump anywhere on campus.',
    dwell: 8,
    height: 90,
    orbit: true,
  },
];

const CATEGORY_LABEL = {
  academic: 'an academic block',
  admin: 'an administrative building',
  library: 'the library',
  hostel: 'a hostel',
  workshop: 'a workshop',
  lab: 'a laboratory',
  sports: 'a sports facility',
  dining: 'a dining hall',
  health: 'the health centre',
  utility: 'a service building',
  residence: 'a residence',
  amenity: 'a campus amenity',
};

const GROUP_NARRATION = {
  'Staff Quarters':
    'Faculty and staff live on campus too — the staff quarters are rows of two- and three-storey residential blocks set among trees.',
  'Academic Block': 'Several more academic blocks fill out the academic zone around the departments.',
  'Hostel Block': 'Beside the named Bhavans stand further hostel blocks, built around their own courtyards.',
  'Service Building':
    'Smaller service buildings — stores, plant rooms and pump houses — keep the campus running.',
};

function narrationFor(b) {
  if (b.meta?.description) return `${b.name}. ${b.meta.description}`;
  const parts = [`${b.name} is ${CATEGORY_LABEL[b.category] ?? 'a campus building'}`];
  if (b.meta?.department) parts.push(`home to ${b.meta.department}`);
  let text = parts.join(', ');
  if (b.meta?.established) text += `, dating from ${b.meta.established}`;
  return `${text} — ${b.levels} storey${b.levels === 1 ? '' : 's'} tall.`;
}

// Order stops so each hop goes to the nearest unvisited building.
function nearestOrder(items, start) {
  const left = [...items];
  const out = [];
  let [x, z] = start;
  while (left.length) {
    let bi = 0;
    let bd = Infinity;
    left.forEach((b, i) => {
      const d = Math.hypot(b.centroid[0] - x, b.centroid[1] - z);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const [b] = left.splice(bi, 1);
    out.push(b);
    [x, z] = b.centroid;
  }
  return out;
}

// The full route: the curated narrated stops, then every other named
// building (and one example of each generic type) in walking order, then
// the closing aerial view.
export function buildTourStops(campus) {
  const curated = TOUR_STOPS.map((stop) => {
    if (!stop.target.building) return stop;
    const b = campus.buildings.find((q) => stop.target.building.test(q.name));
    return b ? { ...stop, coversId: b.id } : stop;
  });
  const covered = new Set(curated.map((s) => s.coversId).filter(Boolean));
  const named = campus.buildings.filter(
    (b) => !b.meta?.generic && !b.name.startsWith('(unnamed') && !covered.has(b.id),
  );
  const groups = new Map();
  for (const b of campus.buildings.filter((q) => q.meta?.generic)) {
    if (!groups.has(b.name)) groups.set(b.name, []);
    groups.get(b.name).push(b);
  }
  const examples = [...groups.values()].map((list) => {
    const cx = list.reduce((s, b) => s + b.centroid[0], 0) / list.length;
    const cz = list.reduce((s, b) => s + b.centroid[1], 0) / list.length;
    return list.reduce((a, b) =>
      Math.hypot(b.centroid[0] - cx, b.centroid[1] - cz) < Math.hypot(a.centroid[0] - cx, a.centroid[1] - cz) ? b : a,
    );
  });

  const finale = curated.at(-1);
  const body = curated.slice(0, -1);
  const lastTarget = findTarget(body.at(-1).target, campus, null) ?? { x: 0, z: 0 };
  const extra = nearestOrder([...named, ...examples], [lastTarget.x, lastTarget.z]).map((b) => ({
    id: `b-${b.id}`,
    title: b.name,
    target: { id: b.id },
    narration: b.meta?.generic ? (GROUP_NARRATION[b.name] ?? narrationFor(b)) : narrationFor(b),
    dwell: 3.5,
    height: Math.max(5, Math.min(14, b.height * 0.6)),
  }));
  return [...body, ...extra, finale];
}

function findTarget(t, campus, buildingsApi) {
  if (t.x !== undefined) return { x: t.x, z: t.z };
  if (t.id) {
    const b = campus.buildings.find((q) => q.id === t.id);
    if (b) {
      const door = buildingsApi?.byId.get(b.id)?.doorWorldPos;
      return door ? { x: door.x, z: door.z, centroid: b.centroid } : { x: b.centroid[0], z: b.centroid[1] };
    }
  }
  if (t.poi) {
    const p = campus.pois.find((q) => q.name.toLowerCase().includes(t.poi.toLowerCase()));
    if (p) return { x: p.x, z: p.z };
  }
  if (t.building) {
    const b = campus.buildings.find((q) => t.building.test(q.name));
    if (b) {
      const entry = buildingsApi?.byId.get(b.id);
      const door = entry?.doorWorldPos;
      return door ? { x: door.x, z: door.z, centroid: b.centroid } : { x: b.centroid[0], z: b.centroid[1] };
    }
  }
  return null;
}

export function resolveTour(campus, buildingsApi) {
  const centre = [
    (campus.bounds.minX + campus.bounds.maxX) / 2,
    (campus.bounds.minZ + campus.bounds.maxZ) / 2,
  ];
  const resolved = [];
  let prev = { pos: [centre[0], 40, campus.bounds.maxZ], look: [centre[0], 0, centre[1]] };

  for (const stop of buildTourStops(campus)) {
    const tgt = findTarget(stop.target, campus, buildingsApi) ?? { x: centre[0], z: centre[1] };
    const towards = tgt.centroid ? { x: tgt.centroid[0], z: tgt.centroid[1] } : { x: centre[0], z: centre[1] };
    // framing position: stand back from the target toward the campus centre
    const dx = towards.x - tgt.x;
    const dz = towards.z - tgt.z;
    const l = Math.hypot(dx, dz) || 1;
    const back = stop.orbit ? 4 : Math.max(14, stop.height * 1.1);
    const camPos = [tgt.x - (dx / l) * back, stop.height, tgt.z - (dz / l) * back];
    const look = [tgt.x, Math.min(stop.height * 0.4, 6), tgt.z];

    const travel = Math.max(2.5, Math.min(7, Math.hypot(camPos[0] - prev.pos[0], camPos[2] - prev.pos[2]) / 45));
    const keys = [
      { t: 0, pos: prev.pos, look: prev.look },
      { t: travel * 0.5, pos: midHop(prev.pos, camPos, stop.height), look: look },
      { t: travel, pos: camPos, look },
    ];

    resolved.push({
      id: stop.id,
      title: stop.title,
      narration: stop.narration,
      keys,
      dwell: stop.dwell,
      orbit: stop.orbit ? { centre: [tgt.x, tgt.z], radius: back + 40, height: stop.height } : null,
      enterInterior: stop.enterInterior ?? null,
    });
    prev = { pos: camPos, look };
  }
  return resolved;
}

function midHop(a, b, h) {
  return [(a[0] + b[0]) / 2, Math.max(a[1], b[1], h) + 8, (a[2] + b[2]) / 2];
}
