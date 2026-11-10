import type { Difficulty } from '@naija/core/ui-kit';

/**
 * How hard each level thinks. Difficulty is the search budget plus a chance of a plain mistake:
 *  - `maxDepth` / `maxNodes`: iterative deepening stops at either (a node cap, not a clock, so a game
 *    replays identically on every phone);
 *  - `blunder`: the chance, per free choice, of playing a random legal move instead (decided with the
 *    game's seeded rng, so a game is reproducible). A forced capture is never a blunder: there is
 *    only one thing to play, or the rules decide.
 *  - `tie`: moves within this many points of the best may be chosen at random, for variety.
 */
export interface AiProfile {
  maxDepth: number;
  maxNodes: number;
  blunder: number;
  tie: number;
}

export const AI_PROFILES: Readonly<Record<Difficulty, AiProfile>> = {
  // Doosuur: friendly and loose. Two plies, and a random move about one time in three.
  easy: { maxDepth: 2, maxNodes: 400, blunder: 0.3, tie: 12 },
  // Falmata: counts exchanges. Five plies, an occasional slip.
  medium: { maxDepth: 5, maxNodes: 4000, blunder: 0.06, tie: 6 },
  // Damola: solid and deep, no slips.
  hard: { maxDepth: 14, maxNodes: 40000, blunder: 0, tie: 2 },
};

/** The budget used when the Web Worker is unavailable and the search has to run on the main thread. */
export const FALLBACK_NODES = 1500;
export const FALLBACK_DEPTH = 6;

/** The profile with an optional node budget override (tests, fallback). */
export const profileFor = (d: Difficulty, maxNodes?: number): AiProfile => {
  const p = AI_PROFILES[d];
  if (maxNodes === undefined) return p;
  return { ...p, maxNodes: Math.max(1, Math.min(p.maxNodes, Math.floor(maxNodes))) };
};
