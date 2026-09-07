import { describe, it, expect, vi } from 'vitest';

describe('boot', () => {
  it('Clock reports monotonic elapsed time', async () => {
    const { Clock } = await import('../../src/core/Clock.js');
    const c = new Clock();
    c.tick();
    const a = c.elapsed;
    await new Promise((r) => setTimeout(r, 10));
    c.tick();
    expect(c.elapsed).toBeGreaterThanOrEqual(a);
    expect(c.delta).toBeGreaterThanOrEqual(0);
  });

  it('event bus delivers payloads', async () => {
    const { events } = await import('../../src/core/events.js');
    const spy = vi.fn();
    events.on('ping', spy);
    events.emit('ping', 42);
    expect(spy).toHaveBeenCalledWith(42);
    events.off('ping', spy);
  });
});
