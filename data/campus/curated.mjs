// Hand-authored overlay on top of the OpenStreetMap export.
//
// `buildings` keys match an OSM id ("w257605000") OR a lowercased building name.
// Every field here overrides the pipeline's automatic guess.
//
// Coordinates for extraBuildings / gates are approximate, picked from satellite
// imagery — good enough for v1 per the design spec; refine in the accuracy pass.

import { ellipse, rect } from './shapes.mjs';

export default {
  buildings: {
    'central library': {
      category: 'library',
      established: 1968,
      floors: 3,
      hasInterior: true,
      accent: '#b5451f',
      description:
        'One of the major technological libraries of western India, established 1968. Sits at the centre of campus and is among its most cared-for buildings.',
    },
    'administration building': {
      category: 'admin',
      floors: 3,
      hasInterior: true,
      accent: '#3b5c8a',
      description:
        'Houses the Director, Registrar, Deans and the administrative offices of the institute.',
    },
    'lt-2': {
      category: 'academic',
      floors: 2,
      hasInterior: true,
      accent: '#7a6a52',
      description: 'Lecture Theatre complex used for first- and second-year core classes.',
    },
    'seminar hall': {
      category: 'academic',
      floors: 1,
      description: 'Seminar hall for departmental talks, presentations and vivas.',
    },
    'seminar hall lt-2': {
      category: 'academic',
      floors: 1,
      description: 'Seminar hall attached to the LT-2 lecture theatre block.',
    },
    'department of civil engineering': {
      category: 'academic',
      department: 'Civil Engineering',
      established: 1961,
      floors: 3,
      description: 'One of the founding departments of the institute (1961).',
    },
    'mechanical engineering department': {
      category: 'academic',
      department: 'Mechanical Engineering',
      established: 1961,
      floors: 3,
    },
    'electrical engineering department': {
      category: 'academic',
      department: 'Electrical Engineering',
      established: 1961,
      floors: 3,
    },
    'applied mechanics department': {
      category: 'academic',
      department: 'Applied Mechanics',
      floors: 3,
    },
    'applied science & humanities department': {
      category: 'academic',
      department: 'Applied Mathematics & Humanities',
      floors: 3,
    },
    'computer engineering department': {
      category: 'academic',
      department: 'Computer Engineering (old block)',
      floors: 3,
    },
    'new computer engineering department': {
      category: 'academic',
      department: 'Computer Engineering',
      floors: 4,
    },
    'old electronics engineering department': {
      category: 'academic',
      department: 'Electronics & Communication (old block)',
      floors: 2,
    },
    'new electronics engineering department': {
      category: 'academic',
      department: 'Electronics & Communication Engineering',
      floors: 4,
    },
    'old chemical engineering department': {
      category: 'academic',
      department: 'Chemical Engineering (old block)',
      floors: 2,
    },
    'new chemical engineering department': {
      category: 'academic',
      department: 'Chemical Engineering',
      floors: 4,
    },
    'production engineering department': {
      category: 'academic',
      department: 'Mechanical Engineering — Production wing',
      floors: 2,
    },
    'new m.sc. department': {
      category: 'academic',
      department: 'Applied Physics / Applied Chemistry / Applied Mathematics',
      floors: 3,
    },
    'central computer centre': {
      category: 'academic',
      department: 'Central Computer Centre',
      floors: 2,
    },
    'svnit workshop': {
      category: 'workshop',
      description:
        'Central workshop with machine, welding, carpentry, smithy and fitting shops for lab courses.',
    },
    'material testing lab': { category: 'lab', description: 'Structures and materials testing laboratory.' },
    'boiler lab': { category: 'lab' },
    cryogenics: { category: 'lab', department: 'Cryogenics laboratory' },
    'svnit dispensary': {
      category: 'health',
      description: 'On-campus health centre and dispensary with a resident doctor.',
    },
    'training and placement section': {
      category: 'admin',
      description: 'Coordinates campus recruitment, internships and industry relations.',
    },
    // Hostel facts: SVNIT Hostel Information Brochure 2025-26, table 1.1
    // (7 boys, 2 girls, 1 married-scholars hostel).
    'gajjar bhavan h4': {
      category: 'hostel',
      description: 'Boys hostel — 662 rooms, double/triple occupancy.',
    },
    'bhabha bhavan': {
      category: 'hostel',
      description: 'Boys hostel named after Homi J. Bhabha — 480 double rooms.',
    },
    'h- 13 swami vivekanand bhavan': {
      name: 'Swami Vivekanand Bhavan (H-13)',
      category: 'hostel',
      description: 'The largest boys hostel — 950 double rooms around courtyards.',
    },
    'tagor bhavan': {
      name: 'Tagore Bhavan',
      category: 'hostel',
      description: 'Boys hostel named after Rabindranath Tagore — 192 single/double rooms.',
    },
    'raman bhavan h10': {
      category: 'hostel',
      description: 'Family accommodation for married scholars — 98 units. Named after C. V. Raman.',
    },
    'nehru bhavan': {
      category: 'hostel',
      description: 'Boys hostel — 204 single/double rooms.',
    },
    'sarabhai bhavan': {
      category: 'hostel',
      description: 'Boys hostel named after Vikram Sarabhai — 128 double/triple rooms.',
    },
    'mother teresa bhavan-girls hostel': {
      name: 'Mother Teresa Bhavan (Girls Hostel)',
      category: 'hostel',
      established: 2009,
      description:
        'The main girls hostel, established 2009 — 800 single/double rooms, with its own mess, gym and gardens.',
    },
    // OSM multipolygon "New CRC", tagged 8 levels
    'new crc': { category: 'academic', description: 'New CRC building, eight storeys (per OpenStreetMap).' },
    // unnamed courtyard block beside Mother Teresa Bhavan
    r5379718: { name: 'Hostel Block', category: 'hostel', floors: 4, generic: true },
    'svnit guest house': {
      category: 'hostel',
      description: 'Institute guest house for visitors, parents and invited faculty.',
    },
    "director's bungalow": {
      category: 'residence',
      description: "The Director's official residence.",
    },
    // The SVNIT Canteen. OSM maps it as an unnamed building way here plus an
    // amenity=cafe node ("Canteen", @21.16438,72.78602) on top of it.
    // unnamed footprint holding OSM's 'State Bank of India' ATM node
    w361364027: {
      floors: 2,
      accent: '#22409a',
      description: 'State Bank of India branch and ATM serving the campus, near the main gate.',
    },
    w361364046: {
      name: 'SVNIT Canteen',
      category: 'dining',
      floors: 2,
      accent: '#c9873f',
      description:
        'The main campus canteen, on the edge of the academic zone — chai, samosas, thali plates and the between-lectures crowd. Marked wheelchair-accessible in OSM.',
    },
  },

  extraBuildings: [
    // (no 'Gajjar Auditorium': SVNIT holds convocations off campus at the
    // VNSGU Convention Hall, and no source shows an on-campus auditorium)
    {
      id: 'x-sac',
      name: 'Students Activity Centre',
      category: 'sports',
      levels: 2,
      footprintLatLon: [
        { lat: 21.1662, lon: 72.7843 },
        { lat: 21.1662, lon: 72.7849 },
        { lat: 21.1665, lon: 72.7849 },
        { lat: 21.1665, lon: 72.7843 },
      ],
      meta: {
        description: 'Indoor games — table tennis, badminton, carrom, chess and the gymnasium.',
        accent: '#4f8a5b',
      },
    },
  ],

  // Sports facilities — the OSM campus polygon omits the playing fields, so the
  // main grounds are placed by hand in the central open zone (local metres).
  // Unnamed OSM footprints (tagged only `building=yes`) take a generic identity
  // from where they stand. First matching rule wins; `box` is [minX, minZ,
  // maxX, maxZ] in local metres (-z = north, +x = east); `minArea` in m².
  // Generic buildings are labelled in-world but kept out of the directory.
  unnamedRules: [
    {
      // regular grid of G+1 / G+2 blocks east of the canteen
      name: 'Staff Quarters',
      category: 'residence',
      box: [140, -560, 440, -95],
      minArea: 100,
      floors: (area) => (area < 250 ? 2 : 3),
    },
    {
      name: 'Staff Quarters',
      category: 'residence',
      box: [-560, 560, -420, 640],
      minArea: 300,
      floors: 2,
    },
    {
      name: 'Academic Block',
      category: 'academic',
      box: [-320, -500, 150, 60],
      minArea: 800,
      floors: 3,
    },
    {
      // large blocks among the named Bhavans south-east of the library
      name: 'Hostel Block',
      category: 'hostel',
      box: [60, 0, 600, 620],
      minArea: 1000,
      floors: 5,
    },
    { name: 'Service Building', category: 'utility', box: [-1e4, -1e4, 1e4, 1e4], minArea: 0, floors: 1 },
  ],

  extraGrounds: [
    { name: 'Athletics & Football Ground', sport: 'athletics', footprintXZ: ellipse(70, 60, 100, 66, 28) },
    { name: 'Cricket Ground', sport: 'cricket', footprintXZ: ellipse(370, 40, 95, 95, 28) },
    { name: 'Hockey Ground', sport: 'field_hockey', footprintXZ: rect(150, 200, 92, 55) },
    { name: 'Volleyball Courts', sport: 'volleyball', footprintXZ: rect(-40, 150, 36, 20) },
  ],

  // No invented water: OSM maps none inside the campus.
  extraWater: [],

  // POIs OSM lacks inside the campus (local metres via `xz`).
  extraPois: [{ name: 'Open Air Theatre', type: 'poi', xz: [135, -10] }],

  gates: [{ name: 'Main Gate (Ichchhanath)', lat: 21.16737, lon: 72.78508, rot: 0, width: 16 }],

  zones: [
    { name: 'Academic Zone', lat: 21.1634, lon: 72.7852 },
    { name: 'Central Library Lawn', lat: 21.1639, lon: 72.7858 },
    { name: 'Hostel Zone', lat: 21.1606, lon: 72.7866 },
    { name: 'Sports Complex', lat: 21.1655, lon: 72.7844 },
    { name: 'Main Gate', lat: 21.16737, lon: 72.78508 },
  ],
};
