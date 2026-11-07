import { PROFILES, withMistakes, type Brain } from '@naija/core/ai-kit';
import { isSafeSquare, trackIndex } from '../rules/board';
import { LAST_TRACK } from '../rules/config';
import { currentPlayer, legalMoves, type Action, type GameState, type Move } from '../rules/engine';
import { scoreMove } from './eval';

/** Every CPU decision is a function of the whole (public) game state; the current player is the CPU. */
export type CpuBrain = Brain<GameState, Action>;

const move = (m: Move): Action => ({ type: 'move', seed: m.seed });

/** Easy: a random legal move. */
export const easyBrain: CpuBrain = {
  decide(s, rng) {
    if (s.phase !== 'move') return { type: 'roll' };
    return move(rng.pick(legalMoves(s)));
  },
};

const furthest = (moves: readonly Move[]): Move =>
  moves.reduce((a, b) => (b.from > a.from ? b : a));

/**
 * Medium's rules of thumb, played perfectly: capture (the biggest victim first), get a seed home,
 * come out on a 6, land on a safe square or into the home column, otherwise run the front seed.
 */
const sensible: CpuBrain = {
  decide(s) {
    if (s.phase !== 'move') return { type: 'roll' };
    const moves = legalMoves(s);
    const me = currentPlayer(s);
    const hits = moves.filter((m) => m.captures.length);
    if (hits.length) {
      return move(
        hits.reduce((a, b) =>
          b.captures.reduce((n, c) => n + c.from, 0) > a.captures.reduce((n, c) => n + c.from, 0)
            ? b
            : a,
        ),
      );
    }
    const home = moves.find((m) => m.home);
    if (home) return move(home);
    const release = moves.find((m) => m.release);
    if (release) return move(release);
    const safe = moves.filter((m) => m.to > LAST_TRACK || isSafeSquare(trackIndex(me.slot, m.to)));
    if (safe.length) return move(furthest(safe));
    return move(furthest(moves));
  },
};

/**
 * Medium: prefers captures and safe squares. Like a casual human it sometimes slips: at the
 * profile's mistake rate it plays a random legal move instead.
 */
export const mediumBrain: CpuBrain = {
  decide: (s, rng) =>
    withMistakes(
      rng,
      PROFILES.medium.mistakeRate,
      () => sensible.decide(s, rng),
      () => easyBrain.decide(s, rng),
    ),
};

/**
 * Hard: scores every legal move (capture, threat, progress, safety, release, bonus; see eval.ts)
 * and plays the best, breaking exact ties with its own seeded rng. It keeps no state between
 * decisions, so there is nothing to share or leak between games.
 */
export function createHardBrain(): CpuBrain {
  return {
    decide(s, rng) {
      if (s.phase !== 'move') return { type: 'roll' };
      let best: Move | null = null;
      let bestScore = -Infinity;
      for (const m of legalMoves(s)) {
        const v = scoreMove(s, m) + rng.next() * 0.001;
        if (v > bestScore) {
          bestScore = v;
          best = m;
        }
      }
      return move(best as Move);
    },
  };
}
