import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScope, leakCounters } from '../lifecycle';
import { imageTask, runLoader } from './index';

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

const t = (k: string): string => k;

describe('runLoader', () => {
  it('shows a progressbar, advances by weight, survives failing tasks, then removes itself', async () => {
    vi.useFakeTimers();
    const base = leakCounters();
    const order: string[] = [];
    const loader = runLoader({
      root: document.body,
      t,
      logo: document.createElement('img'),
      tasks: [
        { weight: 1, run: async () => void order.push('a') },
        {
          weight: 3,
          run: async () => {
            throw new Error('optional asset missing');
          },
        },
        { weight: 1, run: async () => void order.push('c') },
      ],
    });
    const bar = document.querySelector('[role=progressbar]')!;
    expect(document.querySelector('.ng-loader')).not.toBeNull();
    await loader.done;
    expect(order).toEqual(['a', 'c']);
    expect(loader.progress).toBe(1);
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(document.querySelector('.ng-loader.is-done')).not.toBeNull();
    vi.advanceTimersByTime(500);
    expect(document.querySelector('.ng-loader')).toBeNull();
    expect(leakCounters()).toEqual(base);
  });
  it('with a shared scope, destroying the owner right after load leaves no timer and no element', async () => {
    vi.useFakeTimers();
    const base = leakCounters();
    const scope = createScope();
    const loader = runLoader({ root: document.body, t, tasks: [], scope });
    await loader.done; // the 400 ms fade timer is now pending in the shared scope
    expect(leakCounters().timers).toBe(base.timers + 1);
    scope.destroy();
    expect(leakCounters()).toEqual(base);
    expect(document.querySelector('.ng-loader')).toBeNull();
    loader.destroy();
  });
  it('honours minMs and can be destroyed early', async () => {
    vi.useFakeTimers();
    const loader = runLoader({ root: document.body, t, tasks: [], minMs: 300 });
    let done = false;
    void loader.done.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(done).toBe(true);
    loader.destroy();
    expect(document.querySelector('.ng-loader')).toBeNull();
  });
  it('imageTask resolves on load and on error', async () => {
    const created: HTMLImageElement[] = [];
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          created.push(this as unknown as HTMLImageElement);
          queueMicrotask(() => (created.length % 2 ? this.onload : this.onerror)?.());
        }
      },
    );
    await imageTask('a.svg').run();
    await imageTask('b.svg', 2).run();
    expect(created).toHaveLength(2);
    expect(imageTask('c', 2).weight).toBe(2);
    vi.unstubAllGlobals();
  });
});
