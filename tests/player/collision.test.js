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

describe('Collider courtyards', () => {
  it('lets you stand in a courtyard but not in the wings around it', async () => {
    const { Collider } = await import('../../src/player/Collision.js');
    const b = {
      footprint: [[0, 0], [30, 0], [30, 30], [0, 30]],
      holes: [[[10, 10], [10, 20], [20, 20], [20, 10]]],
    };
    const c = new Collider([b], null);
    expect(c.resolve([15, 15], 0.4)).toEqual([15, 15]); // courtyard centre: free
    const out = c.resolve([11, 15], 0.4); // hugging the courtyard wall
    expect(out[0]).toBeGreaterThanOrEqual(10.4 - 1e-6);
    const pushed = c.resolve([5, 15], 0.4); // inside the west wing
    expect(pushed[0] < 0 || pushed[0] > 10).toBe(true);
  });
});
