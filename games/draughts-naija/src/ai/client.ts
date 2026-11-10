import type { Scope } from '@naija/core/lifecycle';
import type { Difficulty } from '@naija/core/ui-kit';
import type { GameState } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { decisionSeed } from './decide';
import { FALLBACK_NODES } from './profiles';
import { handleRequest, type AiRequest, type AiResponse } from './protocol';

/** The slice of the Worker API the client uses (a fake implements it in the tests). */
export interface WorkerLike {
  postMessage(msg: AiRequest): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessageerror?: ((e: unknown) => void) | null;
}

export interface Thought {
  move: Move;
  depth: number;
  nodes: number;
  /** wall time from the request to the answer */
  ms: number;
  /** who computed it: the Web Worker, or this thread within the fallback budget */
  via: 'worker' | 'main';
}

export interface AiClientOptions {
  /** every timer of the client lives in this scope (the game's), so destroy cannot leak one */
  scope: Scope;
  /** how to make a worker; omit (or throw) to run on the main thread */
  createWorker?: () => WorkerLike;
  /** a worker that has not answered after this long is terminated and the search runs here */
  timeoutMs?: number;
  /** the node budget of a main-thread search */
  fallbackNodes?: number;
  now?: () => number;
}

export interface AiStats {
  requests: number;
  workerAnswers: number;
  mainAnswers: number;
  cancelled: number;
  timeouts: number;
  /** worker construction failures and worker errors */
  workerFailures: number;
  lastMs: number;
  maxMs: number;
  lastNodes: number;
  lastDepth: number;
}

export interface AiRequestHandle {
  readonly id: number;
  /** resolves with the move, or with null if the request was cancelled or the client destroyed */
  result: Promise<Thought | null>;
  cancel(): void;
}

export interface AiClient {
  /** ask for the CPU's move in `state` (the side to move is the CPU) */
  request(state: GameState, difficulty: Difficulty): AiRequestHandle;
  /** start the worker now (so its start-up cost is paid on the menu, not on the first move) */
  warm(): void;
  /** 'worker' while a worker is usable, 'main' once the client runs on this thread */
  readonly mode: 'worker' | 'main' | 'idle';
  readonly stats: Readonly<AiStats>;
  destroy(): void;
}

interface Pending {
  req: AiRequest;
  t0: number;
  resolve(t: Thought | null): void;
  /** posted to the worker (as opposed to waiting for the main thread) */
  onWorker: boolean;
  offTimer: () => void;
}

export function createAiClient(o: AiClientOptions): AiClient {
  const now = o.now ?? ((): number => performance.now());
  const timeoutMs = o.timeoutMs ?? 6000;
  const fallbackNodes = o.fallbackNodes ?? FALLBACK_NODES;
  const pending = new Map<number, Pending>();
  const stats: AiStats = {
    requests: 0,
    workerAnswers: 0,
    mainAnswers: 0,
    cancelled: 0,
    timeouts: 0,
    workerFailures: 0,
    lastMs: 0,
    maxMs: 0,
    lastNodes: 0,
    lastDepth: 0,
  };
  let worker: WorkerLike | null = null;
  let seq = 0;
  let destroyed = false;
  /** the worker could not be built, died or hung: everything runs on this thread from now on */
  let mainOnly = !o.createWorker;

  function killWorker(): void {
    const w = worker;
    worker = null;
    if (!w) return;
    w.onmessage = null;
    w.onerror = null;
    if ('onmessageerror' in w) w.onmessageerror = null;
    try {
      w.terminate();
    } catch {
      /* already gone */
    }
  }

  function settle(id: number, r: Omit<Thought, 'ms'> | null): void {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    p.offTimer();
    if (!r) return p.resolve(null);
    const ms = now() - p.t0;
    stats.lastMs = ms;
    stats.maxMs = Math.max(stats.maxMs, ms);
    stats.lastNodes = r.nodes;
    stats.lastDepth = r.depth;
    if (r.via === 'worker') stats.workerAnswers++;
    else stats.mainAnswers++;
    p.resolve({ ...r, ms });
  }

  /** run the request here, within the small budget, after the browser had a chance to paint */
  function runMain(id: number): void {
    const p = pending.get(id);
    if (!p) return;
    p.onWorker = false;
    p.offTimer();
    p.offTimer = o.scope.timeout(() => {
      const q = pending.get(id);
      if (!q) return;
      const cap = Math.min(q.req.maxNodes ?? fallbackNodes, fallbackNodes);
      const res: AiResponse = handleRequest({ ...q.req, maxNodes: cap });
      if (res.type === 'move')
        settle(id, { move: res.move, depth: res.depth, nodes: res.nodes, via: 'main' });
      else settle(id, null);
    }, 0);
  }

  /** the worker is unusable (cannot start, crashed, hung): finish every request on this thread */
  function fallBack(): void {
    mainOnly = true;
    killWorker();
    for (const id of [...pending.keys()]) runMain(id);
  }

  function ensureWorker(): WorkerLike | null {
    if (destroyed || mainOnly) return null;
    if (worker) return worker;
    try {
      const w = (o.createWorker as () => WorkerLike)();
      w.onmessage = (e): void => {
        const m = e.data as AiResponse | null;
        if (!m || typeof m !== 'object' || !pending.has(m.id)) return; // a late answer: drop it
        if (m.type === 'move')
          settle(m.id, { move: m.move, depth: m.depth, nodes: m.nodes, via: 'worker' });
        else {
          stats.workerFailures++;
          runMain(m.id);
        }
      };
      w.onerror = (): void => {
        stats.workerFailures++;
        fallBack();
      };
      w.onmessageerror = w.onerror;
      worker = w;
      return w;
    } catch {
      stats.workerFailures++;
      mainOnly = true;
      return null;
    }
  }

  function dispatch(id: number): void {
    const p = pending.get(id);
    if (!p) return;
    const w = ensureWorker();
    if (!w) return runMain(id);
    p.onWorker = true;
    p.offTimer();
    p.offTimer = o.scope.timeout(() => {
      // the worker is stuck (or very slow): give up on it and answer here
      if (!pending.has(id)) return;
      stats.timeouts++;
      fallBack();
    }, timeoutMs);
    try {
      w.postMessage(p.req);
    } catch {
      stats.workerFailures++;
      fallBack();
    }
  }

  return {
    request(state, difficulty) {
      const id = ++seq;
      stats.requests++;
      let resolve!: (t: Thought | null) => void;
      const result = new Promise<Thought | null>((r) => (resolve = r));
      if (destroyed) {
        resolve(null);
        return { id, result, cancel: () => undefined };
      }
      pending.set(id, {
        req: { type: 'search', id, state, difficulty, seed: decisionSeed(state.seed, state.plies) },
        t0: now(),
        resolve,
        onWorker: false,
        offTimer: () => undefined,
      });
      dispatch(id);
      return {
        id,
        result,
        cancel() {
          const p = pending.get(id);
          if (!p) return;
          stats.cancelled++;
          const wasOnWorker = p.onWorker;
          settle(id, null);
          if (wasOnWorker && worker) {
            // a worker cannot be interrupted mid-search: end it, the next request starts a fresh one
            killWorker();
            for (const other of pending.keys()) dispatch(other);
          }
        },
      };
    },
    warm() {
      ensureWorker();
    },
    get mode() {
      return worker ? 'worker' : mainOnly ? 'main' : 'idle';
    },
    stats,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      killWorker();
      for (const id of [...pending.keys()]) settle(id, null);
    },
  };
}
