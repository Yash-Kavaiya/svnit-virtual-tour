# Refining campus data

`src/data/campus.generated.json` is produced by `npm run data` from:

- `data/osm/overpass-raw.json` — raw OpenStreetMap export (© OpenStreetMap
  contributors, ODbL)
- `data/campus/curated.mjs` — the hand-authored overlay
- `data/campus/shapes.mjs` — `ellipse()` / `rect()` helpers for hand-drawn footprints

Run `npm run data` after any edit and commit the regenerated JSON.

## Fix an existing building

Edit `curated.mjs` → `buildings['<osm id or lowercased name>']`. Any of:

```
name, category, department, established, floors, description,
facade, accent, roof, hasInterior
```

The OSM id looks like `w257605000` (`w` = way). The lowercased name (e.g.
`'central library'`) also works and is easier.

## Add a building OSM lacks

Add to `extraBuildings` with a `footprintLatLon` polygon (corners picked off
satellite imagery) or a `footprintXZ` polygon in local metres.

## Add sports grounds / water

`extraGrounds` and `extraWater` accept `footprintLatLon` or `footprintXZ`
(local metres, easier — use `ellipse(cx, cz, rx, rz)` / `rect(cx, cz, w, d, rot)`).
These bypass the campus-boundary clip.

## Local coordinate system

`x` = east, `z` = south, metres, origin at the OSM campus-boundary centroid.
The academic zone sits around `(-120, -215)`, the hostel zone around
`(255, 240)`, the central open ground around `(60, 40)`.

## Categories

`academic, admin, library, hostel, workshop, lab, sports, dining, health,
utility, residence, gate, amenity`
