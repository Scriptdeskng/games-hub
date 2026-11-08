import { pickQuestions } from '@naija/core/content';
import { createRng, type Rng } from '@naija/core/rng';
import {
  DUEL_TIME_MS,
  PASS_MARK,
  PROFILES,
  ROUND_LENGTH,
  SPARES,
  type Difficulty,
  type LifelineId,
  type Mode,
  type QuizQuestion,
} from './config';
import { padiPoll } from './poll';
import { classicPoints, duelPoints } from './scoring';

export type Phase = 'asking' | 'reveal' | 'done';
export type Result = 'correct' | 'wrong' | 'timeout';

/** What happened on one question (used for stats and the results screen). */
export interface Answered {
  id: string;
  category: string;
  qd: Difficulty;
  /** the option the player picked, null on a timeout */
  picked: number | null;
  result: Result;
  /** time left when the player answered, ms (0 on a timeout) */
  leftMs: number;
  points: number;
}

/** The CPU contestant's seat in a duel. */
export interface CpuSeat {
  score: number;
  correct: number;
  picked: number | null;
  /** time left on the clock when it buzzed */
  leftMs: number | null;
  /** points it earned on the question that just closed (shown on reveal) */
  lastPoints: number;
}

/** Everything about a round. JSON-serialisable: no functions, no DOM, no Date. */
export interface GameState {
  mode: Mode;
  difficulty: Difficulty;
  /** Never sent to the portal: it fixes every question and every poll. */
  seed: number;
  limitMs: number;
  scalePct: number;
  padiWrong: number;
  questions: QuizQuestion[];
  spares: QuizQuestion[];
  index: number;
  phase: Phase;
  timeLeftMs: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  timeouts: number;
  skips: number;
  used: Record<LifelineId, boolean>;
  eliminated: number[];
  poll: number[] | null;
  picked: number | null;
  pickedLeftMs: number;
  lastResult: Result | null;
  lastPoints: number;
  history: Answered[];
  cpu: CpuSeat | null;
  rng: number;
}

export interface RoundOptions {
  pool: readonly QuizQuestion[];
  mode: Mode;
  difficulty: Difficulty;
  seed: number;
  /** only these categories (default all) */
  categories?: readonly string[];
}

/** Today's challenge is the same for everybody, so it ignores the difficulty setting. */
export const DAILY_MIX: Readonly<Record<Difficulty, number>> = { easy: 4, medium: 4, hard: 2 };

/** Pick the ten questions (easy to hard, categories interleaved) and the spares for Skip. */
export function pickRound(
  pool: readonly QuizQuestion[],
  rng: Rng,
  o: { mix: Readonly<Record<Difficulty, number>>; categories?: readonly string[] },
): { questions: QuizQuestion[]; spares: QuizQuestion[] } {
  const questions = pickQuestions(pool, rng, {
    count: ROUND_LENGTH,
    categories: o.categories,
    mix: o.mix,
  });
  const taken = new Set(questions.map((q) => q.id));
  const rest = pool.filter((q) => !taken.has(q.id));
  const spares = pickQuestions(rest, rng, {
    count: SPARES.easy + SPARES.medium + SPARES.hard,
    categories: o.categories,
    mix: SPARES,
  });
  return { questions, spares };
}

export function createRound(o: RoundOptions): GameState {
  const daily = o.mode === 'daily';
  const difficulty: Difficulty = daily ? 'medium' : o.difficulty;
  const profile = PROFILES[difficulty];
  const rng = createRng(o.seed);
  // Duel difficulty is the contestant's strength: every duel gets the same (Medium) question mix
  const mixOf = o.mode === 'duel' ? PROFILES.medium : profile;
  const { questions, spares } = pickRound(o.pool, rng, {
    mix: daily ? DAILY_MIX : mixOf.mix,
    categories: daily ? undefined : o.categories,
  });
  const limitMs = o.mode === 'duel' ? DUEL_TIME_MS : profile.timeMs;
  return {
    mode: o.mode,
    difficulty,
    seed: o.seed >>> 0,
    limitMs,
    scalePct: profile.scalePct,
    padiWrong: profile.padiWrong,
    questions,
    spares,
    index: 0,
    phase: questions.length ? 'asking' : 'done',
    timeLeftMs: limitMs,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    timeouts: 0,
    skips: 0,
    used: { fifty: false, skip: false, padi: false },
    eliminated: [],
    poll: null,
    picked: null,
    pickedLeftMs: 0,
    lastResult: null,
    lastPoints: 0,
    history: [],
    cpu:
      o.mode === 'duel'
        ? { score: 0, correct: 0, picked: null, leftMs: null, lastPoints: 0 }
        : null,
    rng: rng.getState(),
  };
}

