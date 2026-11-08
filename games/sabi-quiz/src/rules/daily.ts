import { dailySeed, localDateKey } from '@naija/core/content';

export const DAILY_SCOPE = 'sabi-quiz';

/** The one scored attempt of a day, kept on this device only. No user id of any kind. */
export interface DailyRecord {
  /** local calendar date, YYYY-MM-DD */
  date: string;
  score: number;
  correct: number;
  /** false from the moment the attempt starts until it is finished */
  finished: boolean;
}

/** The seed for a given local date: identical for everybody on that date. */
export const dailySeedFor = (d: Date = new Date()): number => dailySeed(DAILY_SCOPE, d);

export function sanitizeDaily(raw: unknown): DailyRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DailyRecord>;
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  const score = num(r.score);
  return {
    date: r.date,
    score,
    correct: num(r.correct),
    finished: typeof r.finished === 'boolean' ? r.finished : score > 0,
  };
}

/** Has today's scored attempt been used? Then a replay is practice only. */
export const dailyDone = (rec: DailyRecord | null, d: Date = new Date()): boolean =>
  rec !== null && rec.date === localDateKey(d);

/**
 * The first START of the day is the one scored attempt: the day is marked used at once, so
 * Restart, Quit and re-entering the Daily are Practice and cannot change the saved score.
 * Returns whether this start is practice and the record to store (unchanged for practice).
 */
export function startDaily(
  rec: DailyRecord | null,
  d: Date = new Date(),
): { practice: boolean; record: DailyRecord } {
  if (rec && dailyDone(rec, d)) return { practice: true, record: rec };
  return {
    practice: false,
    record: { date: localDateKey(d), score: 0, correct: 0, finished: false },
  };
}

/** Fold a finished scored attempt into the day's record (a practice replay returns it untouched). */
export function finishDaily(
  rec: DailyRecord,
  r: { score: number; correct: number },
  practice: boolean,
): DailyRecord {
  return practice ? rec : { ...rec, score: r.score, correct: r.correct, finished: true };
}
