import { describe, it, expect, beforeEach } from 'vitest';

function makeLS() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

async function freshImport() {
  return import('../../src/core/Settings.js?u=' + Math.random());
}

describe('Settings', () => {
  beforeEach(() => {
    globalThis.localStorage = makeLS();
  });

  it('returns defaults when storage empty', async () => {
    const { Settings } = await freshImport();
    expect(Settings.get('quality')).toBe('high');
    expect(Settings.get('timeOfDay')).toBe('noon');
  });

  it('persists and reloads', async () => {
    let m = await freshImport();
    m.Settings.set('quality', 'low');
    expect(JSON.parse(localStorage.getItem('svnit.settings')).quality).toBe('low');
    m = await freshImport();
    expect(m.Settings.get('quality')).toBe('low');
  });

  it('rejects unknown keys', async () => {
    const { Settings } = await freshImport();
    expect(() => Settings.set('nope', 1)).toThrow();
  });
});
