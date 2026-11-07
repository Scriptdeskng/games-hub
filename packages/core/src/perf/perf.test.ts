import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerf } from './index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('perf', () => {
  it('computes fps and min fps over 1 s windows', () => {
    const p = createPerf();
    for (let t = 0; t <= 1000; t += 16.67) p.frame(t); // ~60 fps
    for (let t = 1000 + 50; t <= 2100; t += 50) p.frame(t); // ~20 fps window
    const s = p.snapshot();
    expect(s.frames).toBeGreaterThan(60);
    expect(s.minFps).toBeLessThanOrEqual(s.fps + 40);
    expect(s.minFps).toBeGreaterThan(10);
    p.reset();
    expect(p.snapshot()).toMatchObject({ fps: 0, minFps: 0, frames: 0 });
    p.destroy();
  });
  it('samples the heap on an interval when the browser exposes it', () => {
    vi.useFakeTimers();
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      get: () => ({ usedJSHeapSize: 10 * 1048576 }),
    });
    const p = createPerf(1000);
    vi.advanceTimersByTime(3500);
    const s = p.snapshot();
    expect(s.heapSamples).toEqual([10, 10, 10]);
    expect(s.heapMB).toBe(10);
    p.destroy();
    delete (performance as unknown as Record<string, unknown>).memory;
  });
  it('reports null heap when unsupported', () => {
    const p = createPerf();
    expect(p.snapshot().heapMB).toBeNull();
    p.destroy();
  });
});
