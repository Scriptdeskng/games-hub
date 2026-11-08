import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { POOL } from '../testkit';
import {
  answer,
  answerCpu,
  bestKey,
  categoryAccuracy,
  createRound,
  current,
  dailyDone,
  pickRound,
  finishDaily,
  startDaily,
  dailySeedFor,
  emptyProgress,
  next,
  recordRound,
  sanitizeDaily,
  sanitizeProgress,
  DAILY_MIX,
  DIFFICULTIES,
  type GameState,
  type Mode,
} from './index';

const play = (mode: Mode, right: number, seed = 1): GameState => {
  let s = createRound({ pool: POOL, mode, difficulty: 'medium', seed });
  for (let i = 0; i < 10; i++) {
    const q = current(s);
    if (mode === 'duel') s = answerCpu(s, (q.answer + 1) % 4);
    s = next(answer(s, i < right ? q.answer : (q.answer + 1) % 4));
  }
  return s;
};

describe('progress', () => {
  it('sanitizeProgress repairs anything it is given', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const dirty = sanitizeProgress({
      best: { 'classic:easy': -4, 'duel:hard': 'big', daily: 800 },
      plays: 3.7,
      wins: 99,
      bestStreak: NaN,
      categories: { food: { asked: 4, correct: 9 }, junk: { asked: 1, correct: 1 } },
      duel: { easy: { won: 2, lost: 'x', drawn: -1 } },
      lastDifficulty: 'insane',
      lastMode: 'duel',
      lastCategory: 'nope',
    });
    expect(dirty.best['classic:easy']).toBe(0);
    expect(dirty.best['duel:hard']).toBe(0);
    expect(dirty.plays).toBe(3);
    expect(dirty.wins).toBe(3);
    expect(dirty.bestStreak).toBe(0);
    expect(dirty.categories.food).toEqual({ asked: 4, correct: 4 });
    expect(dirty.categories.junk).toBeUndefined();
    expect(dirty.duel.easy).toEqual({ won: 2, lost: 0, drawn: 0 });
    expect(dirty.lastDifficulty).toBe('medium');
    expect(dirty.lastMode).toBe('duel');
    expect(dirty.lastCategory).toBe('all');
    expect(sanitizeProgress({ lastCategory: 'food', lastDifficulty: 'hard' })).toMatchObject({
      lastCategory: 'food',
      lastDifficulty: 'hard',
    });
  });

  it('keeps a best per mode and difficulty, one for the Daily', () => {
    expect(bestKey('classic', 'hard')).toBe('classic:hard');
    expect(bestKey('duel', 'easy')).toBe('duel:easy');
    expect(bestKey('daily', 'hard')).toBe('daily');
    expect(Object.keys(emptyProgress().best)).toEqual([]);
    expect(Object.keys(sanitizeProgress({}).best)).toHaveLength(7);
  });

  it('records a classic round: best, plays, wins, streak, accuracy per category', () => {
    const s = play('classic', 8);
    const { next: p, newBest } = recordRound(emptyProgress(), s, { won: true, category: 'food' });
    expect(newBest).toBe(true);
    expect(p.best['classic:medium']).toBe(s.score);
    expect(p.plays).toBe(1);
    expect(p.wins).toBe(1);
    expect(p.bestStreak).toBe(s.bestStreak);
    expect(p.lastCategory).toBe('food');
    const asked = Object.values(p.categories).reduce((a, c) => a + c.asked, 0);
    const right = Object.values(p.categories).reduce((a, c) => a + c.correct, 0);
    expect(asked).toBe(10);
    expect(right).toBe(8);
    const again = recordRound(p, s, { won: true });
    expect(again.newBest).toBe(false);
    expect(again.next.best['classic:medium']).toBe(s.score);
    expect(again.next.lastCategory).toBe('food');
  });

  it('a lower score never lowers the best', () => {
    const hi = recordRound(emptyProgress(), play('classic', 10), { won: true }).next;
    const lo = recordRound(hi, play('classic', 2, 5), { won: false }).next;
    expect(lo.best['classic:medium']).toBe(hi.best['classic:medium']);
    expect(lo.wins).toBe(1);
    expect(lo.plays).toBe(2);
  });

  it('a practice replay of the Daily changes accuracy but never the best or the wins', () => {
    const s = play('daily', 10);
    const { next: p, newBest } = recordRound(emptyProgress(), s, { won: true, practice: true });
    expect(newBest).toBe(false);
    expect(p.best['daily']).toBeUndefined();
    expect(p.wins).toBe(0);
    expect(p.plays).toBe(0); // a practice replay is not a counted round
    expect(p.lastDifficulty).toBe('medium');
    const scored = recordRound(emptyProgress(), s, { won: true });
    expect(scored.newBest).toBe(true);
    expect(scored.next.best['daily']).toBe(s.score);
  });

  it('records duel results per difficulty', () => {
    const win = recordRound(emptyProgress(), play('duel', 10), { won: true }).next;
    expect(win.duel.medium).toEqual({ won: 1, lost: 0, drawn: 0 });
    const lose = recordRound(win, play('duel', 0), { won: false }).next;
    expect(lose.duel.medium.won).toBe(1);
    expect(lose.duel.medium.lost + lose.duel.medium.drawn).toBe(1);
    const drawn = { ...play('duel', 0), cpu: { ...play('duel', 0).cpu!, score: 0 } };
    const d = recordRound(emptyProgress(), drawn, { won: false }).next;
    expect(d.duel.medium.drawn).toBe(1);
  });

  it('categoryAccuracy is null before a question and a percentage after', () => {
    const p = recordRound(emptyProgress(), play('classic', 5), { won: false }).next;
    const seen = Object.keys(p.categories).filter((c) => p.categories[c]!.asked > 0);
    expect(seen.length).toBeGreaterThan(0);
    expect(categoryAccuracy(emptyProgress(), 'food')).toBeNull();
    expect(categoryAccuracy(p, seen[0]!)).toBeGreaterThanOrEqual(0);
    expect(categoryAccuracy(p, 'nothing')).toBeNull();
  });
});

