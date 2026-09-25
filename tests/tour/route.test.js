import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTourStops, resolveTour } from '../../src/tour/route.js';

const campus = JSON.parse(readFileSync(new URL('../../src/data/campus.generated.json', import.meta.url)));

describe('guided tour', () => {
  const stops = buildTourStops(campus);

  it('starts at the old gate, visits the new gate and ends with the aerial', () => {
    expect(stops[0].id).toBe('gate');
    expect(stops.some((s) => s.id === 'new-gate')).toBe(true);
    expect(stops.at(-1).id).toBe('aerial');
  });

  it('visits every named building exactly once', () => {
    const named = campus.buildings.filter((b) => !b.meta.generic && !b.name.startsWith('(unnamed'));
    for (const b of named) {
      const hits = stops.filter(
        (s) => s.target.id === b.id || (s.target.building && s.target.building.test(b.name) && s.coversId === b.id),
      );
      expect(hits.length, b.name).toBe(1);
    }
  });

  it('shows one example of each generic building type', () => {
    const generic = [...new Set(campus.buildings.filter((b) => b.meta.generic).map((b) => b.name))];
    for (const name of generic) {
      expect(stops.filter((s) => s.title === name).length, name).toBe(1);
    }
  });

  it('resolves every stop to finite camera keys', () => {
    const resolved = resolveTour(campus, null);
    expect(resolved).toHaveLength(stops.length);
    for (const r of resolved) {
      for (const k of r.keys) expect([...k.pos, ...k.look].every(Number.isFinite)).toBe(true);
      expect(r.narration.length).toBeGreaterThan(10);
    }
  });
});
