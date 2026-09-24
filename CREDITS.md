# Credits

## Campus geometry

The campus boundary, building footprints, internal road network and water
bodies are derived from **OpenStreetMap**.

> © OpenStreetMap contributors — <https://www.openstreetmap.org/copyright>
> Data licensed under the **Open Database License (ODbL) v1.0**.

The raw Overpass API export used is committed at
`data/osm/overpass-raw.json`. Any produced database that includes this data
is likewise ODbL.

## Original / interpretive content

Everything else is original work created for this project and is **not**
derived from any proprietary source:

- Building facades and massing details (windows, sunshades, bands, rooftop
  water tanks, entrance canopies, name-boards)
- All three interiors (Central Library, Lecture Theatre, Administration
  lobby) — plausible institutional layouts, not measured reconstructions
- Landmarks — the Sardar Vallabhbhai Patel statue and its roundabout, the
  main gate (placed at OSM's `entrance=main` at Ichchhanath), the SBI ATM
  signage and the flagpole
- Landscaping, street furniture, ambient students and bicycles
- All audio — synthesized at runtime with the Web Audio API
- Guided-tour route and narration text

Building heights are taken from OpenStreetMap where tagged and otherwise
estimated from the building's category.

## Libraries

- [three.js](https://threejs.org) — MIT
- [troika-three-text](https://github.com/protectwise/troika) — MIT
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) — MIT
- Build & test tooling: Vite, Vitest, ESLint, Prettier

## Disclaimer

This is a fan/educational project. It is not affiliated with, authorised by,
or endorsed by the Sardar Vallabhbhai National Institute of Technology.
Facades and interiors are interpretive and should not be relied on as
accurate depictions of the real campus. Corrections are welcome — edit
`data/campus/curated.mjs` and re-run `npm run data`.

## Fonts

- `public/fonts/NotoSansDevanagari-Bold.woff` — Noto Sans Devanagari, © Google,
  SIL Open Font License 1.1 (via Fontsource). Used for the Hindi name on the
  main gate.

## Reference sources for accuracy

- SVNIT Hostel Information Brochure 2025-26 (svnit.ac.in) — hostel names,
  types and room counts; photographs of the main entrance (red name wall,
  "SVNIT" letters, emblem pillar, flag mast).
- OpenStreetMap multipolygon relations (fetched 2026-09-24) — Mother Teresa
  Bhavan, Nehru Bhavan, New CRC and courtyard blocks.
