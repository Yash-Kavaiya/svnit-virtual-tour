const THRESHOLDS = {
  low: [70, 300],
  medium: [120, 500],
  high: [180, 650],
  ultra: [260, 900],
};

export function lodLevel(distance, quality = 'high') {
  const [full, mid] = THRESHOLDS[quality] ?? THRESHOLDS.high;
  if (distance <= full) return 'full';
  if (distance <= mid) return 'mid';
  return 'far';
}

export function lodThresholds(quality = 'high') {
  return THRESHOLDS[quality] ?? THRESHOLDS.high;
}
