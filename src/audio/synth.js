// Small WebAudio helpers. All pure-ish or ctx-parametrised so they're testable.

export function distanceGain(dist, maxDist) {
  if (dist >= maxDist) return 0;
  const t = 1 - dist / maxDist;
  return t * t;
}

export function makeNoiseBuffer(ctx, seconds = 2, type = 'white') {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'pink' || type === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * (type === 'brown' ? 3.5 : 8);
    } else {
      data[i] = w;
    }
  }
  return buffer;
}

// A short bird-chirp: two quick FM blips.
export function birdChirp(ctx, destination, when = 0) {
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2200 + Math.random() * 900, t);
  osc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 600, t + 0.08);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(gain).connect(destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

export function bell(ctx, destination, when = 0, freq = 320) {
  const t = ctx.currentTime + when;
  for (const [mult, g] of [[1, 0.5], [2.01, 0.25], [2.99, 0.12], [4.2, 0.06]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(g, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    osc.connect(gain).connect(destination);
    osc.start(t);
    osc.stop(t + 3.3);
  }
}

export function footstep(ctx, destination, running) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 0.12, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = running ? 900 : 500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(running ? 0.09 : 0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  src.connect(filter).connect(gain).connect(destination);
  src.start(t);
  src.stop(t + 0.16);
}
