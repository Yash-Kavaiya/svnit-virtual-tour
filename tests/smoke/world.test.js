import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCampusData } from '../../src/data/schema.mjs';
import { buildRoadRibbon } from '../../src/world/Roads.js';
import { scatterPoints } from '../../src/world/Vegetation.js';
import { buildWalkGraph, advanceAgent } from '../../src/world/Life.js';
import { nearestRoadPointTo } from '../../src/world/buildings/Entrance.js';
import { PerfMonitor } from '../../src/core/perf.js';

const campus = JSON.parse(
  readFileSync(new URL('../../src/data/campus.generated.json', import.meta.url)),
);

describe('committed campus data', () => {
  it('is schema-valid', () => {
    const v = validateCampusData(campus);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('has a plausible number of features', () => {
    expect(campus.buildings.length).toBeGreaterThan(60);
    expect(campus.roads.length).toBeGreaterThan(10);
    expect(campus.pois.length).toBeGreaterThan(5);
    expect(campus.gates.length).toBeGreaterThanOrEqual(1);
  });

  it('every building footprint extrudes to finite ribbon-able geometry', () => {
    for (const b of campus.buildings) {
      for (let i = 0; i < b.footprint.length - 1; i++) {
        const r = buildRoadRibbon([b.footprint[i], b.footprint[i + 1]], 2);
        expect([...r.positions].every(Number.isFinite)).toBe(true);
      }
    }
  });
});

describe('world builders survive the real data', () => {
  it('road ribbons build for every campus road', () => {
    let verts = 0;
    for (const road of campus.roads) {
      const r = buildRoadRibbon(road.path, road.width);
      expect([...r.positions].every(Number.isFinite)).toBe(true);
      verts += r.positions.length / 3;
    }
    expect(verts).toBeGreaterThan(0);
  });

  it('vegetation scatter respects building rejection over the campus bounds', () => {
    const pts = scatterPoints({ bounds: campus.bounds, count: 200, seed: 1, minSpacing: 10 });
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z))).toBe(true);
  });

  it('the walk graph is connected enough for agents to roam', () => {
    const g = buildWalkGraph(campus.roads.filter((r) => r.width >= 3));
    expect(g.edges.length).toBeGreaterThan(5);
    let a = { edge: 0, s: 0.5, dir: 1, speed: 1.4, pos: [0, 0], _seed: 1 };
    for (let i = 0; i < 500; i++) a = advanceAgent(a, g, 0.05);
    expect(a.pos.every(Number.isFinite)).toBe(true);
  });

  it('every building can find a nearest road point', () => {
    for (const b of campus.buildings) {
      const p = nearestRoadPointTo(b.centroid, campus.roads);
      expect(p.every(Number.isFinite)).toBe(true);
    }
  });
});

describe('PerfMonitor', () => {
  it('reports ~60fps for 16ms frames and suggests a downgrade when sustained-slow', () => {
    const pm = new PerfMonitor(120);
    for (let i = 0; i < 120; i++) pm.sample(1 / 60);
    expect(pm.fps).toBeGreaterThan(55);
    expect(pm.suggestQuality('high')).toBeNull();

    const slow = new PerfMonitor(120);
    for (let i = 0; i < 120; i++) slow.sample(1 / 12);
    let out = null;
    for (let k = 0; k < 5 && !out; k++) {
      for (let i = 0; i < 120; i++) slow.sample(1 / 12);
      out = slow.suggestQuality('high');
    }
    expect(out).toBe('medium');
  });
});
