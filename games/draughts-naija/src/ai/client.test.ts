import { createScope, leakCounters } from '@naija/core/lifecycle';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRules } from '../rules/config';
import { createGame, findMove, legalMoves, type GameState } from '../rules/engine';
import { createAiClient, type AiClientOptions, type WorkerLike } from './client';
import { decide, decisionSeed } from './decide';
import { FALLBACK_NODES } from './profiles';
import { handleRequest, isRequest, type AiRequest, type AiResponse } from './protocol';

/** A worker that records what it is sent; the test decides when and how it answers. */
class FakeWorker implements WorkerLike {
  sent: AiRequest[] = [];
  terminated = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessageerror: ((e: unknown) => void) | null = null;
  postMessage(m: AiRequest): void {
    this.sent.push(m);
  }
  terminate(): void {
    this.terminated = true;
  }
  /** answer like the real worker script does */
  answer(i = this.sent.length - 1): void {
    this.reply(handleRequest(this.sent[i] as AiRequest));
  }
  reply(r: unknown): void {
    this.onmessage?.({ data: r });
  }
}

const game = (size: 10 | 8 = 10, seed = 5): GameState =>
  createGame({ seed, rules: makeRules(size) });

describe('AI worker client (fake worker)', () => {
  let scope = createScope();
  let workers: FakeWorker[] = [];
  const make = (o: Partial<AiClientOptions> = {}) =>
    createAiClient({
      scope,
      createWorker: () => {
        const w = new FakeWorker();
        workers.push(w);
        return w;
      },
      ...o,
    });
  beforeEach(() => {
    vi.useFakeTimers();
    scope = createScope();
    workers = [];
  });
  afterEach(() => {
    scope.destroy();
    vi.useRealTimers();
  });

  it('posts the request with an id, the level and a seed that depends only on the game', async () => {
    const c = make();
    const s = game();
    const h = c.request(s, 'hard');
    const w = workers[0] as FakeWorker;
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0]).toMatchObject({
      type: 'search',
      id: h.id,
      difficulty: 'hard',
      seed: decisionSeed(5, 0),
    });
    expect(JSON.parse(JSON.stringify(w.sent[0]))).toEqual(w.sent[0]); // plain data
    w.answer();
    const t = await h.result;
    expect(t?.via).toBe('worker');
    expect(findMove(s, t!.move)).not.toBeNull();
    expect(c.stats).toMatchObject({ requests: 1, workerAnswers: 1, mainAnswers: 0 });
    expect(c.mode).toBe('worker');
  });

  it('the worker answer equals the answer computed on the main thread (same seed, same level)', async () => {
    const c = make();
    const s = game(8, 9);
    const h = c.request(s, 'medium');
    (workers[0] as FakeWorker).answer();
    const t = await h.result;
    expect(t!.move).toEqual(decide(s, 'medium', decisionSeed(s.seed, s.plies)).move);
  });

  it('matches answers to requests by id and drops late or unknown ones', async () => {
    const c = make();
    const s = game();
    const a = c.request(s, 'easy');
    const b = c.request(s, 'easy');
    const w = workers[0] as FakeWorker;
    expect(workers).toHaveLength(1); // one worker, reused
    w.reply({ type: 'move', id: 999, move: legalMoves(s)[0], depth: 1, nodes: 1 }); // unknown id
    w.reply(null);
    w.reply('junk');
    w.answer(1); // b first
    const tb = await b.result;
    expect(tb).not.toBeNull();
    w.answer(0);
    expect(await a.result).not.toBeNull();
    w.answer(0); // a second answer to a finished request is ignored
    expect(c.stats.workerAnswers).toBe(2);
  });

  it('cancel resolves null, ends the busy worker and a new request gets a fresh worker', async () => {
    const c = make();
    const s = game();
    const h = c.request(s, 'hard');
    const first = workers[0] as FakeWorker;
    h.cancel();
    expect(await h.result).toBeNull();
    expect(first.terminated).toBe(true);
    expect(c.stats.cancelled).toBe(1);
    first.reply({ type: 'move', id: h.id, move: legalMoves(s)[0], depth: 1, nodes: 1 }); // a straggler
    const next = c.request(s, 'hard');
    expect(workers).toHaveLength(2);
    (workers[1] as FakeWorker).answer();
    expect(await next.result).not.toBeNull();
    h.cancel(); // cancelling twice is harmless
    expect(c.stats.cancelled).toBe(1);
  });

  it('cancelling one request re-sends the others to the fresh worker', async () => {
    const c = make();
    const s = game();
    const a = c.request(s, 'easy');
    const b = c.request(s, 'easy');
    a.cancel();
    expect(workers).toHaveLength(2);
    expect((workers[1] as FakeWorker).sent.map((m) => m.id)).toEqual([b.id]);
    (workers[1] as FakeWorker).answer();
    expect(await b.result).not.toBeNull();
  });

  it('falls back to the main thread, within a small node budget, when the worker cannot be built', async () => {
    const c = createAiClient({
      scope,
      createWorker: () => {
        throw new Error('no module workers here');
      },
    });
    const h = c.request(game(), 'hard');
    expect(c.mode).toBe('main');
    await vi.advanceTimersByTimeAsync(1); // the search runs after a tick so the UI can paint first
    const t = await h.result;
    expect(t?.via).toBe('main');
    expect(t!.nodes).toBeLessThanOrEqual(FALLBACK_NODES);
    expect(c.stats).toMatchObject({ mainAnswers: 1, workerFailures: 1 });
  });

  it('runs on the main thread when no worker factory is given', async () => {
    const c = createAiClient({ scope, fallbackNodes: 50 });
    const h = c.request(game(8), 'hard');
    await vi.advanceTimersByTimeAsync(1);
    const t = await h.result;
    expect(t!.nodes).toBeLessThanOrEqual(50);
    expect(c.mode).toBe('main');
  });

  it('a worker error moves every pending request to the main thread and stops using the worker', async () => {
    const c = make();
    const s = game();
    const a = c.request(s, 'easy');
    const b = c.request(s, 'medium');
    const w = workers[0] as FakeWorker;
    w.onerror?.(new Error('boom'));
    expect(w.terminated).toBe(true);
    expect(c.mode).toBe('main');
    await vi.advanceTimersByTimeAsync(1);
    expect((await a.result)?.via).toBe('main');
    expect((await b.result)?.via).toBe('main');
    c.request(s, 'easy');
    expect(workers).toHaveLength(1); // no second worker once it has failed
  });

  it('an error reply makes that one request run on the main thread', async () => {
    const c = make();
    const s = game();
    const h = c.request(s, 'easy');
    (workers[0] as FakeWorker).reply({
      type: 'error',
      id: h.id,
      message: 'bad',
    } satisfies AiResponse);
    await vi.advanceTimersByTimeAsync(1);
    expect((await h.result)?.via).toBe('main');
    expect(c.mode).toBe('worker'); // the worker itself is still fine
  });

  it('a worker that never answers is terminated after the timeout and the search runs here', async () => {
    const c = make({ timeoutMs: 3000 });
    const h = c.request(game(), 'hard');
    const w = workers[0] as FakeWorker;
    await vi.advanceTimersByTimeAsync(2999);
    expect(w.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(w.terminated).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    const t = await h.result;
    expect(t?.via).toBe('main');
    expect(c.stats.timeouts).toBe(1);
    expect(c.mode).toBe('main');
  });

  it('an answer that arrives in time cancels the timeout', async () => {
    const c = make({ timeoutMs: 3000 });
    const h = c.request(game(), 'easy');
    (workers[0] as FakeWorker).answer();
    await h.result;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(c.stats.timeouts).toBe(0);
    expect(leakCounters().timers).toBe(0);
  });

  it('warm() starts the worker once, before the first request', () => {
    const c = make();
    c.warm();
    c.warm();
    expect(workers).toHaveLength(1);
    expect(c.mode).toBe('worker');
    c.request(game(), 'easy');
    expect(workers).toHaveLength(1);
  });

  it('destroy terminates the worker, resolves pending requests with null and leaves no timer behind', async () => {
    const before = leakCounters().timers;
    const c = make();
    const a = c.request(game(), 'hard');
    c.destroy();
    expect((workers[0] as FakeWorker).terminated).toBe(true);
    expect(await a.result).toBeNull();
    expect(leakCounters().timers).toBe(before);
    const late = c.request(game(), 'easy'); // after destroy nothing starts
    expect(await late.result).toBeNull();
    expect(workers).toHaveLength(1);
    c.destroy(); // twice is fine
  });

  it('records think times for the perf report', async () => {
    let t = 1000;
    const c = make({ now: () => t });
    const h = c.request(game(), 'easy');
    t += 420;
    (workers[0] as FakeWorker).answer();
    await h.result;
    expect(c.stats.lastMs).toBe(420);
    expect(c.stats.maxMs).toBe(420);
    expect(c.stats.lastNodes).toBeGreaterThanOrEqual(0);
  });
});

