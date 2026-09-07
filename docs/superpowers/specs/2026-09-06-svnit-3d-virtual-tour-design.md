# SVNIT Surat — 3D Virtual Campus Tour — Design Spec

**Date:** 2026-09-06
**Status:** Approved for planning
**Repo:** `svnit-virtual-tour`

---

## 1. Overview

A browser-based, real-time 3D virtual tour of the **Sardar Vallabhbhai National
Institute of Technology (SVNIT), Surat** campus (Ichchhanath, Surat, Gujarat —
~250 acres, campus polygon centred near 21.163°N, 72.785°E).

The user walks or free-flies through a navigable 3D model of the campus whose
**layout, road network, water bodies and building footprints are taken from real
OpenStreetMap data**, with procedurally generated but category-appropriate
building architecture, real building name-boards, landscaping, landmarks
(Sardar Patel statue, Ganesh temple, main gate), ambient life and sound, a
guided-tour mode, a minimap, and clickable building information panels.

Three named buildings are enterable with detailed interiors: the **Central
Library**, a **Lecture Theatre (LT / Seminar Hall)**, and the **Administration
Building lobby**.

### Decisions locked (from clarification)

| Question | Decision |
|---|---|
| Core experience | Walkable 3D campus (Three.js), real-time, browser |
| Layout fidelity source | Best-effort: OpenStreetMap footprints/roads/water + public info; procedural detailed facades on the accurate layout |
| v1 scope | All major building exteriors + key interiors (Library, one lecture hall, Admin lobby) |
| Delivery | Full buildable/deployable project repo (Vite + Three.js), static-host ready |

## 2. Goals / Non-goals

### Goals
- Genuinely accurate **campus layout** — building positions, footprints, roads,
  lakes, grounds match the real campus (OSM-derived).
- Every significant campus building present, labelled, and identifiable.
- Smooth first-person walk + free-fly (“drone”) navigation; 60 fps desktop,
  ≥30 fps mid mobile.
- Strong sense of place: Indian institutional architecture cues, real name
  boards, tropical landscaping, Surat-appropriate light and haze, campus life.
- Guided tour mode with narration covering the campus highlights.
- Clickable building info (name, department, established, floors, description).
- Three fully modelled interiors.
- Reproducible data pipeline; committed data so the app builds offline.
- Quality presets, time-of-day, accessibility-minded UI, mobile support.

### Non-goals (v1)
- Photorealistic facades matching actual photographs (no reference imagery
  available; facades are plausible, not exact).
- Interiors beyond the three named buildings.
- Multiplayer / shared presence.
- VR/WebXR (kept as a clean extension point, not built).
- CMS / editing tools for campus data.
- Real personnel, timetables, or live campus systems.

## 3. Data pipeline

### 3.1 Source
- `data/osm/overpass-raw.json` — committed Overpass API export covering the
  campus bounding box: campus boundary polygon (OSM way `150694694`), 113+
  building footprints with geometry, road network, water, leisure grounds,
  landuse, and named POIs (statue, temple, gates, canteen, ATM…).
- `data/campus/curated.js` — hand-authored overlay: per-building metadata
  (display name, category, department, established year, floor count, short
  description, facade style, accent colour, `hasInterior`), keyed by OSM id
  with name fallback. Also curated tour stops, gate structures, and
  corrections/additions OSM lacks (e.g. Gajjar Auditorium, sports complex
  naming, central lawn).

### 3.2 Build script — `scripts/build-campus-data.mjs`
Pure Node ESM, no Three.js. Steps:

1. **Parse** Overpass JSON into typed feature lists.
2. **Project** every `{lat,lon}` → local metric `{x,z}` via equirectangular
   projection about the campus centroid
   (`x = R·Δlon·cos(lat0)`, `z = -R·Δlat`, `R = 6_378_137 m`). Error over a
   ~1.5 km span is < 0.5 m — acceptable.
3. **Clip** to the campus polygon (ray-cast point-in-polygon) with a +30 m
   buffer so edge buildings and the perimeter wall survive.
4. **Normalise buildings**: ensure CCW winding, drop degenerate/duplicate
   rings, compute centroid + area + longest-edge orientation.
5. **Classify** each building → category:
   `academic | admin | library | hostel | workshop | lab | sports | dining |
    health | utility | residence | gate | amenity` — from OSM tags
   (`building=dormitory`, `amenity=library`, `office=educational_institution`,
   name regex `Department|Bhavan|Workshop|Lab|Library|Administration|Guest`) and
   the curated overlay (curated wins).
