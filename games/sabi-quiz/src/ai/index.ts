import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import type { Difficulty } from '../rules/config';
import { TUNING, buzzBrain, type Buzz, type BuzzContext } from './brains';
import { CONTESTANT_OF, personaById } from './personas';

export * from './brains';
export * from './personas';

export type Contestant = CpuOpponent<BuzzContext, Buzz>;

/** The duel contestant of one difficulty, with its own seeded rng. */
export function createContestant(o: { seed: number; difficulty: Difficulty }): Contestant {
  const id = CONTESTANT_OF[o.difficulty];
  return createCpu<BuzzContext, Buzz>({
    id,
    persona: personaById(id),
    difficulty: o.difficulty,
    seed: (o.seed + 104729) >>> 0,
    brains: {
      easy: buzzBrain(TUNING.easy),
      medium: buzzBrain(TUNING.medium),
      hard: buzzBrain(TUNING.hard),
    },
  });
}
