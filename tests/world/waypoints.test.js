import { describe, it, expect } from 'vitest';
import { buildWalkGraph, advanceAgent } from '../../src/world/Life.js';

const roads = [
  {
    path: [
      [0, 0],
      [10, 0],
      [10, 10],
    ],
  },
  {
    path: [
      [10, 0],
      [20, 0],
    ],
  },
];

describe('walk graph', () => {
  it('builds nodes and edges from road polylines', () => {
    const g = buildWalkGraph(roads);
    expect(g.nodes.length).toBeGreaterThanOrEqual(4);
    expect(g.edges.length).toBeGreaterThanOrEqual(3);
  });

  it('an agent moves along the graph and stays finite', () => {
    const g = buildWalkGraph(roads);
    let a = { edge: 0, s: 0, dir: 1, speed: 1.4, pos: [0, 0] };
    for (let i = 0; i < 80; i++) a = advanceAgent(a, g, 0.1);
    expect(a.pos.every(Number.isFinite)).toBe(true);
    expect(a.edge).toBeGreaterThanOrEqual(0);
    expect(a.edge).toBeLessThan(g.edges.length);
  });
});
