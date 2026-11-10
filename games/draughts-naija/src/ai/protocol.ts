import type { Difficulty } from '@naija/core/ui-kit';
import type { GameState } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { decide } from './decide';

/**
 * The message protocol between the main thread and the AI Web Worker. Everything is plain,
 * structured-cloneable data (the whole game state is posted as it is) and every message carries the
 * request id, so a late answer to a cancelled request is recognised and dropped.
 *
 * This module is pure (no DOM, no worker globals): the worker wrapper, the main-thread fallback and
 * the Node tests all call `handleRequest`.
 */
export interface AiRequest {
  type: 'search';
  id: number;
  state: GameState;
  difficulty: Difficulty;
  /** the seed of this decision (see `decisionSeed`): the answer is a pure function of the request */
  seed: number;
  /** lowers the level's node budget (the main-thread fallback uses a small one) */
  maxNodes?: number;
}

export type AiResponse =
  | { type: 'move'; id: number; move: Move; depth: number; nodes: number }
  | { type: 'error'; id: number; message: string };

/** Answer one request. Never throws: a failure comes back as an `error` response. */
export function handleRequest(req: AiRequest): AiResponse {
  try {
    const d = decide(req.state, req.difficulty, req.seed, req.maxNodes);
    return { type: 'move', id: req.id, move: d.move, depth: d.depth, nodes: d.nodes };
  } catch (e) {
    return { type: 'error', id: req.id, message: e instanceof Error ? e.message : 'search failed' };
  }
}

/** Is `x` shaped like a request? (The worker ignores anything else.) */
export const isRequest = (x: unknown): x is AiRequest => {
  const r = x as Partial<AiRequest> | null;
  return !!r && r.type === 'search' && typeof r.id === 'number' && !!r.state && !!r.difficulty;
};