6. **Estimate height**: `building:levels × 3.4 m + 1.2 m` parapet when levels
   known; else per-category default
   (academic 4L, library 3L tall, admin 3L, hostel 5L (Gajjar) … 9L (Swami
   Vivekanand, from OSM), workshop 1L 8 m bay, utility 1L). Curated override wins.
7. **Roads**: keep `highway` lines intersecting the campus; tag width/class
   (primary avenue 7 m, secondary 5.5 m, service 4 m, path 2 m).
8. **Water / greens / grounds**: polygons for `natural=water`
   (University Lake, Lake View lake), `leisure=park|garden|pitch|sports_centre`,
   `landuse=grass|forest`.
9. **POIs / landmarks**: named nodes → `{name,type,x,z,rot}`.
10. **Emit** `src/data/campus.generated.json` (committed) + a
    `campus.manifest.txt` summary. Validate against a JSON schema before write.

### 3.3 Output schema (`campus.generated.json`)
```
{
  origin: { lat, lon },
  bounds: { minX, maxX, minZ, maxZ },
  boundary: [[x,z], …],
  buildings: [{
    id, name, category, footprint:[[x,z],…], centroid:[x,z],
    height, levels, orientation, meta:{ department?, established?, floors?,
      description?, facade, accent, roof, hasInterior }
  }],
  roads:   [{ class, width, path:[[x,z],…] }],
  water:   [{ name?, polygon:[[x,z],…] }],
  greens:  [{ kind, polygon:[[x,z],…] }],
  grounds: [{ name?, sport?, polygon:[[x,z],…] }],
  pois:    [{ name, type, x, z, rot }],
  gates:   [{ name, x, z, rot, width }]
}
```

## 4. Coordinate system & world scale

- Right-handed, **1 unit = 1 metre**. `+X` east, `+Z` south (screen-down on
  minimap), `+Y` up. Ground plane at `y = 0`.
- Campus spans roughly 1250 m (E–W) × 1300 m (N–S).
- Camera near/far `0.1 / 3000`; exponential fog from ~450 m tuned per
  time-of-day.

## 5. Runtime architecture

Vanilla **Three.js** (latest stable, npm), **Vite** dev/build, **ES modules**,
no framework. UI is plain HTML/CSS overlaid on the canvas. Minimal deps:
`three`, `troika-three-text` (crisp SDF name-boards / signage),
`three-mesh-bvh` (fast raycast for click + collision), `stats.js` (dev only).
Dev: `vitest`, `eslint`, `prettier`.

```
src/
  main.js                 bootstrap, RAF loop, resize, quality wiring
  core/
    Renderer.js            WebGLRenderer, tone mapping, shadow config
    SceneManager.js        active scene switch (campus ↔ interiors)
    AssetRegistry.js       shared geometries/materials/instancers, disposal
    Settings.js            quality presets, persisted to localStorage
    events.js              tiny pub/sub bus
  world/
    Campus.js              orchestrates world build from campus.generated.json
    Sky.js                 gradient sky dome, sun/moon, 4 time-of-day presets
    Lighting.js            hemisphere + sun dir light + player-tracked shadow cam
    Ground.js              terrain, lawns, dirt, road-side verges
    Roads.js               road ribbons, curbs, centre-lines, crossings
    Water.js               lake meshes + ripple shader + reflection fake
    Buildings.js           footprint extrusion + facade system + roof props + name boards
    FacadeMaterial.js      canvas/shader window-grid textures per category
    Vegetation.js          instanced trees (neem, gulmohar, palm, ashoka), hedges, lawn tufts
    Landmarks.js           Sardar Patel statue, Ganesh temple, main gate, flagpole, fountain, signage
    StreetKit.js           lamp posts, benches, bins, bus stops, bollards, boundary wall
    Life.js                instanced walking students + parked/moving bicycles + a campus bus (toggle)
  player/
    PlayerController.js    FSM: WALK (pointer-lock FPS) ↔ FLY (drone) ↔ TOUR
    Collision.js           2D capsule-vs-footprint slide, ground clamp
    MobileControls.js      dual on-screen sticks + look drag + tap-to-interact
    Teleport.js            move to POI / minimap click with fade
  interiors/
    InteriorBase.js        shared: room shell, lighting, exit portal
    LibraryInterior.js     Central Library: atrium, stacks, reading hall, issue desk, catalog PCs
    LectureHallInterior.js tiered seating, podium, projector + screen, whiteboards, chajja windows
    AdminLobbyInterior.js  reception, notice boards, portrait wall, corridor, staircase
    kit/FurnitureKit.js    shelves, books (instanced), desks, chairs, doors, signage
  ui/
    Loading.js             progress bar over asset/world build
    StartMenu.js           title, “Enter campus”, “Guided tour”, settings, directory
    HUD.js                 crosshair, location label, mode chip, control hints, compass
    Minimap.js             2D canvas: roads + building blocks + player + clickable POIs
    InfoPanel.js           building card: name, category, dept, established, floors, description, [Enter]
    Directory.js           searchable building list → teleport
    TourPanel.js           tour transport: play/pause/prev/next, stop title + narration, progress
    Settings.js            quality, time-of-day, ambient life, audio, invert-Y, FOV, reduce-motion
    Credits.js             data © OpenStreetMap contributors (ODbL), build notes
  audio/
    Ambience.js            WebAudio: birdsong bed, distant traffic, wind; interior room tone; footsteps; UI ticks
  data/
    campus.generated.json  committed pipeline output
    tour.js                ordered tour stops: { id, title, cameraKeyframes, lookAt, narration, poi }
  styles/                  ui.css, tokens.css (light/dark aware, system-font stack)
```

