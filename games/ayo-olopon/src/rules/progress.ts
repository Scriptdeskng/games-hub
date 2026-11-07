import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { sanitizeRules, TOTAL_SEEDS, type Rules } from './config';
import type { GameState, Side } from './engine';

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  best: Record<Difficulty, number>;
  plays: number;
  /** games started (quits included) */
  games: number;
  wins: number;
  draws: number;
  streak: number;
  bestStreak: number;
  /** most seeds captured in one move */
  bestCapture: number;
  lastDifficulty: Difficulty;
  rules: Rules;
  /** quicker animations and CPU pauses (about 1.7x), default off */
  fastPlay: boolean;
}

export const emptyProgress = (): Progress => ({
  best: { easy: 0, medium: 0, hard: 0 },
  plays: 0,
  games: 0,
  wins: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
  bestCapture: 0,
  lastDifficulty: 'medium',
  rules: sanitizeRules(null),
  fastPlay: false,
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
  base.games = Math.max(num(r.games), base.plays);
  base.wins = Math.min(num(r.wins), base.plays);
  base.draws = Math.min(num(r.draws), base.plays - base.wins);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  base.bestCapture = Math.min(num(r.bestCapture), TOTAL_SEEDS);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  base.rules = sanitizeRules(r.rules);
  base.fastPlay = r.fastPlay === true;
  return base;
}

/**
 * Score for the human: 10 points per seed in the tray, plus 200 for a win and 5 per move saved
 * (a quicker win scores more). A draw or a loss scores the seeds alone.
 */
export function scoreFor(s: GameState, humanId: string): number {
  const side: Side = s.turns.seats[0]?.id === humanId ? 0 : 1;
  const base = s.store[side] * 10;
  if (s.winner !== humanId) return base;
  return base + 200 + Math.max(0, 200 - s.plies) * 5;
}

/** Fold a finished game into the saved progress. */
export function recordResult(
  p: Progress,
  s: GameState,
  difficulty: Difficulty,
  humanId: string,
  bestCapture: number,
): { next: Progress; newBest: boolean } {
  const won = s.winner === humanId;
  const score = scoreFor(s, humanId);
  const newBest = won && score > p.best[difficulty];
  const streak = won ? p.streak + 1 : s.draw ? p.streak : 0;
  return {
    newBest,
    next: {
      ...p,
      best: { ...p.best, [difficulty]: Math.max(p.best[difficulty], score) },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      draws: p.draws + (s.draw ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      bestCapture: Math.max(p.bestCapture, bestCapture),
      lastDifficulty: difficulty,
    },
  };
}
