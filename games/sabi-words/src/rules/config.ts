/**
 * Rules as DATA for Sabi Words. Nothing in this folder touches the DOM, timers or Math.random:
 * every random choice (word pick, placement, filler letters) comes from a seeded rng, so a
 * puzzle is rebuilt exactly from its seed, pack and size.
 */
export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/** The eight reading directions. `a` is the lane angle in degrees (CSS rotate, clockwise). */
export const DIRS = [
  { id: 'E', dr: 0, dc: 1, a: 0 },
  { id: 'S', dr: 1, dc: 0, a: 90 },
  { id: 'SE', dr: 1, dc: 1, a: 45 },
  { id: 'NE', dr: -1, dc: 1, a: 315 },
  { id: 'W', dr: 0, dc: -1, a: 180 },
  { id: 'N', dr: -1, dc: 0, a: 270 },
  { id: 'SW', dr: 1, dc: -1, a: 135 },
  { id: 'NW', dr: -1, dc: -1, a: 225 },
] as const;
export type DirId = (typeof DIRS)[number]['id'];

export interface Profile {
  /** grid is size x size */
  size: number;
  /** words hidden in the grid */
  words: number;
  /** the clock, in ms */
  durationMs: number;
  /** directions a word may run in (indexes into DIRS) */
  dirs: readonly DirId[];
  /** shortest and longest hidden word, in letters */
  minLen: number;
  maxLen: number;
  /** score for the time left on a win: points per whole second */
  timePts: number;
}

/**
 * Easy: 8x8, 6 words, 3 min, right and down. Medium: 10x10, 8 words, 4 min, adds both diagonals
 * going down-right and up-right plus left and up (backward, but not the two backward diagonals).
 * Hard: 12x12, 10 words, 5 min, all eight directions.
 */
export const PROFILES: Readonly<Record<Difficulty, Profile>> = {
  easy: {
    size: 8,
    words: 6,
    durationMs: 180_000,
    dirs: ['E', 'S'],
    minLen: 3,
    maxLen: 7,
    timePts: 1,
  },
  medium: {
    size: 10,
    words: 8,
    durationMs: 240_000,
    dirs: ['E', 'S', 'SE', 'NE', 'W', 'N'],
    minLen: 3,
    maxLen: 10,
    timePts: 2,
  },
  hard: {
    size: 12,
    words: 10,
    durationMs: 300_000,
    dirs: ['E', 'S', 'SE', 'NE', 'W', 'N', 'SW', 'NW'],
    minLen: 4,
    maxLen: 12,
    timePts: 3,
  },
};

/** The last seconds of the clock get the warning look and the ticks. */
export const LOW_TIME_S = 5;
/** Stars by the share of the clock still left when the last word is found. */
export const STAR_3_FRAC = 0.5;
export const STAR_2_FRAC = 0.2;

/** Cosmetic coins only: no purchase, no cash value. */
export const HINT_COST = 10;
export const WORD_PTS = 100;
export const COINS_WIN: Readonly<Record<Difficulty, number>> = { easy: 10, medium: 15, hard: 20 };
export const COINS_PER_STAR = 5;

/** The six cloth lanes cycle in finding order. */
export const LANES = 6;

/** The smallest cell (px) a grid may have before a bigger grid is stepped down (asset brief). */
export const MIN_CELL_PX = 26;
export const MAX_CELL_PX = 44;
/** Selection hit circle around a tile centre, as a share of the cell. */
export const HIT_RADIUS = 0.4;
