// Orientation of a campus gate: the unit vector pointing into campus and the
// half-width of the opening the perimeter wall must leave for it.
export function gateFrame(gate, bounds) {
  const cx = (bounds.minX + bounds.maxX) / 2 - gate.x;
  const cz = (bounds.minZ + bounds.maxZ) / 2 - gate.z;
  let inx;
  let inz;
  if (Number.isFinite(gate.wallAngle)) {
    // perpendicular to the wall, flipped to face the campus centre
    inx = -Math.sin(gate.wallAngle);
    inz = Math.cos(gate.wallAngle);
    if (inx * cx + inz * cz < 0) {
      inx = -inx;
      inz = -inz;
    }
  } else {
    const l = Math.hypot(cx, cz) || 1;
    inx = cx / l;
    inz = cz / l;
  }
  // carriageway + piers + pedestrian wickets either side
  const halfOpening = (gate.width ?? 14) / 2 + 4.8;
  return { inx, inz, halfOpening };
}
