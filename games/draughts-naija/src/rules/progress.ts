import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { LIGHT } from './board';
import { sanitizeToggles, type RuleToggles, type Size } from './config';
import { pieceCounts, type GameState } from './engine';

type BestTable = Record<Difficulty, number>;

/** Saved through core.portal.saveProgress(): JSON only, no personal data. */
export interface Progress {
  /** best winning score per board size and difficulty */
  best: { 10: BestTable; 8: BestTable };
  plays: number;
  /** games started (quits included) */
  games: number;
  wins: number;
  draws: number;
  streak: number;
  bestStreak: number;
  /** most pieces taken in one move */
  bestCapture: number;
  lastDifficulty: Difficulty;
  lastSize: Size;
  toggles: RuleToggles;
  /** quicker animations and CPU pauses, default off */
  fastPlay: boolean;
}

const emptyTable = (): BestTable => ({ easy: 0, medium: 0, hard: 0 });

export const emptyProgress = (): Progress => ({
  best: { 10: emptyTable(), 8: emptyTable() },
  plays: 0,
  games: 0,
  wins: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
  bestCapture: 0,
  lastDifficulty: 'medium',
  lastSize: 10,
  toggles: sanitizeToggles(null),
  fastPlay: false,
});

const num = (v: unknown, max = 1_000_000): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0;

/** Repair anything loaded from storage or the portal: never trust it. */
export function sanitizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  for (const size of [10, 8] as const)
    for (const d of DIFFICULTIES) base.best[size][d] = num(r.best?.[size]?.[d]);
  base.plays = num(r.plays);
  base.games = Math.max(num(r.games), base.plays);
  base.wins = Math.min(num(r.wins), base.plays);
  base.draws = Math.min(num(r.draws), base.plays - base.wins);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  base.bestCapture = num(r.bestCapture, 40);
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  if (r.lastSize === 8 || r.lastSize === 10) base.lastSize = r.lastSize;
  base.toggles = sanitizeToggles(r.toggles);
  base.fastPlay = r.fastPlay === true;
  return base;
}

/** What a finished game was worth: `hints` hints were used. */
export const hintPenalty = 15;

/**
 * Score for the human (light): 10 per piece taken, 15 per king made, +100 for a draw, and for a
 * win +300, +5 per piece left and up to +200 for speed (2 per move under 100). Each hint costs 15.
 */
export function scoreFor(s: GameState, hints = 0): number {
  let score = s.captured[LIGHT] * 10 + s.crowned[LIGHT] * 15;
  const r = s.result;
  if (r && r.winner === LIGHT) {
    const moves = Math.ceil(s.plies / 2);
    score += 300 + pieceCounts(s).light * 5 + Math.max(0, 100 - moves) * 2;
  } else if (r && r.winner === null) score += 100;
  return Math.max(0, score - hints * hintPenalty);
}

/** Fold a finished game into the saved progress. */
export function recordResult(
  p: Progress,
  s: GameState,
  difficulty: Difficulty,
  score: number,
  bestCapture: number,
): { next: Progress; newBest: boolean } {
  const won = s.result?.winner === LIGHT;
  const draw = s.result?.winner === null;
  const size = s.rules.size;
  const newBest = won && score > p.best[size][difficulty];
  const streak = won ? p.streak + 1 : draw ? p.streak : 0;
  return {
    newBest,
    next: {
      ...p,
      best: {
        ...p.best,
        [size]: {
          ...p.best[size],
          [difficulty]: Math.max(p.best[size][difficulty], won ? score : 0),
        },
      },
      plays: p.plays + 1,
      wins: p.wins + (won ? 1 : 0),
      draws: p.draws + (draw ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      bestCapture: Math.max(p.bestCapture, bestCapture),
      lastDifficulty: difficulty,
      lastSize: size,
    },
  };
}