## 6. Buildings & facade system

- **Extrusion**: footprint polygon → `THREE.Shape` → `ExtrudeGeometry`
  (or custom BufferGeometry for control) to `height`. Flat roof with parapet.
- **Facade material per category** — a reusable canvas-drawn albedo + a shader
  that adds per-floor window grids, spandrel bands, plinth, and a stringcourse:
  - `academic` — cream/off-white plaster, brick-red bands, horizontal RCC
    sunshades (chajjas) over ribbon windows, projecting stair-tower.
  - `library` — more glazing, vertical fins, stone-look plinth, prominent
    entrance canopy + steps.
  - `admin` — symmetrical, porte-cochère entrance, flag, clock band.
  - `hostel` — long wings, continuous balcony corridor with railing on the
    rear, repetitive small windows, water tanks + solar heaters on roof.
  - `workshop` — tall single-storey shed, north-light saw-tooth roof, roller
    shutters, gantry vents.
  - `utility` — plain block; `gate` — masonry piers + name arch.
- **Roof kit** (instanced, category-weighted): parapet, cylindrical water
  tanks, staircase headroom box, AC condensers, solar panels, vent pipes,
  cable trays, a rooftop signage frame.
- **Entrance**: canopy slab + columns + steps + doors at the footprint edge
  nearest the adjacent road; **name board** via `troika-three-text` on the
  canopy fascia showing the real building name.
- **LOD**: `full` (≤ ~180 m), `mid` (box + flat facade texture), `far`
  (flat-shaded box). Swap by distance; buildings are static so this is cheap.
- **Colour discipline**: 3–4 palette families keyed to category; slight
  per-building hue/value jitter (seeded by id) so rows read as distinct
  buildings, not a texture.

## 7. Interiors

Each interior is a **separate lightweight scene** in `SceneManager`. Entering:
walk into the entrance trigger volume → fade → interior scene with its own
camera start, lighting, and an **Exit** portal that returns to the exact
campus position/heading. Interiors are hand-built from `FurnitureKit` +
category rooms; no external models.

- **Central Library** — entrance lobby with issue/return desk and gate;
  double-height reading hall with long tables, task lamps, students (instanced,
  seated); rows of book stacks (instanced shelving + instanced book spines);
  periodicals corner; OPAC terminals; first-floor gallery reachable by stairs;
  signage ("SILENCE PLEASE", section labels).
- **Lecture Theatre** — raked floor, ~120 tiered seats (instanced), writing
  tablets, teacher's podium with mic, twin whiteboards, motorised projector
  screen + ceiling projector, side ribbon windows with chajja, ceiling fans,
  door with room number (e.g. "LT-2").
- **Administration Building lobby** — reception desk, waiting sofas, a wall of
  glass-fronted notice boards (admissions, circulars), portrait wall of
  directors, potted plants, corridor leading to named office doors
  (Director, Registrar, Dean Academic), open-well staircase with SVNIT crest.

## 8. Player & controls

- **WALK** (default): pointer-lock. `WASD`/arrows move, mouse looks,
  `Shift` run, `Space` small hop, `C` crouch, eye height 1.7 m. Capsule
  collision slides along building footprints and the boundary wall; gravity +
  ground clamp (flat terrain v1).
