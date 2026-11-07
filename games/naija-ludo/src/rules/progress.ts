import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { MAX_CPUS, CPU_COUNTS, sanitizeRules, type Rules } from './config';
import { homeCount, playerById, turnsOf, type GameState } from './engine';

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  best: Record<Difficulty, number>;
  plays: number;
  /** games started (quits included) */
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** most captures in one game */
  bestCaptures: number;
  lastDifficulty: Difficulty;
  cpuCount: number;
  rules: Rules;
  /** with only one legal move, make it without asking (default on) */
  autoMove: boolean;
  /** quicker animations and CPU pauses (about 1.7x), for long four-player games (default off) */
  fastPlay: boolean;
}

export const emptyProgress = (): Progress => ({
  best: { easy: 0, medium: 0, hard: 0 },
  plays: 0,
  games: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  bestCaptures: 0,
  lastDifficulty: 'medium',
  cpuCount: 1,
  rules: sanitizeRules(null),
  autoMove: true,
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
  base.bestCaptures = num(r.bestCaptures);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  const cpus = num(r.cpuCount);
  if (cpus >= 1 && cpus <= MAX_CPUS && CPU_COUNTS.includes(cpus)) base.cpuCount = cpus;
  base.rules = sanitizeRules(r.rules);
  base.autoMove = r.autoMove !== false;
  base.fastPlay = r.fastPlay === true;
  return base;
}

/** Score for the human: progress of every seed, plus a bonus for winning (faster is better). */
export function scoreFor(s: GameState, id: string): number {
  const me = playerById(s, id);
  const steps = me.seeds.reduce((a, x) => a + Math.max(0, x + 1), 0);
  const base = steps * 2 + homeCount(me) * 40;
  if (s.winner !== id) return base;
  const quick = s.rules.quick ? 0.5 : 1;
  return base + 300 + Math.max(0, Math.round((400 * quick - turnsOf(s, id)) * 0.75));
}

/** Fold a finished game into the saved progress. */
export function recordResult(
  p: Progress,
  s: GameState,
  difficulty: Difficulty,
  humanId: string,
  captures: number,
): { next: Progress; newBest: boolean } {
  const won = s.winner === humanId;
  const score = scoreFor(s, humanId);
  const newBest = won && score > p.best[difficulty];
  const streak = won ? p.streak + 1 : 0;
  return {
    newBest,
    next: {
      ...p,
      best: { ...p.best, [difficulty]: Math.max(p.best[difficulty], score) },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      bestCaptures: Math.max(p.bestCaptures, captures),
      lastDifficulty: difficulty,
    },
  };
}
