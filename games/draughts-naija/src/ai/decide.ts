import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import { applyMove, legalMoves, type GameState } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { profileFor } from './profiles';
import { searchBest } from './search';

export interface Decision {
  move: Move;
  /** deepest completed search iteration (0: no search, e.g. a forced move or a blunder) */
  depth: number;
  nodes: number;
}

/** The seed of one decision: a pure function of the game seed and the ply, so replays match. */
export const decisionSeed = (gameSeed: number, plies: number): number =>
  (Math.imul(gameSeed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(plies + 1, 0xc2b2ae35)) >>> 0;

/**
 * The CPU's move: a pure function of the position, the level and the seed (so the Web Worker, the
 * main-thread fallback and the Node tests all agree). `maxNodes` can only lower the level's budget.
 */
export function decide(
  s: GameState,
  difficulty: Difficulty,
  seed: number,
  maxNodes?: number,
): Decision {
  const moves = legalMoves(s);
  if (moves.length === 0) throw new Error('decide: the game is over');
  const only = moves[0] as Move;
  if (moves.length === 1) return { move: only, depth: 0, nodes: 0 };
  const rng = createRng(seed);
  const p = profileFor(difficulty, maxNodes);
  // a slip: a random legal move (decided first, so the rng stream does not depend on the search)
  if (rng.chance(p.blunder)) return { move: rng.pick(moves), depth: 0, nodes: 0 };

  const opts = { maxDepth: p.maxDepth, maxNodes: p.maxNodes, tie: p.tie };
  let r = searchBest(s.board, s.turn, s.rules, opts);
  // do not throw a won game away: if the best move draws by repetition or the king rule while the
  // search says we are clearly ahead, look for another move
  if (r.value > 60 && drawsAt(s, r.best)) {
    const again = searchBest(s.board, s.turn, s.rules, { ...opts, avoid: (m) => drawsAt(s, m) });
    r = { ...again, nodes: r.nodes + again.nodes };
  }
  return { move: r.near.length > 1 ? rng.pick(r.near) : r.best, depth: r.depth, nodes: r.nodes };
}

const drawsAt = (s: GameState, m: Move): boolean => {
  const r = applyMove(s, m).result;
  return r !== null && r.winner === null;
};
