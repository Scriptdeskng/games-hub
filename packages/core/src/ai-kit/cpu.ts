import { createRng, type Rng } from '../rng';
import type { Difficulty } from '../ui-kit/difficulty';
import { thinkDelayMs } from './think';
import { PROFILES, type Brain, type CpuOpponent, type Persona } from './types';

export interface CpuOptions<Ctx, Decision> {
  id: string;
  persona: Persona;
  difficulty: Difficulty;
  /** one brain per difficulty */
  brains: Record<Difficulty, Brain<Ctx, Decision>>;
  seed: number;
}

/**
 * Build a CPU opponent. It owns a seeded rng (separate from the game's dice rng) so a CPU's
 * random choices never disturb dice sequences and every game replays from its seeds.
 */
export function createCpu<Ctx, Decision>(o: CpuOptions<Ctx, Decision>): CpuOpponent<Ctx, Decision> {
  const rng: Rng = createRng(o.seed);
  const profile = PROFILES[o.difficulty];
  const brain = o.brains[o.difficulty];
  return {
    id: o.id,
    persona: o.persona,
    difficulty: o.difficulty,
    profile,
    decide: (ctx) => brain.decide(ctx, rng),
    thinkMs: () => thinkDelayMs(rng, o.persona, profile),
    getRngState: () => rng.getState(),
  };
}

/** With the profile's mistake rate return `random()`, otherwise `best()`. */
export function withMistakes<T>(rng: Rng, mistakeRate: number, best: () => T, random: () => T): T {
  return rng.chance(mistakeRate) ? random() : best();
}
