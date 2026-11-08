import { CATEGORIES, DIFFICULTIES, MODES, type Difficulty, type Mode } from './config';
import { duelOutcome, type GameState } from './engine';

export interface CategoryStat {
  asked: number;
  correct: number;
}
export interface DuelRecord {
  won: number;
  lost: number;
  drawn: number;
}

/** Saved through core.portal.saveProgress() (the portal API with a token, localStorage without). */
export interface Progress {
  /** best score per `bestKey(mode, difficulty)` */
  best: Record<string, number>;
  plays: number;
  wins: number;
  /** most correct answers in a row, ever */
  bestStreak: number;
  categories: Record<string, CategoryStat>;
  duel: Record<Difficulty, DuelRecord>;
  lastDifficulty: Difficulty;
  lastMode: Mode;
  /** 'all' or one category id */
  lastCategory: string;
}

/** Classic and Duel keep a best per difficulty; the Daily has one best. */
export const bestKey = (mode: Mode, d: Difficulty): string =>
  mode === 'daily' ? 'daily' : `${mode}:${d}`;

export const emptyProgress = (): Progress => ({
  best: {},
  plays: 0,
  wins: 0,
  bestStreak: 0,
  categories: Object.fromEntries(CATEGORIES.map((c) => [c, { asked: 0, correct: 0 }])),
  duel: {
    easy: { won: 0, lost: 0, drawn: 0 },
    medium: { won: 0, lost: 0, drawn: 0 },
    hard: { won: 0, lost: 0, drawn: 0 },
  },
  lastDifficulty: 'medium',
  lastMode: 'classic',
  lastCategory: 'all',
});

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

/** Repair anything loaded from storage or the portal: never trust it. */
export function sanitizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  for (const m of MODES) {
    for (const d of DIFFICULTIES) {
      const k = bestKey(m, d);
      base.best[k] = num(r.best?.[k]);
    }
  }
  base.plays = num(r.plays);
  base.wins = Math.min(num(r.wins), base.plays);
  base.bestStreak = num(r.bestStreak);
  for (const c of CATEGORIES) {
    const asked = num(r.categories?.[c]?.asked);
    base.categories[c] = { asked, correct: Math.min(asked, num(r.categories?.[c]?.correct)) };
  }
  for (const d of DIFFICULTIES) {
    const x = r.duel?.[d];
    base.duel[d] = { won: num(x?.won), lost: num(x?.lost), drawn: num(x?.drawn) };
  }
  if (r.lastDifficulty && DIFFICULTIES.includes(r.lastDifficulty))
    base.lastDifficulty = r.lastDifficulty;
  if (r.lastMode && MODES.includes(r.lastMode)) base.lastMode = r.lastMode;
  if (r.lastCategory === 'all' || (CATEGORIES as readonly string[]).includes(r.lastCategory ?? ''))
    base.lastCategory = r.lastCategory as string;
  return base;
}

/** Percent correct in one category, or null before the first question of it. */
export const categoryAccuracy = (p: Progress, cat: string): number | null => {
  const c = p.categories[cat];
  return c && c.asked ? Math.round((c.correct / c.asked) * 100) : null;
};

/**
 * Fold a finished round into the saved progress. A practice replay of the Daily (the scored
 * attempt of the day is already used) updates accuracy stats but never a best score or a win.
 */
export function recordRound(
  p: Progress,
  s: GameState,
  o: { won: boolean; practice?: boolean; category?: string },
): { next: Progress; newBest: boolean } {
  const key = bestKey(s.mode, s.difficulty);
  const practice = o.practice === true;
  const prevBest = p.best[key] ?? 0;
  const newBest = !practice && s.score > prevBest;
  const categories = { ...p.categories };
  for (const a of s.history) {
    const c = categories[a.category] ?? { asked: 0, correct: 0 };
    categories[a.category] = {
      asked: c.asked + 1,
      correct: c.correct + (a.result === 'correct' ? 1 : 0),
    };
  }
  const duel = { ...p.duel };
  if (s.mode === 'duel') {
    const r = duel[s.difficulty];
    const out = duelOutcome(s);
    duel[s.difficulty] = {
      won: r.won + (out === 'win' ? 1 : 0),
      lost: r.lost + (out === 'lose' ? 1 : 0),
      drawn: r.drawn + (out === 'draw' ? 1 : 0),
    };
  }
  return {
    newBest,
    next: {
      ...p,
      best: practice ? p.best : { ...p.best, [key]: Math.max(prevBest, s.score) },
      plays: p.plays + 1,
      wins: p.wins + (o.won && !practice ? 1 : 0),
      bestStreak: Math.max(p.bestStreak, s.bestStreak),
      categories,
      duel,
      lastDifficulty: s.mode === 'daily' ? p.lastDifficulty : s.difficulty,
      lastMode: s.mode,
      lastCategory: o.category ?? p.lastCategory,
    },
  };
}
