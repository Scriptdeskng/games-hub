import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import type { Action, GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { personaById } from './personas';

export * from './brains';
export * from './personas';

export type Cpu = CpuOpponent<GameState, Action>;

/**
 * Who sits at the table. One CPU sits opposite (Yellow): Funmi, Baba Ade or Malam Sani, picked by
 * seed. Three CPUs sit in their affinity seats (asset brief section 2): Funmi at Green (seat 1),
 * Malam Sani at Yellow (seat 2), Baba Ade at Indigo (seat 3). The same seed always seats the same people.
 */
export function pickPersonas(seed: number, count: number): string[] {
  if (count <= 1) return [createRng(seed ^ 0x5eed).pick(['funmi', 'baba-ade', 'malam-sani'])];
  return ['funmi', 'malam-sani', 'baba-ade'];
}

/** Build the CPU opponents of one game: every CPU owns its own seeded rng and a stateless brain. */
export function createOpponents(o: {
  seed: number;
  difficulty: Difficulty;
  seats: readonly { id: string; persona: string }[];
}): Cpu[] {
  return o.seats.map((seat, i) =>
    createCpu<GameState, Action>({
      id: seat.id,
      persona: personaById(seat.persona),
      difficulty: o.difficulty,
      seed: (o.seed + 1 + i * 7919) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() },
    }),
  );
}
