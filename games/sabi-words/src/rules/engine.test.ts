import { describe, expect, it } from 'vitest';
import { COINS_PER_STAR, COINS_WIN, HINT_COST, LANES, PROFILES, WORD_PTS } from './config';
import {
  accuracy,
  coinsEarned,
  createRound,
  hintTarget,
  score,
  select,
  stars,
  tick,
  unfound,
  useHint,
  wordCells,
  type GameState,
} from './engine';
import { PACKS_ON_DISK } from './fixtures';
import { generatePuzzle } from './generator';
import { cellIndex } from './grid';

const make = (difficulty: 'easy' | 'medium' | 'hard' = 'easy', seed = 11): GameState => {
  const r = generatePuzzle({ pack: PACKS_ON_DISK[0]!, difficulty, seed });
  if (!r.ok) throw new Error('gen');
  return createRound(r.puzzle);
};
const ends = (s: GameState, i: number): [number, number] => {
  const c = wordCells(s, i);
  return [c[0]!, c[c.length - 1]!];
};
const solve = (s: GameState, leftFrac = 1): GameState => {
  let st = tick(s, s.durationMs * (1 - leftFrac));
  for (let i = 0; i < st.puzzle.words.length; i++) st = select(st, ...ends(st, i)).state;
  return st;
};

describe('round', () => {
  it('starts with the profile clock and nothing found', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const s = make(d);
      expect(s.timeLeftMs).toBe(PROFILES[d].durationMs);
      expect(s.status).toBe('playing');
      expect(s.found).toEqual([]);
    }
  });
  it('tick counts down, ignores non-positive steps, and loses at zero', () => {
    let s = make();
    expect(tick(s, 0)).toBe(s);
    s = tick(s, 1000);
    expect(s.timeLeftMs).toBe(s.durationMs - 1000);
    s = tick(s, s.durationMs);
    expect(s.timeLeftMs).toBe(0);
    expect(s.status).toBe('lost');
    expect(tick(s, 500)).toBe(s);
  });
});

describe('select', () => {
  it('finds a word in either direction and cycles the six lanes in finding order', () => {
    let s = make('hard');
    const order = [...unfound(s)].reverse();
    order.forEach((idx, k) => {
      const [a, b] = ends(s, idx);
      const r = select(s, k % 2 ? b : a, k % 2 ? a : b);
      expect(r.result).toBe('found');
      expect(r.word).toBe(idx);
      s = r.state;
      expect(s.found[k]!.lane).toBe((k % LANES) + 1);
    });
    expect(s.status).toBe('won');
    expect(s.found.map((f) => f.lane).slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 1]);
  });
  it('a repeat is harmless; a wrong swipe only counts; a non-line is invalid', () => {
    let s = make();
    const [a, b] = ends(s, 0);
    s = select(s, a, b).state;
    expect(select(s, a, b).result).toBe('repeat');
    expect(select(s, a, b).state).toBe(s);
    const n = s.puzzle.size;
    const w = select(s, cellIndex(n, 0, 0), cellIndex(n, 0, 2));
    if (w.result === 'wrong') expect(w.state.wrongs).toBe(1);
    expect(select(s, 0, 0).result).toBe('invalid');
    expect(select(s, cellIndex(n, 0, 0), cellIndex(n, 1, 2)).result).toBe('invalid');
  });
  it('a swipe over only part of a word is wrong', () => {
    const s = make();
    const c = wordCells(s, 0);
    const r = select(s, c[0]!, c[c.length - 2]!);
    expect(r.result).toBe('wrong');
  });
  it('nothing is accepted once the round is over', () => {
    const s = tick(make(), 1e9);
    expect(select(s, ...ends(s, 0)).result).toBe('closed');
  });
});

describe('hints', () => {
  it('cost 10 coins, ring the first letter of an unfound word and never the same word twice', () => {
    let s = make();
    expect(useHint(s, HINT_COST - 1).ok).toBe(false);
    const first = hintTarget(s)!;
    const h = useHint(s, 50);
    expect(h.ok).toBe(true);
    expect(h.cost).toBe(HINT_COST);
    expect(h.word).toBe(first);
    const w = s.puzzle.words[first]!;
    expect(h.cell).toBe(cellIndex(s.puzzle.size, w.r, w.c));
    s = h.state;
    expect(s.hintsUsed).toBe(1);
    expect(hintTarget(s)).not.toBe(first);
  });
  it('skips a found word and runs out when every word has a ring', () => {
    let s = make();
    const [a, b] = ends(s, hintTarget(s)!);
    s = select(s, a, b).state;
    expect(hintTarget(s)).not.toBeNull();
    while (hintTarget(s) !== null) s = useHint(s, 999).state;
    expect(useHint(s, 999).ok).toBe(false);
    expect(hintTarget(tick(s, 1e9))).toBeNull();
  });
});

describe('stars, score and coins', () => {
  it('3 stars at 50% left or more, 2 at 20%, else 1; none unless won', () => {
    expect(stars(solve(make(), 0.5))).toBe(3);
    expect(stars(solve(make(), 0.51))).toBe(3);
    expect(stars(solve(make(), 0.49))).toBe(2);
    expect(stars(solve(make(), 0.2))).toBe(2);
    expect(stars(solve(make(), 0.19))).toBe(1);
    expect(stars(solve(make(), 0.01))).toBe(1);
    expect(stars(make())).toBe(0);
  });
  it('score is 100 a word plus time points on a win only', () => {
    const w = solve(make('hard'), 0.5);
    expect(score(w)).toBe(10 * WORD_PTS + 150 * PROFILES.hard.timePts);
    const lost = tick(select(make(), ...ends(make(), 0)).state, 1e9);
    expect(score(lost)).toBe(WORD_PTS);
    const part = tick(select(make(), ...ends(make(), 0)).state, 1e9);
    expect(part.status).toBe('lost');
  });
  it('coins: a win pays by level and stars, a loss one per word, a running round nothing', () => {
    const w = solve(make('medium'), 0.6);
    expect(coinsEarned(w)).toBe(COINS_WIN.medium + 3 * COINS_PER_STAR);
    let l = make();
    l = select(l, ...ends(l, 0)).state;
    expect(coinsEarned(tick(l, 1e9))).toBe(1);
    expect(coinsEarned(l)).toBe(0);
  });
  it('accuracy is words over swipes', () => {
    let s = make();
    expect(accuracy(s)).toBe(0); // nothing swiped yet: no "100%" for a round with no swipes
    s = { ...select(s, ...ends(s, 0)).state, wrongs: 1 };
    expect(accuracy(s)).toBe(0.5);
  });
});