describe('protocol and worker script', () => {
  it('handleRequest answers with a legal move, and an error (not a throw) for a finished game', () => {
    const s = game(8);
    const r = handleRequest({ type: 'search', id: 7, state: s, difficulty: 'easy', seed: 1 });
    expect(r).toMatchObject({ type: 'move', id: 7 });
    if (r.type === 'move') expect(findMove(s, r.move)).not.toBeNull();
    const over = { ...s, result: { winner: 0, reason: 'blocked' } } as GameState;
    expect(
      handleRequest({ type: 'search', id: 8, state: over, difficulty: 'easy', seed: 1 }),
    ).toMatchObject({
      type: 'error',
      id: 8,
    });
  });
  it('isRequest accepts requests only', () => {
    const ok = { type: 'search', id: 1, state: game(), difficulty: 'easy', seed: 1 };
    expect(isRequest(ok)).toBe(true);
    for (const bad of [
      null,
      undefined,
      5,
      {},
      { ...ok, type: 'x' },
      { ...ok, id: '1' },
      { ...ok, state: null },
    ])
      expect(isRequest(bad)).toBe(false);
  });
  it('worker.ts answers requests by posting a response and ignores anything else', async () => {
    vi.resetModules();
    const posted: unknown[] = [];
    const scope = self as unknown as {
      onmessage: ((e: { data: unknown }) => void) | null;
      postMessage: unknown;
    };
    const spy = vi
      .spyOn(self, 'postMessage')
      .mockImplementation(((m: unknown) => void posted.push(m)) as never);
    await import('./worker');
    const s = game(8);
    scope.onmessage?.({ data: { type: 'search', id: 3, state: s, difficulty: 'easy', seed: 2 } });
    scope.onmessage?.({ data: 'noise' });
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: 'move', id: 3 });
    spy.mockRestore();
    scope.onmessage = null;
  });
});