/** Today's picks, built the way the game does it: the date's seed through createRound's pick. */
const dailyQuestions = (pool: typeof POOL, d: Date) =>
  pickRound(pool, createRng(dailySeedFor(d)), { mix: DAILY_MIX });

describe('daily challenge', () => {
  const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d, 12);

  it('is deterministic: same date, same ten questions and spares', () => {
    const a = dailyQuestions(POOL, day(2026, 11, 8));
    const b = dailyQuestions(POOL, day(2026, 11, 8));
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.spares.map((q) => q.id)).toEqual(b.spares.map((q) => q.id));
    expect(dailySeedFor(day(2026, 11, 8))).toBe(dailySeedFor(day(2026, 11, 8)));
  });

  it('changes with the date and is independent of the time of day', () => {
    const ids = (d: Date): string =>
      dailyQuestions(POOL, d)
        .questions.map((q) => q.id)
        .join();
    expect(ids(day(2026, 11, 8))).not.toBe(ids(day(2026, 11, 9)));
    expect(ids(new Date(2026, 10, 8, 0, 5))).toBe(ids(new Date(2026, 10, 8, 23, 55)));
  });

  it('is ten questions, 4 easy, 4 medium, 2 hard, ramping up', () => {
    const { questions } = dailyQuestions(POOL, day(2026, 1, 1));
    expect(questions).toHaveLength(10);
    for (const d of DIFFICULTIES) {
      expect(questions.filter((q) => q.difficulty === d)).toHaveLength(DAILY_MIX[d]);
    }
    expect(questions.map((q) => q.difficulty).slice(0, 4)).toEqual([
      'easy',
      'easy',
      'easy',
      'easy',
    ]);
  });

  it('a round built from the daily seed matches dailyQuestions', () => {
    const d = day(2026, 11, 8);
    const s = createRound({ pool: POOL, mode: 'daily', difficulty: 'easy', seed: dailySeedFor(d) });
    expect(s.questions.map((q) => q.id)).toEqual(
      dailyQuestions(POOL, d).questions.map((q) => q.id),
    );
  });

  it('uses the local date: one scored attempt per day', () => {
    const rec = { date: '2026-11-08', score: 900, correct: 8, finished: true };
    expect(dailyDone(rec, day(2026, 11, 8))).toBe(true);
    expect(dailyDone(rec, day(2026, 11, 9))).toBe(false);
    expect(dailyDone(null, day(2026, 11, 8))).toBe(false);
  });

  it('sanitizeDaily accepts only a dated record and holds no user id', () => {
    expect(sanitizeDaily({ date: '2026-11-08', score: 5.9, correct: -2 })).toEqual({
      date: '2026-11-08',
      score: 5,
      correct: 0,
      finished: true,
    });
    expect(sanitizeDaily({ date: 'yesterday', score: 1 })).toBeNull();
    expect(sanitizeDaily(null)).toBeNull();
    expect(sanitizeDaily(7)).toBeNull();
    expect(
      Object.keys(sanitizeDaily({ date: '2026-11-08', uid: 'x', token: 't' })!).sort(),
    ).toEqual(['correct', 'date', 'finished', 'score']);
  });

  it('the first START is the scored attempt: quit and start again is practice, saved score untouched', () => {
    const d = day(2026, 11, 8);
    const first = startDaily(null, d);
    expect(first.practice).toBe(false);
    expect(first.record).toEqual({ date: '2026-11-08', score: 0, correct: 0, finished: false });
    const again = startDaily(first.record, d);
    expect(again.practice).toBe(true);
    expect(again.record).toBe(first.record);
    expect(finishDaily(first.record, { score: 9999, correct: 10 }, true)).toBe(first.record);
    expect(finishDaily(first.record, { score: 700, correct: 6 }, false)).toEqual({
      date: '2026-11-08',
      score: 700,
      correct: 6,
      finished: true,
    });
    expect(startDaily(first.record, day(2026, 11, 9)).practice).toBe(false);
  });
});
