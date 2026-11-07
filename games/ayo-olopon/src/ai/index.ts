import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import type { Difficulty } from '@naija/core/ui-kit';
import type { Action, GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { PERSONA_OF, personaById } from './personas';

export * from './brains';
export * from './personas';
export { searchBest, type SearchOptions, type SearchResult } from './search';

export type Cpu = CpuOpponent<GameState, Action>;

/** Build the CPU opponent of one game: it owns its seeded rng and a stateless brain. */
export function createOpponent(o: { id: string; seed: number; difficulty: Difficulty }): Cpu {
  return createCpu<GameState, Action>({
    id: o.id,
    persona: personaById(PERSONA_OF[o.difficulty]),
    difficulty: o.difficulty,
    seed: (o.seed + 7919) >>> 0,
    brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() },
  });
}
