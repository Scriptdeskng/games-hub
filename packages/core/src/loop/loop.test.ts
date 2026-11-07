import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leakCounters } from '../lifecycle';
import { createPerf } from '../perf';
import { createLoop } from './index';

let cbs: FrameRequestCallback[] = [];
const flush = (t: number): void => {
  const run = cbs;
  cbs = [];
  run.forEach((cb) => cb(t));
};

beforeEach(() => {
  cbs = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cbs.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.spyOn(performance, 'now').mockReturnValue(0);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const setHidden = (hidden: boolean): void => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('createLoop', () => {
  it('runs fixed steps, renders with an interpolation alpha', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = createLoop({ update, render, step: 0.01 });
    loop.start();
    flush(35); // 35 ms = 3 steps + 5 ms remainder
    expect(update).toHaveBeenCalledTimes(3);
    expect(render.mock.calls[0]![0]).toBeCloseTo(0.5);
    loop.destroy();
  });
  it('caps catch-up steps after a long stall (no spiral of death)', () => {
    const update = vi.fn();
    const loop = createLoop({ update, step: 0.25, maxSteps: 4 });
    loop.start();
    flush(10_000);
    expect(update).toHaveBeenCalledTimes(4);
    loop.destroy();
  });
  it('pause/resume/stop and double start are safe; perf is fed', () => {
    const update = vi.fn();
    const perf = createPerf();
    const loop = createLoop({ update, step: 0.01, perf });
    loop.start();
    loop.start();
    expect(cbs).toHaveLength(1);
    flush(20);
    expect(perf.snapshot().frames).toBe(1);
    loop.pause();
    expect(loop.running).toBe(false);
    loop.resume();
    expect(loop.running).toBe(true);
    loop.stop();
    loop.destroy();
    loop.start(); // destroyed: no-op
    expect(loop.running).toBe(false);
    perf.destroy();
  });
  it('advance() runs steps synchronously', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = createLoop({ update, render });
    loop.advance(5);
    expect(update).toHaveBeenCalledTimes(5);
    expect(render).toHaveBeenCalledWith(0);
    loop.destroy();
  });
  it('auto-pauses when the tab is hidden and resumes when visible', () => {
    const loop = createLoop({ update: vi.fn() });
    loop.start();
    setHidden(true);
    expect(loop.running).toBe(false);
    setHidden(false);
    expect(loop.running).toBe(true);
    loop.destroy();
  });
  it('with onHidden the game decides when to resume', () => {
    const onHidden = vi.fn();
    const loop = createLoop({ update: vi.fn(), onHidden });
    loop.start();
    setHidden(true);
    setHidden(false);
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(loop.running).toBe(false);
    loop.resume();
    expect(loop.running).toBe(true);
    loop.destroy();
    expect(leakCounters().rafs).toBe(0);
  });
});
