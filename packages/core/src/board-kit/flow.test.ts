import { createScope, leakCounters } from '../lifecycle';
import type { UiContext } from '../ui-kit/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFlow } from './flow';

const core = { t: (k: string) => k, root: document.body } as unknown as UiContext & {
  root: HTMLElement;
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function make(over = false, tempo = 1) {
  const scope = createScope();
  const onRestart = vi.fn();
  const onQuit = vi.fn();
  const flow = createFlow({ core, scope, tempo, isOver: () => over, onRestart, onQuit });
  return { flow, scope, onRestart, onQuit };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('flow', () => {
  it('sleep waits for the (tempo scaled) time, and not at all when fast', async () => {
    const { flow, scope } = make(false, 0.5);
    let done = false;
    void flow.sleep(1000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(499);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(done).toBe(true);
    flow.setFast(true);
    let quick = false;
    void flow.sleep(5000).then(() => (quick = true));
    await flush();
    expect(quick).toBe(true);
    scope.destroy();
  });

  it('pause holds the gate until resumed, opens one dialog and toggles', async () => {
    const { flow, scope } = make();
    flow.pause();
    flow.pause(); // second call: nothing new
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
    expect(flow.modalOpen).toBe(true);
    let passed = false;
    void flow.gate().then(() => (passed = true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(passed).toBe(false);
    flow.toggle(); // resume
    await flush();
    expect(passed).toBe(true);
    expect(flow.modalOpen).toBe(false);
    flow.toggle(); // pause again
    expect(flow.modalOpen).toBe(true);
    scope.destroy();
  });

  it('does not pause a finished game', () => {
    const { flow, scope } = make(true);
    flow.pause();
    expect(flow.modalOpen).toBe(false);
    scope.destroy();
  });

  it('a hidden tab pauses', () => {
    const { flow, scope } = make();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flow.modalOpen).toBe(true);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flow.modalOpen).toBe(true); // stays paused until the player resumes
    scope.destroy();
  });

  it('kill stops everything: later awaits never continue, the dialog and listeners go', async () => {
    const before = leakCounters();
    const { flow, scope } = make();
    flow.pause();
    let afterGate = false;
    let afterAlive = false;
    void flow.gate().then(() => (afterGate = true));
    void flow.alive(Promise.resolve(1)).then(() => (afterAlive = true));
    flow.kill();
    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(flow.dead).toBe(true);
    expect(afterGate).toBe(false);
    expect(afterAlive).toBe(false);
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(0);
    scope.destroy();
    expect(leakCounters()).toEqual(before);
  });

  it('alive passes values through while the game is running', async () => {
    const { flow, scope } = make();
    expect(await flow.alive(Promise.resolve(42))).toBe(42);
    scope.destroy();
  });
});
