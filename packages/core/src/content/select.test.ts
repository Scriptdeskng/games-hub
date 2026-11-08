import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { dailyRng, dailySeed, localDateKey, pickQuestions, shuffleOptions } from './select';
import { question } from './fixtures';
import type { Difficulty } from './types';

const cats = ['food', 'music', 'places'];
const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
const pool = Array.from({ length: 90 }, (_, i) =>
  question(i, { category: cats[i % 3]!, difficulty: diffs[Math.floor(i / 3) % 3]! }),
);

describe('pickQuestions', () => {
  it('returns distinct questions, deterministic per seed', () => {
    const a = pickQuestions(pool, createRng(5), { count: 20 });
    const b = pickQuestions(pool, createRng(5), { count: 20 });
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(new Set(a.map((q) => q.id)).size).toBe(20);
    expect(pickQuestions(pool, createRng(6), { count: 20 }).map((q) => q.id)).not.toEqual(
      a.map((q) => q.id),
    );
  });
  it('honours the difficulty mix and category filter', () => {
    const r = pickQuestions(pool, createRng(1), {
      count: 10,
      mix: { easy: 5, medium: 3, hard: 2 },
      categories: ['food', 'music'],
    });
    expect(r.filter((q) => q.difficulty === 'easy')).toHaveLength(5);
    expect(r.filter((q) => q.difficulty === 'medium')).toHaveLength(3);
    expect(r.filter((q) => q.difficulty === 'hard')).toHaveLength(2);
    expect(r.every((q) => q.category !== 'places')).toBe(true);
  });
  it('spreads categories within a bucket', () => {
    const r = pickQuestions(pool, createRng(2), { count: 3, mix: { easy: 3 } });
    expect(new Set(r.map((q) => q.category)).size).toBe(3);
  });
  it('tops up from other difficulties when a bucket is short, and never over-fills', () => {
    const small = [question(1), question(2), question(3, { difficulty: 'hard' })];
    const r = pickQuestions(small, createRng(1), { count: 3, mix: { medium: 2, easy: 5 } });
    expect(r).toHaveLength(3);
    expect(pickQuestions(small, createRng(1), { count: 10 })).toHaveLength(3);
    expect(pickQuestions(small, createRng(1), { count: 0, mix: { easy: 2 } })).toHaveLength(0);
  });
  it('skips excluded ids only while enough fresh questions remain', () => {
    const ex = new Set(pool.slice(0, 80).map((q) => q.id));
    const fresh = pickQuestions(pool, createRng(1), { count: 10, exclude: ex });
    expect(fresh.every((q) => !ex.has(q.id))).toBe(true);
    const forced = pickQuestions(pool, createRng(1), { count: 20, exclude: ex });
    expect(forced).toHaveLength(20);
  });
});

describe('shuffleOptions', () => {
  it('keeps the correct answer text on the correct index and does not mutate', () => {
    const q = question(1, { options: ['Lagos', 'Abuja', 'Kano', 'Enugu'], answer: 1 });
    const seen = new Set<number>();
    for (let s = 0; s < 60; s++) {
      const r = shuffleOptions(q, createRng(s));
      expect(r.options[r.answer]).toBe('Abuja');
      expect([...r.options].sort()).toEqual(['Abuja', 'Enugu', 'Kano', 'Lagos']);
      seen.add(r.answer);
    }
    expect(seen.size).toBe(4);
    expect(q.options[0]).toBe('Lagos');
    expect(q.answer).toBe(1);
  });
});

describe('daily seed', () => {
  it('formats the LOCAL date', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('is stable within a day and differs by day and scope', () => {
    const morning = new Date(2026, 10, 8, 6);
    const night = new Date(2026, 10, 8, 23);
    expect(dailySeed('sabi-quiz', morning)).toBe(dailySeed('sabi-quiz', night));
    expect(dailySeed('sabi-quiz', morning)).not.toBe(dailySeed('sabi-quiz', new Date(2026, 10, 9)));
    expect(dailySeed('sabi-quiz', morning)).not.toBe(dailySeed('sabi-words', morning));
    expect(dailySeed('sabi-quiz')).toBeTypeOf('number');
  });
  it('gives everyone the same daily question set', () => {
    const d = new Date(2026, 10, 8);
    const a = pickQuestions(pool, dailyRng('sabi-quiz', d), { count: 10 });
    const b = pickQuestions(pool, dailyRng('sabi-quiz', d), { count: 10 });
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });
});
