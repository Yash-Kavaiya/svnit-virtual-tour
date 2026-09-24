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
    'gajjar bhavan h4': {
      category: 'hostel',
      description: 'First-year boys hostel (Hostel 4).',
    },
    'bhabha bhavan': { category: 'hostel', description: 'Boys hostel, named after Homi J. Bhabha.' },
    'h- 13 swami vivekanand bhavan': {
      category: 'hostel',
      description: 'Nine-storey boys hostel (Hostel 13), the tallest residence on campus.',
    },
    'tagor bhavan': {
      category: 'hostel',
      description: 'Boys hostel, named after Rabindranath Tagore.',
    },
    'raman bhavan h10': {
      category: 'hostel',
      description: 'Boys hostel (Hostel 10), named after C. V. Raman.',
    },
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
    {
      id: 'x-narmad',
      name: 'Narmad Bhavan (Girls Hostel)',
      category: 'hostel',
      levels: 5,
      footprintLatLon: [
        { lat: 21.1594, lon: 72.787 },
        { lat: 21.1594, lon: 72.7878 },
        { lat: 21.1598, lon: 72.7878 },
        { lat: 21.1598, lon: 72.787 },
      ],
      meta: {
        description: 'Girls hostel for all departments, named after the Gujarati poet Narmad.',
      },
    },
    {
      id: 'x-nehru',
      name: 'Nehru Bhavan',
      category: 'hostel',
      levels: 5,
      footprintLatLon: [
        { lat: 21.1601, lon: 72.7861 },
        { lat: 21.1601, lon: 72.7867 },
        { lat: 21.1604, lon: 72.7867 },
        { lat: 21.1604, lon: 72.7861 },
      ],
      meta: { description: 'Final-year boys hostel.' },
    },
    {
      id: 'x-sarabhai',
      name: 'Sarabhai Bhavan',
      category: 'hostel',
      levels: 5,
      footprintLatLon: [
        { lat: 21.1607, lon: 72.7861 },
        { lat: 21.1607, lon: 72.7867 },
        { lat: 21.161, lon: 72.7867 },
        { lat: 21.161, lon: 72.7861 },
      ],
      meta: { description: 'Postgraduate and research scholars hostel, named after Vikram Sarabhai.' },
    },
    {
      id: 'x-auditorium',
      name: 'Gajjar Auditorium',
      category: 'admin',
      levels: 2,
      footprintLatLon: [
        { lat: 21.1627, lon: 72.7845 },
        { lat: 21.1627, lon: 72.7852 },
        { lat: 21.163, lon: 72.7852 },
        { lat: 21.163, lon: 72.7845 },
      ],
      meta: {
        description: 'The main auditorium / convocation hall for institute functions and cultural events.',
        accent: '#8a5a3b',
        roof: 'vault',
      },
    },
    {
      id: 'x-sac',
      name: 'Students Activity Centre',
      category: 'sports',
      levels: 2,
      footprintLatLon: [
        { lat: 21.1662, lon: 72.7842 },
        { lat: 21.1662, lon: 72.7848 },
        { lat: 21.1665, lon: 72.7848 },
        { lat: 21.1665, lon: 72.7842 },
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
    { name: 'Service Building', category: 'utility', box: [-1e4, -1e4, 1e4, 1e4], minArea: 0, floors: 1 },
  ],

  extraGrounds: [
    { name: 'Athletics & Football Ground', sport: 'athletics', footprintXZ: ellipse(70, 60, 100, 66, 28) },
    { name: 'Cricket Ground', sport: 'cricket', footprintXZ: ellipse(370, 40, 95, 95, 28) },
    { name: 'Hockey Ground', sport: 'field_hockey', footprintXZ: rect(150, 200, 92, 55) },
    { name: 'Volleyball Courts', sport: 'volleyball', footprintXZ: rect(-40, 150, 36, 20) },
  ],

  // A small ornamental pond by the central lawn for visual interest.
  extraWater: [{ name: 'Campus Lily Pond', footprintXZ: ellipse(-150, 40, 34, 22, 20) }],

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
