// Catmull-Rom sampling of a keyframe path. Each key: { t, pos:[x,y,z], look:[x,y,z] }.

export function pathDuration(keys) {
  return keys.length ? keys[keys.length - 1].t : 0;
}

function catmull(p0, p1, p2, p3, s) {
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * s +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * s3)
  );
}

export function samplePath(keys, time) {
  if (!keys.length) return { pos: [0, 0, 0], look: [0, 0, -1] };
  const dur = pathDuration(keys);
  const t = Math.max(0, Math.min(dur, time));

  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const k1 = keys[i];
  const k2 = keys[Math.min(i + 1, keys.length - 1)];
  const span = k2.t - k1.t || 1;
  const s = Math.max(0, Math.min(1, (t - k1.t) / span));

  const k0 = keys[Math.max(0, i - 1)];
  const k3 = keys[Math.min(keys.length - 1, i + 2)];

  const lerpTriple = (a, b, u) => a.map((v, j) => v + (b[j] - v) * u);
  const crTriple = (a, b, c, d, u) => [
    catmull(a[0], b[0], c[0], d[0], u),
    catmull(a[1], b[1], c[1], d[1], u),
    catmull(a[2], b[2], c[2], d[2], u),
  ];

  return {
    pos: crTriple(k0.pos, k1.pos, k2.pos, k3.pos, s),
    look: lerpTriple(k1.look, k2.look, ease(s)),
  };
}

function ease(s) {
  return s < 0.5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2;
}
