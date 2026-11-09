import { DIFFICULTIES, type Difficulty } from './config';
import { coinsEarned, elapsedMs, score, stars, type GameState } from './engine';

export interface BestRecord {
  score: number;
  stars: number;
  /** fastest win, ms (0 = none yet) */
  fastestMs: number;
}
export interface PackStat {
  plays: number;
  wins: number;
}

/** Saved through core.portal.saveProgress(): JSON only. Coins are cosmetic and have no cash value. */
export interface Progress {
  coins: number;
  best: Record<Difficulty, BestRecord>;
  plays: number;
  wins: number;
  wordsFound: number;
  hintsUsed: number;
  /** wins in a row, and the longest run */
  streak: number;
  bestStreak: number;
  packs: Record<string, PackStat>;
  lastDifficulty: Difficulty;
  lastPack: string;
}

export const DEFAULT_PACK = 'naija-food';

export const emptyProgress = (): Progress => ({
  coins: 20,
  best: {
    easy: { score: 0, stars: 0, fastestMs: 0 },
    medium: { score: 0, stars: 0, fastestMs: 0 },
    hard: { score: 0, stars: 0, fastestMs: 0 },
  },
  plays: 0,
  wins: 0,
  wordsFound: 0,
  hintsUsed: 0,
  streak: 0,
  bestStreak: 0,
  packs: {},
  lastDifficulty: 'medium',
  lastPack: DEFAULT_PACK,
});

const num = (v: unknown, max = 1e9): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0;

/** Repair anything loaded from storage or the portal: never trust it. `packIds` limits pack keys. */
export function sanitizeProgress(raw: unknown, packIds?: readonly string[]): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  base.coins = r.coins === undefined ? base.coins : num(r.coins, 1e6);
  for (const d of DIFFICULTIES) {
    const b = r.best?.[d];
    base.best[d] = {
      score: num(b?.score),
      stars: Math.min(3, num(b?.stars)),
      fastestMs: num(b?.fastestMs),
    };
  }
  base.plays = num(r.plays);
  base.wins = Math.min(num(r.wins), base.plays);
  base.wordsFound = num(r.wordsFound);
  base.hintsUsed = num(r.hintsUsed);
  base.streak = num(r.streak);
  base.bestStreak = Math.max(num(r.bestStreak), base.streak);
  if (r.packs && typeof r.packs === 'object') {
    for (const [id, st] of Object.entries(r.packs)) {
      if (!/^[a-z0-9-]{1,40}$/.test(id) || (packIds && !packIds.includes(id))) continue;
      const plays = num(st?.plays);
      base.packs[id] = { plays, wins: Math.min(plays, num(st?.wins)) };
    }
  }
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  if (typeof r.lastPack === 'string' && (!packIds || packIds.includes(r.lastPack)))
    base.lastPack = r.lastPack;
  return base;
}

/** Pay for a hint: the new progress, or null when the player cannot afford it. */
export function spendCoins(p: Progress, cost: number): Progress | null {
  return cost > p.coins || cost < 0
    ? null
    : { ...p, coins: p.coins - cost, hintsUsed: p.hintsUsed + 1 };
}

/**
 * Fold a finished round into the saved progress. A practice replay of the Daily keeps its words
 * out of the stats and earns no coins, wins, bests or streak.
 */
export function recordRound(
  p: Progress,
  s: GameState,
  o: { practice?: boolean } = {},
): { next: Progress; newBest: boolean; coins: number } {
  if (o.practice) return { next: p, newBest: false, coins: 0 };
  const win = s.status === 'won';
  const sc = score(s);
  const prev = p.best[s.difficulty];
  const newBest = sc > prev.score;
  const fastest = win
    ? prev.fastestMs === 0
      ? elapsedMs(s)
      : Math.min(prev.fastestMs, elapsedMs(s))
    : prev.fastestMs;
  const coins = coinsEarned(s);
  const pk = p.packs[s.puzzle.packId] ?? { plays: 0, wins: 0 };
  const streak = win ? p.streak + 1 : 0;
  return {
    newBest,
    coins,
    next: {
      ...p,
      coins: Math.min(1e6, p.coins + coins),
      best: {
        ...p.best,
        [s.difficulty]: {
          score: Math.max(prev.score, sc),
          stars: Math.max(prev.stars, stars(s)),
          fastestMs: fastest,
        },
      },
      plays: p.plays + 1,
      wins: p.wins + (win ? 1 : 0),
      wordsFound: p.wordsFound + s.found.length,
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
      packs: {
        ...p.packs,
        [s.puzzle.packId]: { plays: pk.plays + 1, wins: pk.wins + (win ? 1 : 0) },
      },
      lastDifficulty: s.difficulty,
      lastPack: s.puzzle.packId,
    },
  };
}
