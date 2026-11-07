import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import type { Action, GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import type { PlannerCache } from './planner';
import { personaById } from './personas';

export * from './brains';
export * from './personas';
export * from './planner';

export type Cpu = CpuOpponent<GameState, Action>;

/**
 * Which personas sit at the table: Tari and Efe in a seeded order, and for three opponents a
 * third seat that alternates by the stored game counter: Funmi (Yoruba, Lagos) on even counts,
 * Aisha (Hausa) on odd ones. Never random per round: the same seed and counter seat the same people.
 */
export function pickPersonas(seed: number, count: number, gameCounter = 0): string[] {
  const pair = createRng(seed ^ 0x5eed).shuffle(['tari', 'efe']);
  const third = gameCounter % 2 === 0 ? 'funmi' : 'aisha';
  return [...pair, third].slice(0, Math.max(1, Math.min(3, count)));
}

/**
 * Build the CPU opponents of one game. Hard CPUs share the planner cache you pass in (solved once, lazily).
 * `ids` are the seat ids, in seat order, with the persona each one plays.
 */
export function createOpponents(o: {
  seed: number;
  difficulty: Difficulty;
  seats: readonly { id: string; persona: string }[];
  /** the planner cache of this game's app (shared by its Hard CPUs) */
  planners?: PlannerCache;
}): Cpu[] {
  return o.seats.map((seat, i) =>
    createCpu<GameState, Action>({
      id: seat.id,
      persona: personaById(seat.persona),
      difficulty: o.difficulty,
      seed: (o.seed + 1 + i * 7919) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain(o.planners) },
    }),
  );
}
