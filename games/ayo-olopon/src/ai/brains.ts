import { PROFILES, withMistakes, type Brain } from '@naija/core/ai-kit';
import type { Rng } from '@naija/core/rng';
import { capture, sow } from '../rules/board';
import { currentSide, legalMoves, type Action, type GameState, type Move } from '../rules/engine';
import { searchBest, type SearchOptions } from './search';

/** Every CPU decision is a function of the whole (public) game state; the current player is the CPU. */
export type CpuBrain = Brain<GameState, Action>;

const move = (m: Move | number): Action => ({
  type: 'move',
  pit: typeof m === 'number' ? m : m.pit,
});

/** Easy: a random legal move. */
export const easyBrain: CpuBrain = {
  decide: (s, rng) => move(rng.pick(legalMoves(s))),
};

/** Seeds a move would capture, one ply ahead. */
export function gainOf(s: GameState, m: Move): number {
  const pits = s.pits.slice();
  const { last } = sow(pits, m.pit, s.rules);
  return capture(pits, last, currentSide(s), s.rules);
}

/** The most greedy legal move: the biggest capture now; ties (including "no capture") are random. */
const greedy = (s: GameState, rng: Rng): Action => {
  const moves = legalMoves(s);
  const gains = moves.map((m) => gainOf(s, m));
  const top = Math.max(...gains);
  return move(rng.pick(moves.filter((_, i) => gains[i] === top)));
};

/**
 * Medium: greedy 1-ply (take the biggest capture, otherwise any move). Like a casual human it
 * sometimes slips: at the profile's mistake rate it plays a random legal move instead.
 */
export const mediumBrain: CpuBrain = {
  decide: (s, rng) =>
    withMistakes(
      rng,
      PROFILES.medium.mistakeRate,
      () => greedy(s, rng),
      () => easyBrain.decide(s, rng),
    ),
};

/** Hard searches 8 plies deep within a node budget (see search.ts). */
export const HARD_SEARCH: Readonly<SearchOptions> = { maxDepth: 8, maxNodes: 24000 };
/** Hints use a cheaper, shallower search so tapping Hint is instant. */
export const HINT_SEARCH: Readonly<SearchOptions> = { maxDepth: 5, maxNodes: 4000 };

/** The pits the search rates best (ties), for the CPU and for the hint button. */
export function bestPits(s: GameState, o: SearchOptions = HARD_SEARCH): number[] {
  return searchBest(s.pits, s.store, currentSide(s), s.rules, s.plies, o).best;
}

/**
 * Hard: alpha-beta search with iterative deepening. Stateless between decisions (nothing is cached
 * across calls), so there is nothing to share or leak between games. Its rng only breaks exact ties.
 */
export function createHardBrain(o: SearchOptions = HARD_SEARCH): CpuBrain {
  return {
    decide: (s, rng) => move(rng.pick(bestPits(s, o))),
  };
}
