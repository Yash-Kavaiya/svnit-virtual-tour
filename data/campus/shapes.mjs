// Tiny helpers for hand-authoring curated footprints in local metres (x, z).

export function ellipse(cx, cz, rx, rz, n = 20) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]);
  }
  return pts;
}

export function rect(cx, cz, w, d, rot = 0) {
  const hw = w / 2;
  const hd = d / 2;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}
