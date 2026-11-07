import { PROFILES, withMistakes, type Brain } from '@naija/core/ai-kit';
import { resolveLanding } from '../rules/board';
import { jumpMap } from '../rules/layout';
import { currentPlayer, type Action, type GameState } from '../rules/engine';
import { createPlanner, type Planner } from './planner';

/** Every CPU decision is a function of the whole game state (the current player is the CPU). */
export type CpuBrain = Brain<GameState, Action>;

const turnIndex = (s: GameState): number =>
  (s.turns.taken[s.turns.index] ?? 0) % Math.max(1, s.rules.choiceEvery);

/** Easy: random choices. */
export const easyBrain: CpuBrain = {
  decide(s, rng) {
    switch (s.phase) {
      case 'pick':
        return { type: 'pick', index: rng.chance(0.5) ? 1 : 0 };
      case 'decide':
        return rng.chance(0.2) && currentPlayer(s).rerollLeft
          ? { type: 'reroll' }
          : { type: 'accept' };
      default:
        return { type: 'roll' };
    }
  },
};

/** Medium's rules of thumb, played perfectly. */
const sensible: CpuBrain = {
  decide(s) {
    const me = currentPlayer(s);
    const jumps = jumpMap(s.layout);
    const end = (roll: number): number => resolveLanding(s.layout, s.rules, me.pos, roll, jumps).to;
    switch (s.phase) {
      case 'pick': {
        const [a, b] = s.dice as [number, number];
        return { type: 'pick', index: end(b) > end(a) ? 1 : 0 };
      }
      case 'decide': {
        if (!me.rerollLeft) return { type: 'accept' };
        const land = resolveLanding(s.layout, s.rules, me.pos, s.roll as number, jumps);
        const dodge = land.via === 'snake' || (land.overshoot && me.pos >= 90);
        return { type: dodge ? 'reroll' : 'accept' };
      }
      default:
        return { type: 'roll' };
    }
  },
};

/**
 * Medium: sensible rules of thumb. Keep the die that ends highest on the board (ladders good,
 * snakes bad); spend the re-roll to dodge a snake, or when an overshoot threatens the finish.
 * Like a casual human it sometimes slips: at the profile's mistake rate it decides at random.
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

/** Hard: exact expected-turns tables (see planner.ts), built lazily on the first decision. */
export function createHardBrain(shared?: { planner?: Planner }): CpuBrain {
  const cache = shared ?? {};
  const planner = (s: GameState): Planner => (cache.planner ??= createPlanner(s.layout, s.rules));
  return {
    decide(s) {
      const me = currentPlayer(s);
      switch (s.phase) {
        case 'pick':
          return {
            type: 'pick',
            index: planner(s).pick(
              me.pos,
              turnIndex(s),
              me.rerollLeft && s.rules.reroll,
              s.dice as [number, number],
            ),
          };
        case 'decide':
          return {
            type:
              me.rerollLeft && planner(s).shouldReroll(me.pos, turnIndex(s), s.roll as number)
                ? 'reroll'
                : 'accept',
          };
        default:
          return { type: 'roll' };
      }
    },
  };
}
