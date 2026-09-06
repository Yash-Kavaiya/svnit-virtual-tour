import { describe, it, expect } from 'vitest';
import { Collider, segmentClosestPoint } from '../../src/player/Collision.js';

const BIG_BOUNDARY = [
  [-100, -100],
  [100, -100],
  [100, 100],
  [-100, 100],
];

describe('collision', () => {
  it('segmentClosestPoint clamps to endpoints', () => {
    expect(segmentClosestPoint([-5, 0], [0, 0], [10, 0])).toEqual([0, 0]);
    expect(segmentClosestPoint([5, 3], [0, 0], [10, 0])).toEqual([5, 0]);
  });

  it('pushes the player out of a building footprint', () => {
    const c = new Collider(
      [
        {
          footprint: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
      ],
      BIG_BOUNDARY,
    );
    const out = c.resolve([5, 5], 0.4);
    const insideStill = out[0] > 0 && out[0] < 10 && out[1] > 0 && out[1] < 10;
    expect(insideStill).toBe(false);
  });

  it('leaves a free-standing player untouched', () => {
    const c = new Collider(
      [
        {
          footprint: [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
          ],
        },
      ],
      BIG_BOUNDARY,
    );
    expect(c.resolve([50, 50], 0.4)).toEqual([50, 50]);
  });

  it('keeps the player inside the campus boundary', () => {
    const c = new Collider([], [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ]);
    const out = c.resolve([50, 0], 0.4);
    expect(out[0]).toBeLessThanOrEqual(10);
  });
});
