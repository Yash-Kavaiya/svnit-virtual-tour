import { describe, it, expect } from 'vitest';
import { TIME_PRESETS, interpolatePreset, colorLerp } from '../../src/world/TimeOfDay.js';

describe('TimeOfDay', () => {
  it('has the four presets with required fields', () => {
    for (const k of ['dawn', 'noon', 'dusk', 'night']) {
      const p = TIME_PRESETS[k];
      expect(p.sunIntensity).toBeTypeOf('number');
      expect(p.fogDensity).toBeGreaterThan(0);
      expect(p.sunDir).toHaveLength(3);
      expect(p.skyHorizon).toMatch(/^#/);
      expect(p.skyZenith).toMatch(/^#/);
    }
  });

  it('noon is brighter than night', () => {
    expect(TIME_PRESETS.noon.sunIntensity).toBeGreaterThan(TIME_PRESETS.night.sunIntensity);
  });

  it('colorLerp midpoint of black and white is mid-grey', () => {
    expect(colorLerp('#000000', '#ffffff', 0.5).toLowerCase()).toBe('#808080');
  });
  it('colorLerp endpoints are exact', () => {
    expect(colorLerp('#123456', '#abcdef', 0).toLowerCase()).toBe('#123456');
    expect(colorLerp('#123456', '#abcdef', 1).toLowerCase()).toBe('#abcdef');
  });

  it('interpolatePreset midpoint averages scalars and blends colors', () => {
    const m = interpolatePreset(TIME_PRESETS.noon, TIME_PRESETS.night, 0.5);
    expect(m.sunIntensity).toBeCloseTo(
      (TIME_PRESETS.noon.sunIntensity + TIME_PRESETS.night.sunIntensity) / 2,
      5,
    );
    expect(m.skyZenith).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
