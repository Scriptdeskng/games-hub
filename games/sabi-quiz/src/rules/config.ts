/**
 * Rules as DATA for Sabi Quiz. Nothing in this folder touches the DOM, timers or Math.random:
 * every random choice (question pick, padi poll) comes from a seeded rng whose state is stored in
 * the round state, so a round replays exactly from its seed.
 */
import type { QuizQuestion } from '@naija/core/content';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/** Classic: 10 questions for yourself. Duel: race a CPU contestant. Daily: today's shared pack. */
export type Mode = 'classic' | 'duel' | 'daily';
export const MODES: readonly Mode[] = ['classic', 'duel', 'daily'];

export const ROUND_LENGTH = 10;
/** A round counts as won with this many correct answers (Classic and Daily). */
export const PASS_MARK = 6;
/** Pause between the answer being shown and the next question (ms). */
export const REVEAL_MS = 1500;

/** The eight categories of the pack, in menu order. */
export const CATEGORIES = [
  'nollywood',
  'afrobeats',
  'football',
  'history',
  'food',
  'general',
  'pidgin',
  'geography',
] as const;

export interface DifficultyProfile {
  /** seconds per question, as ms */
  timeMs: number;
  /** wanted questions per question-difficulty (sums to ROUND_LENGTH) */
  mix: Readonly<Record<Difficulty, number>>;
  /** score scale in percent: harder settings pay more per correct answer */
  scalePct: number;
  /**
   * Chance that the "ask your padi" crowd leans towards a WRONG option. The padi is a
   * friend, not an oracle: they are wrong more often on hard settings.
   */
  padiWrong: number;
}

/**
 * Easy: 20 s and an easier mix. Medium: 15 s. Hard: 10 s and a harder mix.
 * The mix is a request: a small category may top it up from the nearest difficulty.
 */
export const PROFILES: Readonly<Record<Difficulty, DifficultyProfile>> = {
  easy: { timeMs: 20000, mix: { easy: 6, medium: 3, hard: 1 }, scalePct: 100, padiWrong: 0.1 },
  medium: { timeMs: 15000, mix: { easy: 3, medium: 5, hard: 2 }, scalePct: 125, padiWrong: 0.18 },
  hard: { timeMs: 10000, mix: { easy: 1, medium: 5, hard: 4 }, scalePct: 150, padiWrong: 0.28 },
};

/** Points for a correct answer by the question's own difficulty (before speed and streak). */
export const BASE_POINTS: Readonly<Record<Difficulty, number>> = {
  easy: 100,
  medium: 150,
  hard: 200,
};
/** Most extra points for answering instantly (scales down to 0 at the buzzer). */
export const SPEED_BONUS_MAX = 50;

/** Streak tiers: [correct in a row, multiplier]. x2 at 3, x3 at 5, x5 at 8. */
export const STREAK_TIERS: readonly (readonly [number, number])[] = [
  [8, 5],
  [5, 3],
  [3, 2],
];

/** Duel: the clock is the same 15 s for every contestant (their buzz times are tuned to it). */
export const DUEL_TIME_MS = 15000;
export const DUEL_BASE = 100;
export const DUEL_SPEED_MAX = 100;

export type LifelineId = 'fifty' | 'skip' | 'padi';
export const LIFELINES: readonly LifelineId[] = ['fifty', 'skip', 'padi'];

/** Spare questions kept per question-difficulty, so Skip can swap like for like. */
export const SPARES: Readonly<Record<Difficulty, number>> = { easy: 1, medium: 1, hard: 1 };

export type { QuizQuestion };
