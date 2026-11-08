import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { POOL, mkQ } from '../testkit';
import {
  DAILY_MIX,
  DIFFICULTIES,
  PROFILES,
  ROUND_LENGTH,
  accuracy,
  answer,
  answerCpu,
  canUse,
  createRound,
  current,
  duelOutcome,
  isOver,
  next,
  pickRound,
  stars,
  tick,
  total,
  useFifty,
  usePadi,
  useSkip,
  won,
  type Difficulty,
  type GameState,
  type Mode,
} from './index';

interface RoundArgs {
  mode?: Mode;
  difficulty?: Difficulty;
  seed?: number;
  categories?: string[];
}
const round = (o: RoundArgs = {}): GameState =>
  createRound({
    pool: POOL,
    mode: o.mode ?? 'classic',
    difficulty: o.difficulty ?? 'medium',
    seed: o.seed ?? 1,
    categories: o.categories,
  });

/** Answer the open question correctly after `ms` and move on. */
const ok = (s: GameState, ms = 0): GameState => next(answer(tick(s, ms), current(s).answer));
const bad = (s: GameState): GameState => next(answer(s, (current(s).answer + 1) % 4));

describe('createRound', () => {
  it('picks ten questions, an easy-to-hard ramp, plus spares', () => {
    const s = round();
    expect(s.questions).toHaveLength(ROUND_LENGTH);
    expect(total(s)).toBe(10);
    expect(s.spares.length).toBeGreaterThanOrEqual(1);
    const order = { easy: 0, medium: 1, hard: 2 } as const;
    const ranks = s.questions.map((q) => order[q.difficulty]);
    expect(ranks).toEqual([...ranks].sort());
    const ids = new Set([...s.questions, ...s.spares].map((q) => q.id));
    expect(ids.size).toBe(s.questions.length + s.spares.length);
  });

  it('follows the difficulty profile: timer and question mix', () => {
    for (const d of DIFFICULTIES) {
      const s = round({ difficulty: d });
      expect(s.limitMs).toBe(PROFILES[d].timeMs);
      for (const qd of DIFFICULTIES) {
        expect(s.questions.filter((q) => q.difficulty === qd)).toHaveLength(PROFILES[d].mix[qd]);
      }
      expect(Object.values(PROFILES[d].mix).reduce((a, b) => a + b, 0)).toBe(ROUND_LENGTH);
    }
    expect(PROFILES.easy.timeMs).toBe(20000);
    expect(PROFILES.medium.timeMs).toBe(15000);
    expect(PROFILES.hard.timeMs).toBe(10000);
  });

  it('is deterministic for a seed and different for another', () => {
    const ids = (s: GameState): string[] => s.questions.map((q) => q.id);
    expect(ids(round({ seed: 5 }))).toEqual(ids(round({ seed: 5 })));
    expect(ids(round({ seed: 5 }))).not.toEqual(ids(round({ seed: 6 })));
  });

  it('filters by category', () => {
    const s = round({ categories: ['football'] });
    expect(s.questions.every((q) => q.category === 'football')).toBe(true);
    expect(s.spares.every((q) => q.category === 'football')).toBe(true);
    const two = round({ categories: ['food', 'pidgin'] });
    expect(new Set(two.questions.map((q) => q.category))).toEqual(new Set(['food', 'pidgin']));
  });

  it('daily mode ignores the difficulty setting and the category filter', () => {
    const s = createRound({
      pool: POOL,
      mode: 'daily',
      difficulty: 'hard',
      seed: 3,
      categories: ['food'],
    });
    expect(s.difficulty).toBe('medium');
    expect(s.limitMs).toBe(15000);
    for (const qd of DIFFICULTIES) {
      expect(s.questions.filter((q) => q.difficulty === qd)).toHaveLength(DAILY_MIX[qd]);
    }
    expect(new Set(s.questions.map((q) => q.category)).size).toBeGreaterThan(1);
  });

  it('duel uses the Medium mix whatever the contestant, and a 15 s clock', () => {
    const s = round({ mode: 'duel', difficulty: 'hard' });
    expect(s.limitMs).toBe(15000);
    expect(s.cpu).not.toBeNull();
    expect(s.questions.filter((q) => q.difficulty === 'hard')).toHaveLength(
      PROFILES.medium.mix.hard,
    );
  });

  it('starts done for an empty pool and is JSON-serialisable', () => {
    const empty = createRound({ pool: [], mode: 'classic', difficulty: 'easy', seed: 1 });
    expect(isOver(empty)).toBe(true);
    const s = round();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('pickRound copes with a small pool', () => {
    const small = [mkQ('a', 0), mkQ('b', 1), mkQ('c', 2)];
    const r = pickRound(small, createRng(1), { mix: PROFILES.easy.mix });
    expect(r.questions).toHaveLength(3);
    expect(r.spares).toHaveLength(0);
  });
});

describe('answering and scoring', () => {
  it('a correct answer scores base + speed, wrong scores nothing', () => {
    let s = round({ difficulty: 'easy' });
    const q = current(s);
    const base = { easy: 100, medium: 150, hard: 200 }[q.difficulty];
    s = answer(s, q.answer);
    expect(s.phase).toBe('reveal');
    expect(s.lastResult).toBe('correct');
    expect(s.score).toBe(base + 50); // instant: full speed bonus, no streak yet, scale 100
    const r = round();
    const w = answer(r, (current(r).answer + 1) % 4);
    expect(w.lastResult).toBe('wrong');
    expect(w.score).toBe(0);
    expect(w.wrong).toBe(1);
  });

  it('a faster answer scores more than a slower one', () => {
    const s = round();
    const fast = answer(tick(s, 1000), current(s).answer).score;
    const slow = answer(tick(s, 12000), current(s).answer).score;
    expect(fast).toBeGreaterThan(slow);
  });

  it('ignores an answer outside 0..3, a repeat, and one after the reveal', () => {
    const s = round();
    expect(answer(s, 4)).toBe(s);
    expect(answer(s, -1)).toBe(s);
    expect(answer(s, 1.5)).toBe(s);
    const a = answer(s, current(s).answer);
    expect(answer(a, 0)).toBe(a);
    expect(tick(a, 1000)).toBe(a);
  });

  it('streak multiplier: x1, x1, x2 at three, x3 at five, x5 at eight; a miss resets it', () => {
    let s = createRound({ pool: POOL, mode: 'classic', difficulty: 'easy', seed: 9 });
    const mults: number[] = [];
    for (let i = 0; i < 9; i++) {
      const q = current(s);
      const base = { easy: 100, medium: 150, hard: 200 }[q.difficulty] + 50;
      const before = s.score;
      s = answer(s, q.answer);
      mults.push((s.score - before) / base);
      s = next(s);
    }
    expect(mults).toEqual([1, 1, 2, 2, 3, 3, 3, 5, 5]);
    expect(s.streak).toBe(9);
    expect(s.bestStreak).toBe(9);
    s = bad(s);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(9);
  });

  it('timer expiry closes the question as a timeout, breaks the streak, scores nothing', () => {
    let s = round();
    s = ok(s);
    s = ok(s);
    expect(s.streak).toBe(2);
    s = tick(s, 14999);
    expect(s.phase).toBe('asking');
    expect(s.timeLeftMs).toBe(1);
    s = tick(s, 5);
    expect(s.phase).toBe('reveal');
    expect(s.lastResult).toBe('timeout');
    expect(s.timeouts).toBe(1);
    expect(s.streak).toBe(0);
    expect(s.timeLeftMs).toBe(0);
    expect(s.history[2]).toMatchObject({ result: 'timeout', picked: null, points: 0 });
    expect(accuracy(s)).toBeCloseTo(2 / 3);
  });

  it('tick ignores non-positive steps', () => {
    const s = round();
    expect(tick(s, 0)).toBe(s);
    expect(tick(s, -5)).toBe(s);
  });

  it('the difficulty setting scales the points', () => {
    const score = (d: Difficulty): number => {
      const s = createRound({ pool: POOL, mode: 'classic', difficulty: d, seed: 2 });
      return answer(s, current(s).answer).score;
    };
    expect(PROFILES.hard.scalePct).toBeGreaterThan(PROFILES.easy.scalePct);
    expect(score('hard')).toBeGreaterThan(0);
    expect(score('easy')).toBeGreaterThan(0);
  });

  it('next() walks all ten questions and then finishes; won, stars and accuracy follow', () => {
    let s = round();
    for (let i = 0; i < 10; i++) {
      expect(s.index).toBe(i);
      expect(next(s)).toBe(s); // not in the reveal phase yet
      s = ok(s);
    }
    expect(isOver(s)).toBe(true);
    expect(s.correct).toBe(10);
    expect(won(s)).toBe(true);
    expect(stars(s)).toBe(3);
    expect(accuracy(s)).toBe(1);
    expect(tick(s, 100)).toBe(s);
    expect(next(s)).toBe(s);
  });

  it('pass mark and stars: 5 correct is not a win, 6 one star, 8 two, 9 three', () => {
    const play = (right: number): GameState => {
      let s = round({ seed: 4 });
      for (let i = 0; i < 10; i++) s = i < right ? ok(s) : bad(s);
      return s;
    };
    expect(
      [5, 6, 8, 9].map((n) => {
        const s = play(n);
        return [won(s), stars(s)];
      }),
    ).toEqual([
      [false, 0],
      [true, 1],
      [true, 2],
      [true, 3],
    ]);
  });

  it('accuracy is 0 before any answer', () => {
    expect(accuracy(round())).toBe(0);
  });
});

describe('lifelines', () => {
  it('50/50 removes exactly two wrong options and never the right answer (every question)', () => {
    let checked = 0;
    for (const q of POOL) {
      for (const seed of [1, 2, 3]) {
        const pool = [q, ...POOL.filter((x) => x.id !== q.id).slice(0, 20)];
        const s0 = createRound({ pool, mode: 'classic', difficulty: 'easy', seed });
        // put the question under test in front, whatever the ramp chose
        const s = useFifty({ ...s0, questions: [q, ...s0.questions.slice(1)] });
        expect(s.eliminated).toHaveLength(2);
        expect(s.eliminated).not.toContain(q.answer);
        expect(new Set(s.eliminated).size).toBe(2);
        checked++;
      }
    }
    expect(checked).toBe(POOL.length * 3);
  });

  it('50/50 is usable once, the removed plates cannot be picked, the right one still can', () => {
    const s = useFifty(round());
    expect(s.used.fifty).toBe(true);
    expect(canUse(s, 'fifty')).toBe(false);
    expect(useFifty(s)).toBe(s);
    expect(answer(s, s.eliminated[0] as number)).toBe(s);
    expect(answer(s, current(s).answer).lastResult).toBe('correct');
  });

  it('eliminations reset on the next question', () => {
    let s = useFifty(round());
    s = ok(s);
    expect(s.eliminated).toEqual([]);
    expect(s.used.fifty).toBe(true);
  });

  it('skip swaps in a spare of the same difficulty, restarts the clock, keeps the streak, scores nothing', () => {
    let s = round({ seed: 8 });
    s = ok(s);
    s = ok(s);
    s = tick(s, 7000);
    const before = current(s);
    const sparesBefore = s.spares.length;
    const skipped = useSkip(s);
    expect(skipped.used.skip).toBe(true);
    expect(skipped.skips).toBe(1);
    expect(current(skipped).id).not.toBe(before.id);
    expect(current(skipped).difficulty).toBe(before.difficulty);
    expect(skipped.spares).toHaveLength(sparesBefore - 1);
    expect(skipped.timeLeftMs).toBe(skipped.limitMs);
    expect(skipped.streak).toBe(2);
    expect(skipped.score).toBe(s.score);
    expect(skipped.index).toBe(s.index);
    expect(skipped.history).toHaveLength(2); // a skip is not an answer
    expect(skipped.questions).toHaveLength(10);
    expect(skipped.questions.filter((q) => q.id === before.id)).toHaveLength(0);
    expect(useSkip(skipped)).toBe(skipped);
    expect(answer(skipped, current(skipped).answer).lastResult).toBe('correct');
  });

  it('skip clears an earlier 50/50 and falls back to any spare when none match', () => {
    const s0 = createRound({ pool: POOL, mode: 'classic', difficulty: 'easy', seed: 1 });
    const prepared: GameState = {
      ...s0,
      questions: [mkQ('x', 0, 'easy'), ...s0.questions.slice(1)],
      spares: [mkQ('y', 0, 'hard')],
    };
    const s = useSkip(useFifty(prepared));
    expect(current(s).id).toBe('y');
    expect(s.eliminated).toEqual([]);
    expect(s.poll).toBeNull();
  });

  it('skip is unavailable with no spares', () => {
    const s = { ...round(), spares: [] };
    expect(canUse(s, 'skip')).toBe(false);
    expect(useSkip(s)).toBe(s);
  });

  it('ask your padi gives a poll once; the percentages add up and respect 50/50', () => {
    const s0 = useFifty(round({ seed: 11 }));
    const s = usePadi(s0);
    expect(s.used.padi).toBe(true);
    expect(s.poll).toHaveLength(4);
    expect(s.poll!.reduce((a, b) => a + b, 0)).toBe(100);
    for (const e of s.eliminated) expect(s.poll![e]).toBe(0);
    expect(usePadi(s)).toBe(s);
    expect(s.rng).not.toBe(s0.rng);
  });

  it('lifelines are closed after the pick, in a duel and on a finished round', () => {
    const picked = answer(round(), 0);
    const duel = round({ mode: 'duel' });
    for (const id of ['fifty', 'skip', 'padi'] as const) {
      expect(canUse(picked, id)).toBe(false);
      expect(canUse(duel, id)).toBe(false);
    }
    expect(useFifty(picked)).toBe(picked);
    expect(usePadi(picked)).toBe(picked);
    expect(useSkip(picked)).toBe(picked);
  });

  it('the three lifelines can each be used once in the same round, in any order', () => {
    let s = round({ seed: 21 });
    s = useSkip(s);
    s = ok(s);
    s = usePadi(s);
    s = ok(s);
    s = useFifty(s);
    expect(s.used).toEqual({ fifty: true, skip: true, padi: true });
  });

  it('every lifeline use is reproducible from the seed', () => {
    const run = (): GameState => usePadi(useFifty(useSkip(round({ seed: 33 }))));
    expect(run()).toEqual(run());
  });
});

describe('duel', () => {
  const duel = (seed = 1): GameState => round({ mode: 'duel', difficulty: 'medium', seed });

  it('stays open after the human answers until the CPU answers, then closes', () => {
    let s = duel();
    const q = current(s);
    s = tick(s, 4000);
    s = answer(s, q.answer);
    expect(s.phase).toBe('asking');
    expect(s.picked).toBe(q.answer);
    expect(answer(s, 0)).toBe(s); // locked in
    s = tick(s, 3000);
    s = answerCpu(s, q.answer);
    expect(s.phase).toBe('reveal');
    expect(s.lastResult).toBe('correct');
  });

  it('closes at once when the human answers after the CPU', () => {
    let s = duel();
    const q = current(s);
    s = tick(s, 3000);
    s = answerCpu(s, (q.answer + 1) % 4);
    expect(s.phase).toBe('asking');
    s = tick(s, 2000);
    s = answer(s, q.answer);
    expect(s.phase).toBe('reveal');
    expect(s.score).toBeGreaterThan(0);
    expect(s.cpu!.score).toBe(0);
  });

  it('the faster correct answer scores more', () => {
    const q = current(duel());
    const finish = (humanAt: number, cpuAt: number): GameState => {
      let s = duel();
      const events: [number, 'me' | 'cpu'][] = [
        [humanAt, 'me'],
        [cpuAt, 'cpu'],
      ];
      events.sort((a, b) => a[0] - b[0]);
      let t = 0;
      for (const [at, who] of events) {
        s = tick(s, at - t);
        t = at;
        s = who === 'me' ? answer(s, q.answer) : answerCpu(s, q.answer);
      }
      return s;
    };
    const humanFirst = finish(2000, 6000);
    expect(humanFirst.score).toBeGreaterThan(humanFirst.cpu!.score);
    const cpuFirst = finish(6000, 2000);
    expect(cpuFirst.cpu!.score).toBeGreaterThan(cpuFirst.score);
    expect(duelOutcome({ ...humanFirst, phase: 'done' })).toBe('win');
    expect(duelOutcome({ ...cpuFirst, phase: 'done' })).toBe('lose');
    // 15 s clock: answering at 2 s scores 100 + 100 * 13/15 = 187
    expect(humanFirst.score).toBe(187);
  });

  it('time up closes the question: an unanswered seat scores nothing, the answered one keeps its points', () => {
    let s = duel();
    const q = current(s);
    s = tick(s, 5000);
    s = answerCpu(s, q.answer);
    s = tick(s, 20000);
    expect(s.phase).toBe('reveal');
    expect(s.lastResult).toBe('timeout');
    expect(s.score).toBe(0);
    expect(s.cpu!.score).toBeGreaterThan(0);
    expect(s.cpu!.lastPoints).toBe(s.cpu!.score);
  });

  it('a wrong human answer scores nothing and the next question resets the CPU seat', () => {
    let s = duel();
    const q = current(s);
    s = answerCpu(s, q.answer);
    s = answer(s, (q.answer + 1) % 4);
    expect(s.score).toBe(0);
    expect(s.wrong).toBe(1);
    s = next(s);
    expect(s.cpu).toMatchObject({ picked: null, leftMs: null, lastPoints: 0 });
    expect(s.cpu!.score).toBeGreaterThan(0);
  });

  it('answerCpu is ignored outside a duel, twice, or with a bad choice', () => {
    const c = round();
    expect(answerCpu(c, 0)).toBe(c);
    const s = duel();
    const a = answerCpu(s, 1);
    expect(answerCpu(a, 2)).toBe(a);
    expect(answerCpu(s, 9)).toBe(s);
    const reveal = { ...s, phase: 'reveal' as const };
    expect(answerCpu(reveal, 1)).toBe(reveal);
  });

  it('a level score is a draw; won() is true only for a win', () => {
    const base = duel();
    const s = { ...base, score: 100, cpu: { ...base.cpu!, score: 100 } };
    expect(duelOutcome(s)).toBe('draw');
    expect(won(s)).toBe(false);
    expect(won({ ...s, score: 101 })).toBe(true);
    expect(stars(s)).toBe(0);
    expect(duelOutcome({ ...s, cpu: null, score: 0 })).toBe('draw');
  });
});
