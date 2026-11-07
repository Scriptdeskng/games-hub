import { DIFFICULTIES, type Difficulty } from './config';
import type { GameState } from './engine';

/** Saved through core.portal.saveProgress(): JSON only. */
export interface Progress {
  best: Record<Difficulty, number>;
  plays: number;
  wins: number;
  streak: number;
  bestStreak: number;
  lastDifficulty: Difficulty;
}

export const emptyProgress = (): Progress => ({
  best: { easy: 0, medium: 0, hard: 0 },
  plays: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  lastDifficulty: 'medium',
});

/** Repair anything loaded from storage or the portal: never trust it. */
export function sanitizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  for (const d of DIFFICULTIES) base.best[d] = num(r.best?.[d]);
  base.plays = num(r.plays);
  base.wins = num(r.wins);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  return base;
}

/** Fold a finished round into the saved progress. */
export function recordResult(p: Progress, s: GameState): { next: Progress; newBest: boolean } {
  const won = s.status === 'won';
  const newBest = s.score > p.best[s.difficulty];
  const streak = won ? p.streak + 1 : 0;
  return {
    newBest,
    next: {
      best: { ...p.best, [s.difficulty]: Math.max(p.best[s.difficulty], s.score) },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      lastDifficulty: s.difficulty,
    },
  };
}
