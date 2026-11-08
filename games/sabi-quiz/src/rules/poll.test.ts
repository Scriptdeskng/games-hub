import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { mkQ } from '../testkit';
import { padiPoll, toPercents } from './poll';

describe('toPercents', () => {
  it('always sums to 100 and keeps zeros at zero', () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const w = [rng.next(), rng.next(), 0, rng.next()];
      const p = toPercents(w);
      expect(p.reduce((a, b) => a + b, 0)).toBe(100);
      expect(p[2]).toBe(0);
    }
    expect(toPercents([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
    expect(toPercents([1, 1, 1, 1])).toEqual([25, 25, 25, 25]);
  });
});

describe('padiPoll', () => {
  const q = mkQ('p', 2);

  it('leans towards the right answer: it is the crowd favourite about (1 - wrongChance) of the time', () => {
    const rng = createRng(77);
    const N = 6000;
    for (const wrongChance of [0.1, 0.18, 0.28]) {
      let right = 0;
      let share = 0;
      for (let i = 0; i < N; i++) {
        const p = padiPoll(q, [], rng, wrongChance);
        const top = p.indexOf(Math.max(...p));
        if (top === 2) right++;
        share += p[2]!;
        expect(p.reduce((a, b) => a + b, 0)).toBe(100);
      }
      expect(right / N).toBeGreaterThan(1 - wrongChance - 0.03);
      expect(right / N).toBeLessThan(1 - wrongChance + 0.03);
      expect(share / N).toBeGreaterThan(40); // the right answer averages well over a quarter
    }
  });

  it('is sometimes wrong, but then the right answer usually stays second', () => {
    const rng = createRng(5);
    let wrongLead = 0;
    let rightSecond = 0;
    for (let i = 0; i < 4000; i++) {
      const p = padiPoll(q, [], rng, 0.3);
      const order = [0, 1, 2, 3].sort((a, b) => p[b]! - p[a]!);
      if (order[0] !== 2) {
        wrongLead++;
        if (order[1] === 2) rightSecond++;
      }
    }
    expect(wrongLead).toBeGreaterThan(900);
    expect(rightSecond / wrongLead).toBeGreaterThan(0.6);
  });

  it('with wrongChance 0 the right answer always leads', () => {
    const rng = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const p = padiPoll(q, [], rng, 0);
      expect(p.indexOf(Math.max(...p))).toBe(2);
    }
  });

  it('eliminated options get 0 and with only the answer left it gets 100', () => {
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const p = padiPoll(q, [0, 1], rng, 0.5);
      expect(p[0]).toBe(0);
      expect(p[1]).toBe(0);
      expect(p[2]! + p[3]!).toBe(100);
    }
    expect(padiPoll(q, [0, 1, 3], rng, 1)).toEqual([0, 0, 100, 0]);
  });

  it('is deterministic for a seed', () => {
    expect(padiPoll(q, [], createRng(4), 0.2)).toEqual(padiPoll(q, [], createRng(4), 0.2));
  });
});
