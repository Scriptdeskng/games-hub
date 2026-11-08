import { createRng, type Rng } from '@naija/core/rng';
import {
  answer,
  answerCpu,
  createRound,
  current,
  next,
  tick,
  type Difficulty,
  type GameState,
  type Mode,
  type QuizQuestion,
} from '../rules';
import { TUNING, buzzBrain } from './brains';

/**
 * A stand-in for the human seat: a fixed knowledge level and answer speed, so the strength of
 * the game can be measured. `accuracy` is the chance to know a question of each difficulty.
 */
export interface HumanBot {
  accuracy: Readonly<Record<Difficulty, number>>;
  /** how long after the question appears the bot answers, ms (uniform) */
  answerMs: readonly [number, number];
}

/** A middling player: sure on easy questions, a coin toss on hard ones, answers in 5 to 9 s. */
export const AVERAGE_BOT: HumanBot = {
  accuracy: { easy: 0.85, medium: 0.65, hard: 0.4 },
  answerMs: [5000, 9000],
};

const choose = (q: QuizQuestion, knows: boolean, rng: Rng): number =>
  knows ? q.answer : rng.pick([0, 1, 2, 3].filter((i) => i !== q.answer));

/** Advance the clock to `atMs` after the question opened (never backwards). */
function advanceTo(s: GameState, atMs: number): GameState {
  const elapsed = s.limitMs - s.timeLeftMs;
  return atMs > elapsed ? tick(s, atMs - elapsed) : s;
}

export interface SimOptions {
  pool: readonly QuizQuestion[];
  mode: Mode;
  difficulty: Difficulty;
  seed: number;
  bot?: HumanBot;
  /** only these categories */
  categories?: readonly string[];
}

/**
 * Play one whole round headlessly with the engine's own functions, in time order: the bot and
 * (in a duel) the contestant act at their own moments on the shared clock; ties go to the bot.
 */
export function playRound(o: SimOptions): GameState {
  const bot = o.bot ?? AVERAGE_BOT;
  const rng = createRng((o.seed ^ 0x9e3779b9) >>> 0);
  const cpuRng = createRng((o.seed + 104729) >>> 0);
  const brain = buzzBrain(TUNING[o.difficulty]);
  let s = createRound({
    pool: o.pool,
    mode: o.mode,
    difficulty: o.difficulty,
    seed: o.seed,
    categories: o.categories,
  });
  while (s.phase !== 'done') {
    const q = current(s);
    const mine = {
      choice: choose(q, rng.chance(bot.accuracy[q.difficulty]), rng),
      atMs: Math.round(rng.range(bot.answerMs[0], bot.answerMs[1])),
    };
    const theirs = s.mode === 'duel' ? brain.decide({ q, limitMs: s.limitMs }, cpuRng) : null;
    const events: ('me' | 'cpu')[] =
      theirs && theirs.atMs < mine.atMs ? ['cpu', 'me'] : theirs ? ['me', 'cpu'] : ['me'];
    for (const who of events) {
      if (s.phase !== 'asking') break;
      if (who === 'me') {
        s = advanceTo(s, mine.atMs);
        s = answer(s, mine.choice);
      } else if (theirs) {
        s = advanceTo(s, theirs.atMs);
        s = answerCpu(s, theirs.choice);
      }
    }
    if (s.phase === 'asking') s = tick(s, s.timeLeftMs); // nobody (left) answered: time up
    s = next(s);
  }
  return s;
}

export interface Summary {
  rounds: number;
  /** mean per round */
  score: number;
  cpuScore: number;
  correct: number;
  timeouts: number;
  /** share of rounds the human won (duel) */
  humanWins: number;
}

/** Mean results over `rounds` seeded rounds starting at `seed`. */
export function simulate(o: Omit<SimOptions, 'seed'> & { rounds: number; seed?: number }): Summary {
  const base = o.seed ?? 1;
  const sum = { score: 0, cpuScore: 0, correct: 0, timeouts: 0, wins: 0 };
  for (let i = 0; i < o.rounds; i++) {
    const s = playRound({ ...o, seed: (base + i * 7919) >>> 0 });
    sum.score += s.score;
    sum.cpuScore += s.cpu?.score ?? 0;
    sum.correct += s.correct;
    sum.timeouts += s.timeouts;
    if (s.cpu && s.score > s.cpu.score) sum.wins++;
  }
  const n = o.rounds;
  return {
    rounds: n,
    score: sum.score / n,
    cpuScore: sum.cpuScore / n,
    correct: sum.correct / n,
    timeouts: sum.timeouts / n,
    humanWins: sum.wins / n,
  };
}

/** The human seat played with a contestant's own tuning (to pit two contestants against each other). */
export const botFromTuning = (t: {
  accuracy: number;
  adj: Readonly<Record<Difficulty, number>>;
  buzzMs: readonly [number, number];
}): HumanBot => ({
  accuracy: {
    easy: Math.min(0.97, t.accuracy + t.adj.easy),
    medium: Math.min(0.97, t.accuracy + t.adj.medium),
    hard: Math.max(0.05, t.accuracy + t.adj.hard),
  },
  answerMs: t.buzzMs,
});
