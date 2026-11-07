import { afterEach, describe, expect, it, vi } from 'vitest';
import { installTestHook } from './index';

afterEach(() => {
  delete window.__naijaTest;
  vi.unstubAllGlobals();
});

const opts = () => ({
  game: 'g',
  autoplay: vi.fn(async () => 'done'),
  getState: () => ({ a: 1 }),
  setSeed: vi.fn(),
  events: () => [{ type: 'ready' as const, data: {} }],
  screen: () => 'menu',
  destroy: vi.fn(),
});

describe('test hook', () => {
  it('exposes window.__naijaTest in test builds and removes it on cleanup', async () => {
    const o = opts();
    const off = installTestHook(o);
    const api = window.__naijaTest!;
    expect(api.game).toBe('g');
    expect(await api.autoplay()).toBe('done');
    expect(api.getState()).toEqual({ a: 1 });
    api.setSeed(5);
    expect(o.setSeed).toHaveBeenCalledWith(5);
    expect(api.counters()).toEqual({
      listeners: expect.any(Number),
      timers: expect.any(Number),
      rafs: expect.any(Number),
    });
    expect(api.perf()).toBeNull();
    expect(api.events()[0]!.type).toBe('ready');
    expect(api.screen()).toBe('menu');
    off();
    expect(window.__naijaTest).toBeUndefined();
  });
  it('installs nothing in production builds', () => {
    vi.stubGlobal('__NAIJA_TEST__', false);
    installTestHook(opts())();
    expect(window.__naijaTest).toBeUndefined();
  });
});
