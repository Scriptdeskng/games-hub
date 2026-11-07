import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { MAX_CPUS, sanitizeRules, type Rules } from './config';
import { playerById, turnsOf, type GameState } from './engine';

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  best: Record<Difficulty, number>;
  plays: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** fewest own turns in a win */
  fastestWin: number;
  lastDifficulty: Difficulty;
  cpuCount: number;
  rules: Rules;
}

export const emptyProgress = (): Progress => ({
  best: { easy: 0, medium: 0, hard: 0 },
  plays: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  fastestWin: 0,
  lastDifficulty: 'medium',
  cpuCount: 1,
  rules: sanitizeRules(null),
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
  base.wins = Math.min(num(r.wins), base.plays);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  base.fastestWin = num(r.fastestWin);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  const cpus = num(r.cpuCount);
  if (cpus >= 1 && cpus <= MAX_CPUS) base.cpuCount = cpus;
  base.rules = sanitizeRules(r.rules);
  return base;
}

/** Score for the human at the end (or when they quit): progress along the board, bonus for winning fast. */
export function scoreFor(s: GameState, id: string): number {
  const pos = playerById(s, id).pos;
  if (s.winner !== id) return pos * 5;
  return 500 + Math.max(0, 100 - turnsOf(s, id)) * 5;
}

/** Fold a finished game into the saved progress. */
export function recordResult(
  p: Progress,
  s: GameState,
  difficulty: Difficulty,
  humanId: string,
): { next: Progress; newBest: boolean } {
  const won = s.winner === humanId;
  const score = scoreFor(s, humanId);
  const newBest = score > p.best[difficulty];
  const streak = won ? p.streak + 1 : 0;
  const turns = turnsOf(s, humanId);
  return {
    newBest,
    next: {
      ...p,
      best: { ...p.best, [difficulty]: Math.max(p.best[difficulty], score) },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      fastestWin: won ? (p.fastestWin ? Math.min(p.fastestWin, turns) : turns) : p.fastestWin,
      lastDifficulty: difficulty,
    },
  };
}
