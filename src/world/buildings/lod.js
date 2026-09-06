const THRESHOLDS = {
  low: [55, 260],
  medium: [90, 420],
  high: [125, 560],
  ultra: [210, 820],
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