export const current = (s: GameState): QuizQuestion => s.questions[s.index] as QuizQuestion;
export const isOver = (s: GameState): boolean => s.phase === 'done';
export const total = (s: GameState): number => s.questions.length;

/** Close the question: grade both seats, update score and streak, move to the reveal phase. */
function close(s: GameState): GameState {
  const q = current(s);
  const humanOk = s.picked !== null && s.picked === q.answer;
  const result: Result = s.picked === null ? 'timeout' : humanOk ? 'correct' : 'wrong';
  const streak = humanOk ? s.streak + 1 : 0;
  let points = 0;
  let cpu = s.cpu;
  if (s.mode === 'duel' && cpu) {
    if (humanOk) points = duelPoints(s.pickedLeftMs, s.limitMs);
    const cpuOk = cpu.picked !== null && cpu.picked === q.answer;
    const cpuPts = cpuOk && cpu.leftMs !== null ? duelPoints(cpu.leftMs, s.limitMs) : 0;
    cpu = {
      ...cpu,
      score: cpu.score + cpuPts,
      correct: cpu.correct + (cpuOk ? 1 : 0),
      lastPoints: cpuPts,
    };
  } else if (humanOk) {
    points = classicPoints({
      questionDifficulty: q.difficulty,
      timeLeftMs: s.pickedLeftMs,
      limitMs: s.limitMs,
      streakAfter: streak,
      scalePct: s.scalePct,
    });
  }
  const entry: Answered = {
    id: q.id,
    category: q.category,
    qd: q.difficulty,
    picked: s.picked,
    result,
    leftMs: s.picked === null ? 0 : s.pickedLeftMs,
    points,
  };
  return {
    ...s,
    phase: 'reveal',
    timeLeftMs: result === 'timeout' ? 0 : s.timeLeftMs,
    score: s.score + points,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    correct: s.correct + (humanOk ? 1 : 0),
    wrong: s.wrong + (result === 'wrong' ? 1 : 0),
    timeouts: s.timeouts + (result === 'timeout' ? 1 : 0),
    lastResult: result,
    lastPoints: points,
    history: [...s.history, entry],
    cpu,
  };
}

/** Advance the clock. At zero the question closes: an unanswered seat is a timeout. */
export function tick(s: GameState, dtMs: number): GameState {
  if (s.phase !== 'asking' || dtMs <= 0) return s;
  const left = s.timeLeftMs - dtMs;
  if (left > 0) return { ...s, timeLeftMs: left };
  return close({ ...s, timeLeftMs: 0 });
}

/** The human picks option `choice` (0..3). Ignored when it is not allowed (returns `s` itself). */
export function answer(s: GameState, choice: number): GameState {
  if (s.phase !== 'asking' || s.picked !== null) return s;
  if (!Number.isInteger(choice) || choice < 0 || choice > 3 || s.eliminated.includes(choice))
    return s;
  const picked = { ...s, picked: choice, pickedLeftMs: s.timeLeftMs };
  // a duel question closes when both contestants have answered; Classic closes at once
  if (s.mode === 'duel' && s.cpu && s.cpu.picked === null) return picked;
  return close(picked);
}

/** Duel only: the CPU contestant buzzes with `choice` at the current clock. */
export function answerCpu(s: GameState, choice: number): GameState {
  if (s.mode !== 'duel' || !s.cpu || s.phase !== 'asking' || s.cpu.picked !== null) return s;
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return s;
  const next = { ...s, cpu: { ...s.cpu, picked: choice, leftMs: s.timeLeftMs } };
  return next.picked !== null ? close(next) : next;
}

