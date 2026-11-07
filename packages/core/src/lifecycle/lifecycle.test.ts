import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScope, leakCounters } from './index';

afterEach(() => vi.useRealTimers());

describe('scope', () => {
  it('tracks and removes listeners', () => {
    const base = leakCounters();
    const s = createScope();
    const fn = vi.fn();
    const el = document.createElement('div');
    s.on(el, 'click', fn);
    expect(leakCounters().listeners).toBe(base.listeners + 1);
    el.click();
    expect(fn).toHaveBeenCalledTimes(1);
    s.destroy();
    el.click();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(leakCounters()).toEqual(base);
    expect(s.destroyed).toBe(true);
  });
  it('timeouts fire once and untrack themselves; intervals stop on destroy', () => {
    vi.useFakeTimers();
    const base = leakCounters();
    const s = createScope();
    const t = vi.fn();
    const i = vi.fn();
    s.timeout(t, 100);
    s.interval(i, 50);
    expect(leakCounters().timers).toBe(base.timers + 2);
    vi.advanceTimersByTime(120);
    expect(t).toHaveBeenCalledTimes(1);
    expect(i).toHaveBeenCalledTimes(2);
    expect(leakCounters().timers).toBe(base.timers + 1);
    s.destroy();
    vi.advanceTimersByTime(500);
    expect(i).toHaveBeenCalledTimes(2);
    expect(leakCounters()).toEqual(base);
  });
  it('cancels a timeout through its off function', () => {
    vi.useFakeTimers();
    const s = createScope();
    const t = vi.fn();
    const off = s.timeout(t, 100);
    off();
    off();
    vi.advanceTimersByTime(200);
    expect(t).not.toHaveBeenCalled();
  });
  it('raf callbacks run once and are cancelled on destroy', () => {
    const base = leakCounters();
    const cbs: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cbs.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const s = createScope();
    const fn = vi.fn();
    s.raf(fn);
    s.raf(fn);
    expect(leakCounters().rafs).toBe(base.rafs + 2);
    cbs[0]!(16);
    expect(fn).toHaveBeenCalledWith(16);
    expect(leakCounters().rafs).toBe(base.rafs + 1);
    s.destroy();
    expect(leakCounters()).toEqual(base);
    vi.unstubAllGlobals();
  });
  it('registrations after destroy are undone immediately; add() runs cleanups once', () => {
    const s = createScope();
    const cleanup = vi.fn();
    s.add(cleanup);
    s.destroy();
    s.destroy();
    expect(cleanup).toHaveBeenCalledTimes(1);
    const fn = vi.fn();
    const el = document.createElement('div');
    s.on(el, 'click', fn);
    el.click();
    expect(fn).not.toHaveBeenCalled();
  });
});
