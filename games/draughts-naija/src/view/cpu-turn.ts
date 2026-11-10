import type { Scope } from '@naija/core/lifecycle';
import type { AiRequestHandle, Thought } from '../ai';
import type { Move } from '../rules/movegen';

/**
 * The CPU's choice for one turn, with a hard wall-clock guarantee: whatever happens to the worker, the
 * request or the think-delay timer, a move comes back within `watchdogMs` (while the game is not paused),
 * so the game can never sit on "X is thinking...". The watchdog is independent of the animation tempo.
 */
export interface CpuTurnDeps {
  scope: Scope;
  /** send the position to the AI client */
  request(): AiRequestHandle;
  /** the persona's thinking pause (already scaled by tempo, and gated by pause) */
  sleep(ms: number): Promise<void>;
  delay: number;
  /** the pause dialog is open: the watchdog waits (a paused game is not stalled) */
  modalOpen(): boolean;
  /** a small main-thread search: used when the watchdog fires */
  fallback(): Move;
  watchdogMs?: number;
  /** which await is pending, for the test trace */
  onPhase?(phase: string): void;
}

export interface CpuChoice {
  move: Move;
  thought: Thought | null;
  /** 'watchdog': the worker path did not finish in time and the fallback search chose */
  via: 'worker' | 'main' | 'watchdog';
}

/** Generous: a Hard search is a few tenths of a second even on a throttled phone. */
export const WATCHDOG_MS = 8000;

/** Resolves with the move, or null if the request was cancelled (the game is being torn down). */
export async function chooseCpuMove(d: CpuTurnDeps): Promise<CpuChoice | null> {
  const phase = d.onPhase ?? ((): void => undefined);
  phase('cpu:request');
  const req = d.request();
  let bark!: () => void;
  const barked = new Promise<'dog'>((r) => (bark = () => r('dog')));
  let off: () => void = () => undefined;
  const arm = (): void => {
    off = d.scope.timeout(() => (d.modalOpen() ? arm() : bark()), d.watchdogMs ?? WATCHDOG_MS);
  };
  arm();
  phase('cpu:waiting');
  const got = await Promise.race([req.result.then((t) => ({ t })), barked]);
  // the answer is in (or the dog barked); the think pause may still be running: wait for it too, still guarded
  if (got !== 'dog' && got.t) {
    phase('cpu:think-pause');
    const slept = await Promise.race([d.sleep(d.delay).then(() => 'ok' as const), barked]);
    off();
    if (slept === 'dog') return rescue(d, req);
    return { move: got.t.move, thought: got.t, via: got.t.via };
  }
  off();
  if (got === 'dog') return rescue(d, req);
  return null;
}

function rescue(d: CpuTurnDeps, req: AiRequestHandle): CpuChoice {
  d.onPhase?.('cpu:watchdog');
  req.cancel();
  return { move: d.fallback(), thought: null, via: 'watchdog' };
}

/**
 * Wait for `p`, but never longer than `ms` of wall clock outside a pause: resolves 'timeout' then.
 * Used around the move animation, so a movie that cannot finish still leaves the game moving.
 */
export function bounded<T>(
  scope: Scope,
  modalOpen: () => boolean,
  p: Promise<T>,
  ms = WATCHDOG_MS,
): Promise<T | 'timeout'> {
  return new Promise((resolve) => {
    let off: () => void = () => undefined;
    const arm = (): void => {
      off = scope.timeout(() => (modalOpen() ? arm() : resolve('timeout')), ms);
    };
    arm();
    void p.then((v) => {
      off();
      resolve(v);
    });
  });
}
