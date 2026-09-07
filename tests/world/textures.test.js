import { describe, it, expect } from 'vitest';
import { canvasSupported } from '../../src/world/textures.js';

describe('textures', () => {
  it('reports canvas support honestly under the test environment', () => {
    expect(typeof canvasSupported()).toBe('boolean');
  });
});
