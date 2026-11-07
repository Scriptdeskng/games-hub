export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export interface DifficultyProfile {
  /** bell diameter in CSS px (never below the 44 px tap target) */
  sizePx: number;
  /** how long a bell stays before it vanishes (ms) */
  lifetimeMs: number;
  /** average gap between new bells (ms) */
  spawnGapMs: number;
  maxTargets: number;
  /** round length (ms) */
  durationMs: number;
  /** bells to hit to win */
  goal: number;
}

/** Harder = smaller bells, shorter life, more bells needed in less time. */
export const PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    sizePx: 88,
    lifetimeMs: 2000,
    spawnGapMs: 700,
    maxTargets: 2,
    durationMs: 30000,
    goal: 12,
  },
  medium: {
    sizePx: 68,
    lifetimeMs: 1300,
    spawnGapMs: 600,
    maxTargets: 3,
    durationMs: 30000,
    goal: 20,
  },
  hard: {
    sizePx: 52,
    lifetimeMs: 850,
    spawnGapMs: 500,
    maxTargets: 3,
    durationMs: 25000,
    goal: 28,
  },
};

export const BASE_POINTS = 10;
export const COMBO_BONUS = 2;
export const COMBO_BONUS_CAP = 5;
