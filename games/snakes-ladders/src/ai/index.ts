import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import type { Action, GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { personaById } from './personas';
import type { Planner } from './planner';

export * from './brains';
export * from './personas';
export * from './planner';

export type Cpu = CpuOpponent<GameState, Action>;

/**
 * Which personas sit at the table: Tari and Efe in a seeded order, Aisha joining for three
 * opponents. The same seed always seats the same personas.
 */
export function pickPersonas(seed: number, count: number): string[] {
  const pair = createRng(seed ^ 0x5eed).shuffle(['tari', 'efe']);
  return [...pair, 'aisha'].slice(0, Math.max(1, Math.min(3, count)));
}

/**
 * Build the CPU opponents of one game. Hard CPUs share one planner (solved once, lazily).
 * `ids` are the seat ids, in seat order, with the persona each one plays.
 */
export function createOpponents(o: {
  seed: number;
  difficulty: Difficulty;
  seats: readonly { id: string; persona: string }[];
}): Cpu[] {
  const shared: { planner?: Planner } = {};
  return o.seats.map((seat, i) =>
    createCpu<GameState, Action>({
      id: seat.id,
      persona: personaById(seat.persona),
      difficulty: o.difficulty,
      seed: (o.seed + 1 + i * 7919) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain(shared) },
    }),
  );
}
