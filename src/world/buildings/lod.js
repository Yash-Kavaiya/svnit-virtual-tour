// Two-tier LOD: `full` (extruded shell + facade material + 3D chhajjas +
// pilasters + roof crown + roof clutter + entrance) and `mid` (extruded
// shell + same facade material + roof crown only). `mid` still reads as a
// real building at distance, so there is no third flat-box tier.
const FULL_DISTANCE = { low: 55, medium: 90, high: 120, ultra: 210 };

export function lodLevel(distance, quality = 'high') {
  const full = FULL_DISTANCE[quality] ?? FULL_DISTANCE.high;
  return distance <= full ? 'full' : 'mid';
}

export function lodThresholds(quality = 'high') {
  const full = FULL_DISTANCE[quality] ?? FULL_DISTANCE.high;
  return [full, full * 4];
}
