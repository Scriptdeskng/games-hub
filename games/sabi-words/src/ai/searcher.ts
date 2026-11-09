import { createRng } from '@naija/core/rng';
import { PROFILES, type Difficulty, type Puzzle } from '../rules';

/**
 * A model of a human searcher, used only by tests (never imported by the app) to show that the
 * levels get harder. For each word the searcher looks at every cell holding the word's first
 * letter and, from each, tries the directions the level allows, in random order, until the real
 * start is hit; a glance costs `checkMs` and the swipe `swipeMs`. All of it is counted, never
 * timed: the result is the clock time the model needs.
 */
export interface Searcher {
  checkMs: number;
  swipeMs: number;
}

export const SEARCHERS = {
  quick: { checkMs: 250, swipeMs: 1500 },
  average: { checkMs: 600, swipeMs: 2500 },
  slow: { checkMs: 1100, swipeMs: 4000 },
} as const satisfies Record<string, Searcher>;

export function timeNeededMs(puzzle: Puzzle, who: Searcher, seed: number): number {
  const rng = createRng(seed);
  const dirs = PROFILES[puzzle.difficulty].dirs.length;
  let total = 0;
  for (const w of puzzle.words) {
    const starts = [...puzzle.letters].filter((ch) => ch === w.word[0]).length;
    const candidates = Math.max(1, starts * dirs);
    total += rng.int(1, candidates) * who.checkMs + who.swipeMs;
  }
  return total;
}

/** Share of the clock the searcher needs for a puzzle (above 1 means it runs out of time). */
export const clockShare = (puzzle: Puzzle, who: Searcher, seed: number): number =>
  timeNeededMs(puzzle, who, seed) / PROFILES[puzzle.difficulty].durationMs;

export type { Difficulty };
