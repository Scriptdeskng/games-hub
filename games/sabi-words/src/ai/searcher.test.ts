import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, generatePuzzle, type Difficulty, type Puzzle } from '../rules';
import { PACKS_ON_DISK } from '../rules/fixtures';
import { SEARCHERS, clockShare, type Searcher } from './searcher';

const GAMES = 200;
/** The 200 seeded puzzles of each level, built once: the searcher models only read them. */
const PUZZLES = Object.fromEntries(
  DIFFICULTIES.map((d) => [
    d,
    Array.from({ length: GAMES }, (_, i) => {
      const r = generatePuzzle({
        pack: PACKS_ON_DISK[i % PACKS_ON_DISK.length]!,
        difficulty: d,
        seed: 1000 + i,
      });
      if (!r.ok) throw new Error('gen');
      return r.puzzle;
    }),
  ]),
) as Record<Difficulty, Puzzle[]>;
const share = (d: Difficulty, who: Searcher): number[] =>
  PUZZLES[d].map((pz, i) => clockShare(pz, who, i));
const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
const winRate = (a: number[]): number => a.filter((x) => x <= 1).length / a.length;

describe('difficulty measurably raises the challenge (modelled searcher, 200 seeded puzzles each)', () => {
  it('the share of the clock needed rises Easy < Medium < Hard for every kind of searcher', () => {
    for (const who of Object.values(SEARCHERS)) {
      const [e, m, h] = DIFFICULTIES.map((d) => mean(share(d, who))) as [number, number, number];
      expect(e, 'easy < medium').toBeLessThan(m);
      expect(m, 'medium < hard').toBeLessThan(h);
      expect(h).toBeGreaterThan(e * 1.4);
    }
  });
  it('a slow searcher beats Easy far more often than Hard', () => {
    const [e, m, h] = DIFFICULTIES.map((d) => winRate(share(d, SEARCHERS.slow))) as [
      number,
      number,
      number,
    ];
    expect(e).toBeGreaterThanOrEqual(m);
    expect(m).toBeGreaterThanOrEqual(h);
    expect(e - h).toBeGreaterThan(0.2);
  });
  it('a quick searcher still wins Easy comfortably', () => {
    expect(winRate(share('easy', SEARCHERS.quick))).toBe(1);
  });
});
