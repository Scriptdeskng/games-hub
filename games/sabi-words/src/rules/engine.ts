import {
  COINS_PER_STAR,
  COINS_WIN,
  HINT_COST,
  LANES,
  PROFILES,
  STAR_2_FRAC,
  STAR_3_FRAC,
  WORD_PTS,
  type Difficulty,
} from './config';
import type { Puzzle } from './generator';
import { lineCells, cellIndex, reverse, runCells } from './grid';

export interface FoundWord {
  /** index into puzzle.words */
  index: number;
  /** cloth lane 1..6, cycling in finding order */
  lane: number;
  /** clock time left when it was found */
  leftMs: number;
}

export interface GameState {
  puzzle: Puzzle;
  difficulty: Difficulty;
  status: 'playing' | 'won' | 'lost';
  durationMs: number;
  timeLeftMs: number;
  found: FoundWord[];
  /** words with a lantern ring on their first letter (cleared words drop out of play, kept here) */
  hinted: number[];
  hintsUsed: number;
  /** swipes that were not a word */
  wrongs: number;
}

export function createRound(puzzle: Puzzle): GameState {
  const durationMs = PROFILES[puzzle.difficulty].durationMs;
  return {
    puzzle,
    difficulty: puzzle.difficulty,
    status: 'playing',
    durationMs,
    timeLeftMs: durationMs,
    found: [],
    hinted: [],
    hintsUsed: 0,
    wrongs: 0,
  };
}

/** Advance the clock. The round is lost when it reaches zero. */
export function tick(s: GameState, dtMs: number): GameState {
  if (s.status !== 'playing' || dtMs <= 0) return s;
  const timeLeftMs = Math.max(0, s.timeLeftMs - dtMs);
  return { ...s, timeLeftMs, status: timeLeftMs === 0 ? 'lost' : 'playing' };
}

export type SelectResult = 'found' | 'repeat' | 'wrong' | 'invalid' | 'closed';

const isFound = (s: GameState, i: number): boolean => s.found.some((f) => f.index === i);
export const unfound = (s: GameState): number[] =>
  s.puzzle.words.map((_, i) => i).filter((i) => !isFound(s, i));

/** The cells of a word as placed. */
export const wordCells = (s: GameState, i: number): number[] => {
  const w = s.puzzle.words[i]!;
  return runCells(s.puzzle.size, w.r, w.c, w.dir, w.word.length) as number[];
};

/**
 * Judge a swipe or a start/end pair. Reading either way round counts. A word already found is a
 * harmless 'repeat'; anything else that is not a hidden word is 'wrong' (no penalty but the count).
 */
export function select(
  s: GameState,
  from: number,
  to: number,
): { state: GameState; result: SelectResult; word?: number } {
  if (s.status !== 'playing') return { state: s, result: 'closed' };
  const n = s.puzzle.size;
  const cells = lineCells(n, from, to);
  if (!cells) return { state: s, result: 'invalid' };
  const text = cells.map((c) => s.puzzle.letters[c]).join('');
  const back = reverse(text);
  const idx = s.puzzle.words.findIndex((w) => w.word === text || w.word === back);
  if (idx < 0) return { state: { ...s, wrongs: s.wrongs + 1 }, result: 'wrong' };
  if (isFound(s, idx)) return { state: s, result: 'repeat', word: idx };
  const found = [
    ...s.found,
    { index: idx, lane: (s.found.length % LANES) + 1, leftMs: s.timeLeftMs },
  ];
  const won = found.length === s.puzzle.words.length;
  return {
    state: { ...s, found, status: won ? 'won' : 'playing' },
    result: 'found',
    word: idx,
  };
}

/** Can a hint be given: there is an unfound word without a ring yet. */
export const hintTarget = (s: GameState): number | null =>
  s.status === 'playing' ? (unfound(s).find((i) => !s.hinted.includes(i)) ?? null) : null;

/** Light the lantern on the first letter of the first unfound, unhinted word. Costs HINT_COST coins. */
export function useHint(
  s: GameState,
  coins: number,
): { state: GameState; ok: boolean; word?: number; cell?: number; cost: number } {
  const word = hintTarget(s);
  if (word === null || coins < HINT_COST) return { state: s, ok: false, cost: 0 };
  const w = s.puzzle.words[word]!;
  return {
    state: { ...s, hinted: [...s.hinted, word], hintsUsed: s.hintsUsed + 1 },
    ok: true,
    word,
    cell: cellIndex(s.puzzle.size, w.r, w.c),
    cost: HINT_COST,
  };
}

/** 3 stars with at least half the clock left, 2 with a fifth, otherwise 1. 0 unless won. */
export function stars(s: GameState): 0 | 1 | 2 | 3 {
  if (s.status !== 'won') return 0;
  const f = s.timeLeftMs / s.durationMs;
  return f >= STAR_3_FRAC ? 3 : f >= STAR_2_FRAC ? 2 : 1;
}

export const won = (s: GameState): boolean => s.status === 'won';

/** 100 per word, plus points per whole second left on a win (more on harder levels). */
export function score(s: GameState): number {
  const bonus =
    s.status === 'won' ? Math.floor(s.timeLeftMs / 1000) * PROFILES[s.difficulty].timePts : 0;
  return s.found.length * WORD_PTS + bonus;
}

/** Cosmetic coins for a finished round: a win pays by level and stars, a loss one coin a word. */
export const coinsEarned = (s: GameState): number =>
  s.status === 'won'
    ? COINS_WIN[s.difficulty] + COINS_PER_STAR * stars(s)
    : s.status === 'lost'
      ? s.found.length
      : 0;

/** Share of swipes that were words. */
export const accuracy = (s: GameState): number =>
  s.found.length + s.wrongs === 0 ? 1 : s.found.length / (s.found.length + s.wrongs);

export const elapsedMs = (s: GameState): number => s.durationMs - s.timeLeftMs;
