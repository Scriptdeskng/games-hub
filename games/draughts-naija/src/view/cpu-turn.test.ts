import { createScope, leakCounters } from '@naija/core/lifecycle';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAiClient, type WorkerLike } from '../ai';
import { makeRules } from '../rules/config';
import { createGame, findMove, legalMoves } from '../rules/engine';
import { bounded, chooseCpuMove, WATCHDOG_MS } from './cpu-turn';
import { handleRequest, type AiRequest } from '../ai/protocol';

class FakeWorker implements WorkerLike {
  sent: AiRequest[] = [];
  terminated = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  postMessage(m: AiRequest): void {
    this.sent.push(m);
  }
  terminate(): void {
    this.terminated = true;
  }
}

describe('CPU turn watchdog (fake worker, fake timers)', () => {
  let scope = createScope();
  let worker: FakeWorker;
  const state = createGame({ seed: 4, rules: makeRules(10) });
  const fallbackMove = legalMoves(state)[0]!;
  const make = (
    extra: { modal?: () => boolean; sleep?: (ms: number) => Promise<void>; phases?: string[] } = {},
  ) => {
    const client = createAiClient({
      scope,
      timeoutMs: 60_000,
      createWorker: () => (worker = new FakeWorker()),
    });
    return {
      client,
      run: () =>
        chooseCpuMove({
          scope,
          request: () => client.request(state, 'medium'),
          sleep: extra.sleep ?? ((ms) => new Promise<void>((r) => scope.timeout(r, ms))),
          delay: 500,
          modalOpen: extra.modal ?? (() => false),
          fallback: () => fallbackMove,
          onPhase: (p) => extra.phases?.push(p),
        }),
    };
  };
  beforeEach(() => {
    vi.useFakeTimers();
    scope = createScope();
  });
  afterEach(() => {
    scope.destroy();
    vi.useRealTimers();
  });

  it('normal turn: the worker answers, the think pause ends, no watchdog', async () => {
    const phases: string[] = [];
    const { run, client } = make({ phases });
    const p = run();
    worker.onmessage?.({ data: handleRequest(worker.sent[0]!) });
    await vi.advanceTimersByTimeAsync(500);
    const c = await p;
    expect(c?.via).toBe('worker');
    expect(findMove(state, c!.move)).not.toBeNull();
    expect(phases).toEqual(['cpu:request', 'cpu:waiting', 'cpu:think-pause']);
    expect(leakCounters().timers).toBe(0);
    client.destroy();
  });

  it('a worker that never answers: the watchdog cancels and the fallback move is used after 8 s', async () => {
    const { run } = make();
    const p = run();
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS - 1);
    let done = false;
    void p.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    const c = await p;
    expect(c).toMatchObject({ via: 'watchdog', move: fallbackMove, thought: null });
    expect(worker.terminated).toBe(true); // the cancel ended the busy worker
  });

  it('a think pause that never ends is also bounded (the answer came, the timer did not)', async () => {
    const { run } = make({ sleep: () => new Promise<void>(() => undefined) });
    const p = run();
    worker.onmessage?.({ data: handleRequest(worker.sent[0]!) });
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS + 5);
    expect((await p)?.via).toBe('watchdog');
  });

  it('a paused game is not a stall: the watchdog waits while the pause dialog is open', async () => {
    let open = true;
    const { run } = make({ modal: () => open });
    const p = run();
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS * 3);
    let done = false;
    void p.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    open = false;
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS + 5);
    expect((await p)?.via).toBe('watchdog');
  });

  it('a cancelled request (game torn down) returns null and leaves no timer', async () => {
    const { run, client } = make();
    const p = run();
    client.destroy();
    expect(await p).toBeNull();
    scope.destroy();
    expect(leakCounters().timers).toBe(0);
  });

  it('bounded() gives up on a movie that never ends, and not while paused', async () => {
    const never = new Promise<number>(() => undefined);
    const r = bounded(scope, () => false, never, 1000);
    await vi.advanceTimersByTimeAsync(1001);
    expect(await r).toBe('timeout');
    const ok = bounded(scope, () => false, Promise.resolve(7), 1000);
    expect(await ok).toBe(7);
    let open = true;
    const held = bounded(scope, () => open, never, 1000);
    await vi.advanceTimersByTimeAsync(5000);
    open = false;
    await vi.advanceTimersByTimeAsync(1001);
    expect(await held).toBe('timeout');
  });
});
