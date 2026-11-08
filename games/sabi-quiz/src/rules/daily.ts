import { dailySeed, localDateKey } from '@naija/core/content';
import type { QuizQuestion } from './config';
import { DAILY_MIX, pickRound } from './engine';
import { createRng } from '@naija/core/rng';

export const DAILY_SCOPE = 'sabi-quiz';

/** The one scored attempt of a day, kept on this device only. No user id of any kind. */
export interface DailyRecord {
  /** local calendar date, YYYY-MM-DD */
  date: string;
  score: number;
  correct: number;
}

/** The seed for a given local date: identical for everybody on that date. */
export const dailySeedFor = (d: Date = new Date()): number => dailySeed(DAILY_SCOPE, d);

/** Today's ten questions (4 easy, 4 medium, 2 hard, easy first) and the spares for Skip. */
export function dailyQuestions(
  pool: readonly QuizQuestion[],
  d: Date = new Date(),
): { questions: QuizQuestion[]; spares: QuizQuestion[] } {
  return pickRound(pool, createRng(dailySeedFor(d)), { mix: DAILY_MIX });
}

export function sanitizeDaily(raw: unknown): DailyRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DailyRecord>;
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return { date: r.date, score: num(r.score), correct: num(r.correct) };
}

/** Has today's scored attempt been used? Then a replay is practice only. */
export const dailyDone = (rec: DailyRecord | null, d: Date = new Date()): boolean =>
  rec !== null && rec.date === localDateKey(d);
