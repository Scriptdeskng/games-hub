import { describe, expect, it } from 'vitest';
import {
  dailyDone,
  dailyPackFor,
  dailySeedFor,
  finishDaily,
  sanitizeDaily,
  startDaily,
} from './daily';
import { createRound, select, tick, wordCells } from './engine';
import { PACKS_ON_DISK } from './fixtures';
import { generatePuzzle } from './generator';
import { emptyProgress, recordRound, sanitizeProgress, spendCoins } from './progress';

const round = (win: boolean) => {
  const r = generatePuzzle({ pack: PACKS_ON_DISK[1]!, difficulty: 'easy', seed: 3 });
  if (!r.ok) throw new Error('gen');
  let s = createRound(r.puzzle);
  if (win) {
    for (let i = 0; i < s.puzzle.words.length; i++) {
      const c = wordCells(s, i);
      s = select(s, c[0]!, c[c.length - 1]!).state;
    }
  } else s = tick(s, 1e9);
  return s;
};

describe('progress', () => {
  it('sanitize repairs junk and keeps good data', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const bad = sanitizeProgress(
      {
        coins: -5,
        plays: 2,
        wins: 9,
        best: { easy: { score: 'x', stars: 99 } },
        packs: { 'naija-food': { plays: 1, wins: 5 }, '../evil': { plays: 1 }, 'x y': {} },
        lastDifficulty: 'nope',
        lastPack: 'ghost',
      },
      ['naija-food'],
    );
    expect(bad.coins).toBe(0);
    expect(bad.wins).toBe(2);
    expect(bad.best.easy).toEqual({ score: 0, stars: 3, fastestMs: 0 });
    expect(bad.packs).toEqual({ 'naija-food': { plays: 1, wins: 1 } });
    expect(bad.lastDifficulty).toBe('medium');
    expect(bad.lastPack).toBe('naija-food');
    const good = { ...emptyProgress(), coins: 77, lastDifficulty: 'hard' as const };
    expect(sanitizeProgress(good).coins).toBe(77);
    expect(sanitizeProgress(good).lastDifficulty).toBe('hard');
  });
  it('spending: affordable pays and counts the hint; too poor returns null', () => {
    const p = emptyProgress();
    const q = spendCoins(p, 10)!;
    expect(q.coins).toBe(p.coins - 10);
    expect(q.hintsUsed).toBe(1);
    expect(spendCoins({ ...p, coins: 5 }, 10)).toBeNull();
    expect(spendCoins(p, -1)).toBeNull();
  });
  it('a win records bests, coins, streak and pack stats; a loss ends the streak', () => {
    const w = recordRound(emptyProgress(), round(true));
    expect(w.newBest).toBe(true);
    expect(w.coins).toBeGreaterThan(0);
    expect(w.next.wins).toBe(1);
    expect(w.next.streak).toBe(1);
    expect(w.next.best.easy.stars).toBeGreaterThan(0);
    expect(w.next.best.easy.fastestMs).toBeGreaterThanOrEqual(0);
    expect(w.next.packs[PACKS_ON_DISK[1]!.id]).toEqual({ plays: 1, wins: 1 });
    const again = recordRound(w.next, round(true));
    expect(again.newBest).toBe(false);
    const l = recordRound(again.next, round(false));
    expect(l.next.streak).toBe(0);
    expect(l.next.bestStreak).toBe(2);
    expect(l.next.plays).toBe(3);
    expect(l.next.wordsFound).toBe(again.next.wordsFound);
  });
  it('a practice round changes nothing', () => {
    const p = emptyProgress();
    const r = recordRound(p, round(true), { practice: true });
    expect(r.next).toBe(p);
    expect(r.coins).toBe(0);
    expect(r.newBest).toBe(false);
  });
});

describe('daily', () => {
  const day = new Date(2026, 10, 8, 12);
  it('same date, same seed and pack; another date differs somewhere', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(dailySeedFor(day)).toBe(dailySeedFor(new Date(2026, 10, 8, 23)));
    expect(dailyPackFor(ids, day)).toBe(dailyPackFor(ids, new Date(2026, 10, 8, 1)));
    const seeds = new Set([9, 10, 11, 12].map((d) => dailySeedFor(new Date(2026, 10, d))));
    expect(seeds.size).toBe(4);
  });
  it('the first start of a day is scored, later starts are practice and cannot change the record', () => {
    const first = startDaily(null, day);
    expect(first.practice).toBe(false);
    expect(dailyDone(first.record, day)).toBe(true);
    const second = startDaily(first.record, day);
    expect(second.practice).toBe(true);
    expect(second.record).toBe(first.record);
    expect(startDaily(first.record, new Date(2026, 10, 9)).practice).toBe(false);
    const fin = finishDaily(first.record, { score: 500, stars: 2 }, false);
    expect(fin).toMatchObject({ score: 500, stars: 2, finished: true });
    expect(finishDaily(fin, { score: 9, stars: 3 }, true)).toBe(fin);
  });
  it('sanitizeDaily accepts only a dated record', () => {
    expect(sanitizeDaily(null)).toBeNull();
    expect(sanitizeDaily({ date: 'today' })).toBeNull();
    expect(sanitizeDaily({ date: '2026-11-08', score: 300, stars: 9 })).toEqual({
      date: '2026-11-08',
      score: 300,
      stars: 3,
      finished: true,
    });
    expect(sanitizeDaily({ date: '2026-11-08', finished: false })?.finished).toBe(false);
  });
});
