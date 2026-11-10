import { ZONES, isZone, type Zone } from '../physics';
import { DIFFICULTIES, isDifficulty, isMode, type Difficulty, type Mode } from './config';
import { saves, sweetGoals, type Shootout } from './shootout';

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  /** shootouts played to the end (cup matches and quick matches; practice is never counted) */
  plays: number;
  wins: number;
  goals: number;
  conceded: number;
  saves: number;
  sweet: number;
  cups: number;
  cupsWon: number;
  /** most cup matches won in one run (0..3) */
  bestRun: number;
  streak: number;
  bestStreak: number;
  best: Record<Difficulty, number>;
  lastDifficulty: Difficulty;
  lastMode: Mode;
  /** the human's favourite corners: decayed shot counts per zone, the CPU keeper's prior. Bounded. */
  habit: Record<Zone, number>;
}

export const HABIT_DECAY = 0.92;
const NUM_MAX = 1_000_000;

const emptyBest = (): Record<Difficulty, number> => ({ easy: 0, medium: 0, hard: 0 });
export const emptyHabit = (): Record<Zone, number> => ({ ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 });

export const emptyProgress = (): Progress => ({
  plays: 0,
  wins: 0,
  goals: 0,
  conceded: 0,
  saves: 0,
  sweet: 0,
  cups: 0,
  cupsWon: 0,
  bestRun: 0,
  streak: 0,
  bestStreak: 0,
  best: emptyBest(),
  lastDifficulty: 'medium',
  lastMode: 'cup',
  habit: emptyHabit(),
});

const num = (v: unknown, max = NUM_MAX): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0;

/** Repair anything loaded from storage or the portal: never trust it. */
export function sanitizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  base.plays = num(r.plays);
  base.wins = Math.min(num(r.wins), base.plays);
  for (const k of ['goals', 'conceded', 'saves', 'sweet'] as const) base[k] = num(r[k]);
  base.cups = num(r.cups);
  base.cupsWon = Math.min(num(r.cupsWon), base.cups);
  base.bestRun = num(r.bestRun, 3);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  for (const d of DIFFICULTIES) base.best[d] = num(r.best?.[d]);
  if (isDifficulty(r.lastDifficulty)) base.lastDifficulty = r.lastDifficulty;
  if (isMode(r.lastMode)) base.lastMode = r.lastMode;
  for (const z of ZONES) {
    const v = (r.habit as Record<string, unknown> | undefined)?.[z];
    base.habit[z] = typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), 20) : 0;
  }
  return base;
}

const MULT: Record<Difficulty, number> = { easy: 1, medium: 1.25, hard: 1.5 };

/**
 * What a finished shootout was worth to the human (side 0): 100 per goal, 80 per save, 25 more for
 * each sweet-spot goal, +300 for the win, scaled 1 / 1.25 / 1.5 by level.
 */
export function matchScore(s: Shootout, d: Difficulty): number {
  const won = s.winner === 0;
  const raw = s.goals[0] * 100 + saves(s, 0) * 80 + sweetGoals(s, 0) * 25 + (won ? 300 : 0);
  return Math.round(raw * MULT[d]);
}

/** The running score during a shootout (the portal `score` event): goals, saves and sweet goals, never the win bonus, so it only goes up. */
export function liveScore(s: Shootout, d: Difficulty): number {
  return Math.round((s.goals[0] * 100 + saves(s, 0) * 80 + sweetGoals(s, 0) * 25) * MULT[d]);
}

/** 0 for a loss; otherwise 1, +1 for conceding at most two, +1 for two or more sweet-spot goals. */
export function starsFor(s: Shootout): number {
  if (s.winner !== 0) return 0;
  return 1 + (s.goals[1] <= 2 ? 1 : 0) + (sweetGoals(s, 0) >= 2 ? 1 : 0);
}

/** Fold the human's kicks into the habit table (older kicks count less, so it stays bounded). */
export function noteShot(habit: Record<Zone, number>, zone: Zone): Record<Zone, number> {
  const out = emptyHabit();
  for (const z of ZONES) out[z] = habit[z] * HABIT_DECAY;
  if (isZone(zone)) out[zone] += 1;
  return out;
}

export function recordResult(
  p: Progress,
  s: Shootout,
  d: Difficulty,
  mode: Mode,
): { next: Progress; score: number; newBest: boolean } {
  const score = matchScore(s, d);
  const won = s.winner === 0;
  const newBest = won && score > p.best[d];
  const streak = won ? p.streak + 1 : 0;
  let habit = p.habit;
  for (const k of s.kicks) if (k.side === 0) habit = noteShot(habit, k.zone);
  return {
    score,
    newBest,
    next: {
      ...p,
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      goals: p.goals + s.goals[0],
      conceded: p.conceded + s.goals[1],
      saves: p.saves + saves(s, 0),
      sweet: p.sweet + sweetGoals(s, 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      best: { ...p.best, [d]: Math.max(p.best[d], won ? score : 0) },
      lastDifficulty: d,
      lastMode: mode,
      habit,
    },
  };
}

/** A cup run ended (won the cup or knocked out after `won` match wins). */
export function recordCup(p: Progress, matchesWon: number, champion: boolean): Progress {
  return {
    ...p,
    cups: p.cups + 1,
    cupsWon: p.cupsWon + (champion ? 1 : 0),
    bestRun: Math.max(p.bestRun, Math.min(3, matchesWon)),
  };
}
