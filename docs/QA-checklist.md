# QA checklist — SVNIT 3D Virtual Tour

Run `npm run dev`, open in a focused browser tab (rAF is throttled in a
background tab), and work through:

## Navigation
- [ ] Start menu → Enter campus → pointer locks, WASD walks, mouse looks
- [ ] Shift runs; Space hops; cannot walk through any building or the boundary wall
- [ ] `F` toggles free-fly drone; `F` again returns to walk
- [ ] `M` opens the full-screen map; click a POI pin → fade teleport
- [ ] `B` opens the directory; search + Enter teleports to a building's entrance
- [ ] Centre a building in the reticle → tooltip; click → info panel with the right facts
- [ ] Info panel "Enter building" works for Central Library, Administration, LT-2

## Interiors
- [ ] Each interior loads, is walkable, furniture blocks movement
- [ ] Walk into the EXIT portal OR press Esc → returns to the exact campus spot + heading
- [ ] Signage reads correctly (not mirrored)

## Guided tour
- [ ] Menu → Guided tour → camera flies stop to stop with captions
- [ ] Prev / Next / Pause / Exit tour all work; final stop does an aerial orbit
- [ ] Exit tour drops the player on foot where the camera ended

## Settings (persist across reload)
- [ ] Quality low/med/high/ultra changes tree density + shadows live
- [ ] Time of day dawn/noon/dusk/night changes sky, sun, fog; lamps glow at dusk/night
- [ ] Volume sliders affect ambience; Ambient life toggle adds/removes students
- [ ] Reduce motion removes head-bob and speeds tour eases
- [ ] Colour-blind minimap swaps the building palette

## Mobile / responsive (device emulation < 720 px)
- [ ] Left-half move stick + right-half look drag; RUN latch; tap-to-interact
- [ ] Dialog panels become bottom sheets; buttons ≥ 48 px

## Performance (record renderer.info at each vantage)
| Vantage | Draw calls | Triangles |
|---|---|---|
| Main gate | ~435 | ~509k |
| Academic zone | ~254 | ~506k |
| Central lawn | ~292 | ~507k |
| Aerial | ~354 | ~507k |

- [ ] Holds ≥ 30 fps on a throttled GPU at Low; auto-downgrade toast appears if sustained slow
- [ ] No console errors during a full play-through