- **FLY / drone**: `F` toggles. Free 6-DOF, `Q/E` down/up, scroll = speed,
  no collision. For taking in the whole campus.
- **TOUR**: camera driven by keyframes; player input paused except
  pause/skip. `Esc` exits to WALK at the current spot.
- **Teleport**: click a POI marker, a minimap pin, or a Directory entry →
  fade → arrive facing the entrance.
- **Mobile**: left stick move, right side drag look, auto-run toggle, tap
  reticle to interact, pinch = FOV/zoom in fly.
- **Interact**: centre reticle over a building within ~35 m → name tooltip;
  click/tap → `InfoPanel`; if `hasInterior`, an **Enter** button (or walk
  through the doorway).

## 9. UI / HUD

- **Start menu**: title card over a slow campus aerial pan; buttons
  *Enter campus*, *Guided tour*, *Building directory*, *Settings*, *Credits*.
- **HUD**: minimal — reticle, bottom-left location name (nearest building /
  zone), mode chip (WALK/FLY/TOUR), top-right compass, dismissible control
  hints, FPS (dev / opt-in).
- **Minimap**: bottom-right, toggle to full-screen map; draws roads, water,
  building blocks colour-keyed by category, player position + FOV wedge,
  clickable POI pins, current tour route.
- **InfoPanel**: slide-in card, keyboard-closable, focus-trapped; fields:
  name, category, department, established, floors, 2–3 sentence description,
  "Part of the tour" badge, Enter button.
- **Directory**: fuzzy search list of every building; click → teleport.
- **Settings**: quality (Low/Med/High/Ultra), time-of-day (Dawn/Noon/Dusk/
  Night), ambient life on/off, master + ambience + SFX volume, FOV,
  invert look, reduce motion (kills camera bob + tour easing), colourblind-safe
  minimap palette.
- **Design**: dark-first translucent glass panels, system font stack,
  respects `prefers-reduced-motion` and `prefers-color-scheme`, all controls
  keyboard reachable, ≥ 44 px touch targets, visible focus rings.

## 10. Guided tour

`src/data/tour.js` — ordered stops, each:
`{ id, title, poiId, path:[{pos,look,dur,ease}], narration, dwell }`.
Route (curated): Main Gate → Sardar Patel statue & central avenue →
Administration Building → Central Library (enter) → Academic zone (Civil,
Mechanical, Electrical, ECE, Computer Engg blocks) → Lecture Hall (enter) →
Central Computer Centre → SVNIT Workshop → Ganesh temple → sports complex
(cricket stadium, athletics, basketball, tennis) → hostel zone
(Gajjar, Bhabha, Swami Vivekanand, Tagore, Raman, Sarabhai, Narmad) →
Guest House → University Lake viewpoint → finish on an aerial orbit.
Narration is on-screen captioned text (subtitles) with optional TTS via
`speechSynthesis` (off by default, toggle in settings). Transport bar:
play/pause, prev/next stop, scrubber, "exit tour".

## 11. Audio

`WebAudio`, no large assets — layered generated/short-loop ambience:
tropical birds bed, faint road hum that swells near the gate, breeze that
rises in open ground, cicada layer at dusk/night, temple bell near the
temple, library room-tone + page/whisper interior bed, footstep synths keyed
to run/walk and surface. Master + per-bus volume; muted until first user
gesture (autoplay policy); fully optional.

## 12. Performance

- **Instancing** for trees, lamp posts, benches, windows-as-props, people,
  books, seats.
- **Merged static geometry** per category / per map tile where instancing
  doesn't fit; one draw call per road class.
- **LOD** for buildings + vegetation; hard draw distance + fog.
- **Shadows**: single directional shadow-caster with a tight frustum that
  follows the player (≈180 m box), 2k–4k map by quality; hemisphere fill has
  no shadow. Bake contact-shadow blobs under trees/props.
- **Quality presets**: pixel ratio cap, shadow on/off + res, SSAO
  (high/ultra only, `GTAOPass`), tree density ×, people count, draw distance.
- **Budget**: ≤ ~350 draw calls typical view, ≤ 1.5 M triangles, < 150 MB GPU;
  first meaningful paint < 3 s on cable, interactive < 6 s.
- Loading screen covers world construction; heavy build steps chunked across
  frames (generators) to avoid a long freeze.

## 13. Accuracy & fidelity

- **Accurate**: campus outline, internal road graph, both lakes, sports
  ground positions, and ~40 named building footprints + ~70 more real
  footprints, landmark coordinates (statue, temple, main gate) — all OSM.
