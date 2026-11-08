import type { Brain } from '@naija/core/ai-kit';
import type { Rng } from '@naija/core/rng';
import type { Difficulty, QuizQuestion } from '../rules/config';

/** What a duel contestant is shown. Never the answer index of the player, only the question. */
export interface BuzzContext {
  q: QuizQuestion;
  limitMs: number;
}
/** Which option it buzzes, and how long after the question appeared. */
export interface Buzz {
  choice: number;
  atMs: number;
}

/**
 * Contestant tuning (asset brief section 9), on the fixed 15 s duel clock:
 *  - Chidi (Easy): about 55 percent right, buzzes fast but sloppily (6 to 11 s).
 *  - Dung (Medium): about 72 percent right, "wait and strike" late and sure (8 to 12 s).
 *  - Aisha (Hard): about 88 percent right, quick (3 to 6 s).
 * `adj` shifts the chance by the question's own difficulty (easy +, hard -) so the mix keeps the
 * average at `accuracy`. Hard questions also take a contestant 10 percent longer to answer.
 */
export interface Tuning {
  accuracy: number;
  buzzMs: readonly [number, number];
  adj: Readonly<Record<Difficulty, number>>;
}
const ADJ = { easy: 0.07, medium: 0, hard: -0.14 } as const;
export const TUNING: Readonly<Record<Difficulty, Tuning>> = {
  easy: { accuracy: 0.55, buzzMs: [6000, 11000], adj: ADJ },
  medium: { accuracy: 0.72, buzzMs: [8000, 12000], adj: ADJ },
  hard: { accuracy: 0.88, buzzMs: [3000, 6000], adj: ADJ },
};

/** Chance this contestant knows a question of this difficulty. */
export const knowChance = (t: Tuning, qd: Difficulty): number =>
  Math.min(0.97, Math.max(0.05, t.accuracy + t.adj[qd]));

/** Seeded decision: right answer with `knowChance`, else a uniformly random WRONG option. */
export function buzzBrain(t: Tuning): Brain<BuzzContext, Buzz> {
  return {
    decide({ q, limitMs }, rng: Rng): Buzz {
      const knows = rng.chance(knowChance(t, q.difficulty));
      const wrong = [0, 1, 2, 3].filter((i) => i !== q.answer);
      const choice = knows ? q.answer : rng.pick(wrong);
      const slow = q.difficulty === 'hard' ? 1.1 : 1;
      const atMs = Math.round(rng.range(t.buzzMs[0], t.buzzMs[1]) * slow);
      // always buzzes before the clock runs out
      return { choice, atMs: Math.min(atMs, limitMs - 500) };
    },
  };
}