/** Move on after the reveal: the next question, or the end of the round. */
export function next(s: GameState): GameState {
  if (s.phase !== 'reveal') return s;
  const index = s.index + 1;
  if (index >= s.questions.length) return { ...s, index: s.questions.length - 1, phase: 'done' };
  return {
    ...s,
    index,
    phase: 'asking',
    timeLeftMs: s.limitMs,
    eliminated: [],
    poll: null,
    picked: null,
    pickedLeftMs: 0,
    lastResult: null,
    lastPoints: 0,
    cpu: s.cpu ? { ...s.cpu, picked: null, leftMs: null, lastPoints: 0 } : null,
  };
}

/** Lifelines exist in Classic and Daily, once each per round, while a question is open. */
export function canUse(s: GameState, id: LifelineId): boolean {
  if (s.mode === 'duel' || s.phase !== 'asking' || s.picked !== null || s.used[id]) return false;
  if (id === 'skip') return s.spares.length > 0;
  return true;
}

const used = (s: GameState, id: LifelineId): GameState['used'] => ({ ...s.used, [id]: true });
const rngOf = (s: GameState): Rng => {
  const r = createRng(0);
  r.setState(s.rng);
  return r;
};

/** 50/50: remove two wrong options. The right answer is never removed. */
export function useFifty(s: GameState): GameState {
  if (!canUse(s, 'fifty')) return s;
  const rng = rngOf(s);
  const q = current(s);
  const wrong = [0, 1, 2, 3].filter((i) => i !== q.answer && !s.eliminated.includes(i));
  const out = rng.shuffle(wrong).slice(0, 2);
  return {
    ...s,
    used: used(s, 'fifty'),
    eliminated: [...s.eliminated, ...out],
    rng: rng.getState(),
  };
}

/**
 * Skip: swap the open question for a spare of the same difficulty (any spare if none match).
 * The clock restarts, nothing is scored and the streak is kept (a skip is not a miss).
 */
export function useSkip(s: GameState): GameState {
  if (!canUse(s, 'skip')) return s;
  const q = current(s);
  let at = s.spares.findIndex((x) => x.difficulty === q.difficulty);
  if (at < 0) at = 0;
  const spare = s.spares[at] as QuizQuestion;
  const questions = s.questions.slice();
  questions[s.index] = spare;
  return {
    ...s,
    questions,
    spares: s.spares.filter((_, i) => i !== at),
    used: used(s, 'skip'),
    skips: s.skips + 1,
    timeLeftMs: s.limitMs,
    eliminated: [],
    poll: null,
  };
}

/** Ask your padi: a simulated crowd vote that leans right but is sometimes wrong. */
export function usePadi(s: GameState): GameState {
  if (!canUse(s, 'padi')) return s;
  const rng = rngOf(s);
  const poll = padiPoll(current(s), s.eliminated, rng, s.padiWrong);
  return { ...s, used: used(s, 'padi'), poll, rng: rng.getState() };
}

export const accuracy = (s: GameState): number => {
  const n = s.correct + s.wrong + s.timeouts;
  return n ? s.correct / n : 0;
};

export type Outcome = 'win' | 'lose' | 'draw';

/** Duel: more points wins; level scores are a draw. */
export function duelOutcome(s: GameState): Outcome {
  const cpu = s.cpu?.score ?? 0;
  return s.score > cpu ? 'win' : s.score < cpu ? 'lose' : 'draw';
}

/** Did the player win the round? Duel: beat the contestant. Otherwise reach the pass mark. */
export const won = (s: GameState): boolean =>
  s.mode === 'duel' ? duelOutcome(s) === 'win' : s.correct >= PASS_MARK;

/** 0..3 stars for Classic and Daily: 6 correct 1, 8 correct 2, 9 or more 3. */
export const stars = (s: GameState): number =>
  s.mode === 'duel' ? 0 : s.correct >= 9 ? 3 : s.correct >= 8 ? 2 : s.correct >= PASS_MARK ? 1 : 0;
