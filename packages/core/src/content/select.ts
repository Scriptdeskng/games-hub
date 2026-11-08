import { createRng, seedFromString, type Rng } from '../rng';
import type { Difficulty, QuizQuestion } from './types';

export interface PickOptions {
  count: number;
  /** Only these categories (default: all). */
  categories?: readonly string[];
  /** Wanted number per difficulty; anything unmet is topped up from the nearest difficulty. */
  mix?: Partial<Record<Difficulty, number>>;
  /** Question ids to skip (e.g. recently seen). Ignored if it would leave too few questions. */
  exclude?: ReadonlySet<string>;
}

const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

/** Shuffle a bucket then interleave its categories so one topic cannot dominate. */
function spread(items: QuizQuestion[], rng: Rng): QuizQuestion[] {
  const byCat = new Map<string, QuizQuestion[]>();
  for (const q of rng.shuffle(items)) {
    const list = byCat.get(q.category);
    if (list) list.push(q);
    else byCat.set(q.category, [q]);
  }
  const lists = rng.shuffle([...byCat.values()]);
  const out: QuizQuestion[] = [];
  for (let i = 0; out.length < items.length; i++) {
    for (const l of lists) if (i < l.length) out.push(l[i] as QuizQuestion);
  }
  return out;
}

/**
 * Pick up to `count` distinct questions. Deterministic for a given rng state. Returns fewer than
 * `count` only when the pool itself is smaller.
 */
export function pickQuestions(
  pool: readonly QuizQuestion[],
  rng: Rng,
  opts: PickOptions,
): QuizQuestion[] {
  let items = pool.filter((q) => !opts.categories || opts.categories.includes(q.category));
  if (opts.exclude) {
    const fresh = items.filter((q) => !opts.exclude!.has(q.id));
    if (fresh.length >= opts.count) items = fresh;
  }
  const buckets: Record<Difficulty, QuizQuestion[]> = {
    easy: spread(
      items.filter((q) => q.difficulty === 'easy'),
      rng,
    ),
    medium: spread(
      items.filter((q) => q.difficulty === 'medium'),
      rng,
    ),
    hard: spread(
      items.filter((q) => q.difficulty === 'hard'),
      rng,
    ),
  };
  const out: QuizQuestion[] = [];
  const take = (d: Difficulty, n: number): void => {
    const got = buckets[d].splice(0, Math.max(0, n));
    out.push(...got);
  };
  if (opts.mix) for (const d of ORDER) take(d, Math.min(opts.mix[d] ?? 0, opts.count - out.length));
  // Top up from whatever is left (easy first), so the count is met when the pool allows.
  const left = ORDER.flatMap((d) => buckets[d]);
  out.push(...left.slice(0, Math.max(0, opts.count - out.length)));
  return out.slice(0, opts.count);
}

/**
 * Same question with options shuffled and `answer` re-pointed at the same text.
 * Pure: the input is not modified.
 */
export function shuffleOptions(q: QuizQuestion, rng: Rng): QuizQuestion {
  const order = rng.shuffle([0, 1, 2, 3]);
  const options = order.map((i) => q.options[i]) as QuizQuestion['options'];
  return { ...q, options, answer: order.indexOf(q.answer) as QuizQuestion['answer'] };
}

/** Local calendar date as `YYYY-MM-DD` (the player's own day, not UTC). */
export function localDateKey(d: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Deterministic daily-challenge seed: everyone with the same local date and `scope` (game slug or
 * pack id) gets the same seed. Derived ONLY from the date and scope, never from a user id, token
 * or phone number.
 */
export function dailySeed(scope: string, d: Date = new Date()): number {
  return seedFromString(`naija-daily|${scope}|${localDateKey(d)}`);
}

/** Convenience: an rng for today's challenge. */
export const dailyRng = (scope: string, d?: Date): Rng => createRng(dailySeed(scope, d));
