// Curated guided-tour route. Each stop names a target (a building id, a POI
// name, or explicit x/z) plus narration; resolveTour turns it into camera
// keyframes that fly from stop to stop.

export const TOUR_STOPS = [
  {
    id: 'gate',
    title: 'Main Gate',
    target: { poi: 'Main Gate' },
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
      'The Central Library, established in 1968, is one of the major technological libraries of western India and sits at the very centre of campus. Its reading halls and stacks are open to walk through.',
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
      'The sports zone has a cricket ground, an athletics and football field, hockey, and courts for basketball, volleyball and tennis, with an indoor games hall at the Students Activity Centre.',
    dwell: 5,
    height: 16,
  },
  {
    id: 'hostels',
    title: 'Hostel Zone',
    target: { poi: 'Hostel Zone' },
    narration:
      'Students live in the residential zone — hostels named for Gajjar, Bhabha, Tagore, Raman, Swami Vivekananda, Nehru and Sarabhai for the men, and Narmad Bhavan for the women, plus the institute guest house.',
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

function findTarget(t, campus, buildingsApi) {
  if (t.x !== undefined) return { x: t.x, z: t.z };
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

  for (const stop of TOUR_STOPS) {
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
