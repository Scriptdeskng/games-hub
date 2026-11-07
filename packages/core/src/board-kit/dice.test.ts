import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { rollChoice, rollDie, rollSum, rollTwoDice, takeChoice } from './dice';

describe('dice', () => {
  it('rolls stay in range and every face shows up', () => {
    const rng = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 600; i++) {
      const v = rollDie(rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is roughly fair', () => {
    const rng = createRng(99);
    const counts = [0, 0, 0, 0, 0, 0];
    const n = 12000;
    for (let i = 0; i < n; i++) counts[rollDie(rng) - 1]!++;
    for (const c of counts) expect(Math.abs(c / n - 1 / 6)).toBeLessThan(0.02);
  });

  it('same seed gives the same sequence and the state can be restored', () => {
    const a = createRng(5);
    const b = createRng(5);
    expect([1, 2, 3, 4].map(() => rollDie(a))).toEqual([1, 2, 3, 4].map(() => rollDie(b)));
    const saved = a.getState();
    const next = rollTwoDice(a);
    b.setState(saved);
    expect(rollTwoDice(b)).toEqual(next);
  });

  it('supports other die sizes, sums and two dice', () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) expect(rollDie(rng, 20)).toBeLessThanOrEqual(20);
    const [a, b] = rollTwoDice(rng);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(b).toBeLessThanOrEqual(6);
    const s = rollSum(rng, 3);
    expect(s).toBeGreaterThanOrEqual(3);
    expect(s).toBeLessThanOrEqual(18);
    expect(rollSum(rng, 0)).toBe(0);
  });

  it('pick one of two is plain data and takeChoice rejects bad indexes', () => {
    const c = rollChoice(createRng(8));
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    expect(takeChoice(c, 0)).toBe(c.options[0]);
    expect(takeChoice(c, 1)).toBe(c.options[1]);
    expect(() => takeChoice(c, 2)).toThrow(RangeError);
    expect(() => takeChoice(c, -1)).toThrow(RangeError);
  });
});
