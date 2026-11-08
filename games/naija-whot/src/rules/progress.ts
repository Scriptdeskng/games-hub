import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { HAND_SIZE, MAX_CPUS, CPU_COUNTS, sanitizeRules, type Rules } from './config';
import { handOf, turnsOf, type GameState } from './engine';

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  best: Record<Difficulty, number>;
  plays: number;
  /** games started (quits included) */
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** most players caught without "Last card" in one game */
  bestCatches: number;
  lastDifficulty: Difficulty;
  cpuCount: number;
  rules: Rules;
  /** with no card to play, draw without asking (default on) */
  autoDraw: boolean;
  /** quicker animations and CPU pauses (about 1.7x) (default off) */
  fastPlay: boolean;
}

export const emptyProgress = (): Progress => ({
  best: { easy: 0, medium: 0, hard: 0 },
  plays: 0,
  games: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  bestCatches: 0,
  lastDifficulty: 'medium',
  cpuCount: 1,
  rules: sanitizeRules(null),
  autoDraw: true,
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
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  base.bestCatches = num(r.bestCatches);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  const cpus = num(r.cpuCount);
  if (cpus >= 1 && cpus <= MAX_CPUS && CPU_COUNTS.includes(cpus)) base.cpuCount = cpus;
  base.rules = sanitizeRules(r.rules);
  base.autoDraw = r.autoDraw !== false;
  base.fastPlay = r.fastPlay === true;
  return base;
}

/**
 * Score for the human: cards shed so far, plus (for a win) a bonus for every card the CPUs still
 * hold and for speed. A new best only counts on a win.
 */
export function scoreFor(s: GameState, id: string): number {
  const mine = handOf(s, id).length;
  const base = Math.max(0, HAND_SIZE - mine) * 10;
  if (s.winner !== id) return base;
  const others = s.hands.reduce((n, h) => n + h.length, 0) - mine;
  const fast = Math.max(0, 200 - turnsOf(s, id) * 4);
  return base + 300 + others * 15 + fast;
}

/** Fold a finished game into the saved progress. */
export function recordResult(
  p: Progress,
  s: GameState,
  difficulty: Difficulty,
  humanId: string,
  catches: number,
): { next: Progress; newBest: boolean } {
  const won = s.winner === humanId;
  const score = scoreFor(s, humanId);
  const newBest = won && score > p.best[difficulty];
  const streak = won ? p.streak + 1 : 0;
  return {
    newBest,
    next: {
      ...p,
      best: { ...p.best, [difficulty]: Math.max(p.best[difficulty], won ? score : 0) },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      bestCatches: Math.max(p.bestCatches, catches),
      lastDifficulty: difficulty,
    },
  };
}
