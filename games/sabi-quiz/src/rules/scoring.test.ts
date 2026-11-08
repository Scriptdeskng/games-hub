import { describe, expect, it } from 'vitest';
import { classicPoints, duelPoints, multiplierFor, speedBonus } from './scoring';

describe('scoring', () => {
  it('streak tiers: x2 at 3, x3 at 5, x5 at 8', () => {
    expect([0, 1, 2, 3, 4, 5, 7, 8, 20].map(multiplierFor)).toEqual([1, 1, 1, 2, 2, 3, 3, 5, 5]);
  });

  it('speed bonus runs from the maximum down to zero and is clamped', () => {
    expect(speedBonus(15000, 15000)).toBe(50);
    expect(speedBonus(7500, 15000)).toBe(25);
    expect(speedBonus(0, 15000)).toBe(0);
    expect(speedBonus(99999, 15000)).toBe(50);
    expect(speedBonus(-5, 15000)).toBe(0);
    expect(speedBonus(100, 0)).toBe(0);
  });

  it('classic points combine base, speed, streak and difficulty scale', () => {
    const o = {
      questionDifficulty: 'medium',
      timeLeftMs: 15000,
      limitMs: 15000,
      streakAfter: 1,
      scalePct: 100,
    } as const;
    expect(classicPoints(o)).toBe(200);
    expect(classicPoints({ ...o, streakAfter: 3 })).toBe(400);
    expect(classicPoints({ ...o, streakAfter: 8 })).toBe(1000);
    expect(classicPoints({ ...o, scalePct: 150 })).toBe(300);
    expect(classicPoints({ ...o, questionDifficulty: 'hard', timeLeftMs: 0 })).toBe(200);
  });

  it('duel points: 100 plus up to 100 for speed', () => {
    expect(duelPoints(15000, 15000)).toBe(200);
    expect(duelPoints(0, 15000)).toBe(100);
    expect(duelPoints(10000, 15000)).toBeGreaterThan(duelPoints(5000, 15000));
  });
});
