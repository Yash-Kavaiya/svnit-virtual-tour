// Pure velocity integrator for the free-fly / drone camera.
// state.vel is [forward, right, up] in local camera axes (m/s).
const ACCEL = 55;
const DAMP = 6;
const MAX = 28;
const MAX_BOOST = 80;

export function integrateFly(state, input, dt) {
  const vel = [...(state.vel ?? [0, 0, 0])];
  const max = input.boost ? MAX_BOOST : MAX;
  const wish = [input.forward || 0, input.right || 0, input.up || 0];

  for (let i = 0; i < 3; i++) {
    vel[i] += wish[i] * ACCEL * dt;
    // damping toward zero when no input on that axis
    if (wish[i] === 0) vel[i] -= vel[i] * Math.min(1, DAMP * dt);
  }

  const speed = Math.hypot(...vel);
  if (speed > max) {
    const k = max / speed;
    vel[0] *= k;
    vel[1] *= k;
    vel[2] *= k;
  }
  return { ...state, vel };
}
