import { dailySeed, localDateKey } from '@naija/core/content';

export const DAILY_SCOPE = 'sabi-words';

/** The one scored attempt of a day, kept on this device only. No user id of any kind. */
export interface DailyRecord {
  /** local calendar date, YYYY-MM-DD */
  date: string;
  score: number;
  stars: number;
  /** false from the moment the attempt starts until it is finished */
  finished: boolean;
}

export const dailySeedFor = (d: Date = new Date()): number => dailySeed(DAILY_SCOPE, d);

/** Today's pack, from the date alone: the same for everybody on that date. */
export const dailyPackFor = (packIds: readonly string[], d: Date = new Date()): string =>
  packIds[dailySeedFor(d) % packIds.length] as string;

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
    stars: Math.min(3, num(r.stars)),
    finished: typeof r.finished === 'boolean' ? r.finished : score > 0,
  };
}

export const dailyDone = (rec: DailyRecord | null, d: Date = new Date()): boolean =>
  rec !== null && rec.date === localDateKey(d);

/** The first START of the day is the scored attempt; Restart, Quit and re-entering are practice. */
export function startDaily(
  rec: DailyRecord | null,
  d: Date = new Date(),
): { practice: boolean; record: DailyRecord } {
  if (rec && dailyDone(rec, d)) return { practice: true, record: rec };
  return {
    practice: false,
    record: { date: localDateKey(d), score: 0, stars: 0, finished: false },
  };
}

export function finishDaily(
  rec: DailyRecord,
  r: { score: number; stars: number },
  practice: boolean,
): DailyRecord {
  return practice ? rec : { ...rec, score: r.score, stars: r.stars, finished: true };
}
