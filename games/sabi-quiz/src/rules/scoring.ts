import {
  BASE_POINTS,
  DUEL_BASE,
  DUEL_SPEED_MAX,
  SPEED_BONUS_MAX,
  STREAK_TIERS,
  type Difficulty,
} from './config';

/** The multiplier a streak of `streak` correct answers in a row earns: 1, 2, 3 or 5. */
export function multiplierFor(streak: number): number {
  for (const [at, mult] of STREAK_TIERS) if (streak >= at) return mult;
  return 1;
}

/** Streak count at which the next multiplier tier starts, or null at the top tier. */
export function nextTierAt(streak: number): number | null {
  const tiers = [...STREAK_TIERS].reverse();
  for (const [at] of tiers) if (streak < at) return at;
  return null;
}

/** 0..SPEED_BONUS_MAX, linear in the time left. */
export function speedBonus(timeLeftMs: number, limitMs: number, max = SPEED_BONUS_MAX): number {
  if (limitMs <= 0) return 0;
  const f = Math.min(1, Math.max(0, timeLeftMs / limitMs));
  return Math.round(max * f);
}

/**
 * Classic and Daily: (base by question difficulty + speed bonus) x streak multiplier, then the
 * difficulty setting's scale. `streakAfter` counts this answer. Integer result.
 */
export function classicPoints(o: {
  questionDifficulty: Difficulty;
  timeLeftMs: number;
  limitMs: number;
  streakAfter: number;
  scalePct: number;
}): number {
  const raw =
    (BASE_POINTS[o.questionDifficulty] + speedBonus(o.timeLeftMs, o.limitMs)) *
    multiplierFor(o.streakAfter);
  return Math.round((raw * o.scalePct) / 100);
}

/** Duel: a correct answer is worth 100 plus up to 100 for speed, so the faster one scores more. */
export function duelPoints(timeLeftMs: number, limitMs: number): number {
  return DUEL_BASE + speedBonus(timeLeftMs, limitMs, DUEL_SPEED_MAX);
}