- **Approximate**: building heights (levels known for ~8; category defaults
  otherwise), facade detail (procedural, category-styled — not photo-matched),
  interior layouts (plausible institutional layouts), tree/prop placement,
  terrain (treated flat).
- **Curated corrections** in `data/campus/curated.js` capture knowledge OSM
  lacks and let the user refine any building later by editing one file and
  re-running the pipeline. A `README` in `data/campus/` documents how.
- Credits screen + repo README attribute OpenStreetMap (ODbL) and state
  clearly that facades/interiors are interpretive.

## 14. Testing

- **Pipeline unit tests (`vitest`)**: projection round-trip (< 0.5 m error),
  point-in-polygon, winding normalisation, area/centroid, height estimation
  table, category classifier (fixture buildings), output validates against
  the JSON schema, deterministic output (snapshot) for the committed fixture.
- **Geometry util tests**: footprint→Shape, capsule/segment collision resolve,
  LOD selection thresholds.
- **Scene smoke test**: build the world from a 3-building fixture campus.json
  under jsdom with a stubbed WebGL context; assert group/child counts, no
  throw, disposal frees registry entries.
- **Manual QA checklist** (in `docs/`): nav modes, collision, each interior
  enter/exit restores position, tour full run, minimap click, directory
  teleport, settings persistence, mobile sticks, reduced-motion, four
  times-of-day, Low preset on a throttled GPU.
- **Visual check** via the `run` skill: launch dev server, screenshot key
  vantage points, eyeball against OSM/satellite for layout.

## 15. Build sequence (feeds the implementation plan)

1. **Scaffold** — Vite + Three, ESLint/Prettier/Vitest, folder skeleton,
   blank canvas + RAF loop + resize + Stats, CI lint+test.
2. **Data pipeline** — `build-campus-data.mjs` + tests + committed
   `campus.generated.json` + curated overlay stub + `data/campus/README`.
3. **World base** — Ground, Sky, Lighting, time-of-day, fog; Roads; Water;
   campus boundary + wall.
4. **Buildings** — extrusion, category facade system, roof kit, entrances,
   name boards, LOD.
5. **Player** — WALK controller + collision + ground clamp; FLY mode; desktop
   only first.
6. **Vegetation + StreetKit + Landmarks** — instanced trees, lamps, benches,
   statue, temple, main gate, flagpole, fountain, signage.
7. **UI shell** — Loading, StartMenu, HUD, Minimap, InfoPanel, Directory,
   Settings (+ persistence), Credits.
8. **Interiors** — InteriorBase + portals; Library; Lecture Hall; Admin lobby;
   FurnitureKit.
9. **Guided tour** — tour data, keyframe camera rig, TourPanel, narration.
10. **Audio** — Ambience buses + footsteps + interior tones.
11. **Ambient life** — instanced students, bicycles, campus bus (toggle).
12. **Mobile controls** + responsive UI + touch targets.
13. **Performance pass** — instancing/merge audit, LOD tuning, quality presets,
    draw-call/tri budget, load-time chunking.
14. **Polish & QA** — visual accuracy pass vs satellite, run QA checklist,
    screenshots, README + deploy config (static host), CREDITS.

## 16. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Facades look generic / "SimCity" | Category facade shader with chajjas, stair towers, roof clutter, name boards, seeded per-building jitter; real signage carries recognition. |
| Layout feels off vs reality | Drive geometry straight from OSM footprints + roads; visual diff against satellite in QA; curated overlay for fixes. |
| Perf collapse with full campus + trees + people | Instancing/merging from the start, LOD + fog, quality presets, frame-chunked build, budgets enforced in QA. |
| Scope creep (whole 250 acres, 3 interiors, tour, audio, life) | Strict build sequence; each stage independently shippable; life/audio/mobile are late and cuttable. |
| No interior reference | Interiors explicitly interpretive; documented in Credits; kept to institutional-typical layouts. |
| OSM data gaps (missing hostels/auditorium) | `data/campus/curated.js` adds/corrects; hostels Narmad/Nehru and Gajjar Auditorium added there with approximate placement in known zones. |
| Big-freeze on load | Chunk world construction across frames behind the loading bar. |

## 17. Attribution

Campus geometry © OpenStreetMap contributors, licensed **ODbL**. Shown on the
Credits screen and in `README.md` / `CREDITS.md`. Facades, interiors, props,
audio and tour narration are original/interpretive and not derived from any
proprietary source.
