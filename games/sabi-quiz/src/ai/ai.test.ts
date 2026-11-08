import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { validateQuizPack } from '@naija/core/content';
import { PACK, POOL, mkQ } from '../testkit';
import { MAX_OPTION_CHARS, MAX_QUESTION_CHARS, validateSabiPack } from '../content';
import { DIFFICULTIES, DUEL_TIME_MS, type Difficulty } from '../rules';
import {
  CONTESTANT_OF,
  PERSONAS,
  TUNING,
  buzzBrain,
  createContestant,
  knowChance,
  personaById,
} from './index';
import { AVERAGE_BOT, botFromTuning, playRound, simulate, type HumanBot } from './sim';

/** Rounds per measurement (the Definition of Done asks for 200 games; the duel claims use >= 1000). */
const ROUNDS = 1200;
const SE = (sd: number, n: number): number => sd / Math.sqrt(n);

describe('contestants', () => {
  it('Chidi is Easy, Dung Medium, Aisha Hard, each with a persona and a portrait', () => {
    expect(CONTESTANT_OF).toEqual({ easy: 'chidi', medium: 'dung', hard: 'aisha' });
    for (const d of DIFFICULTIES) {
      const c = createContestant({ seed: 1, difficulty: d });
      expect(c.id).toBe(CONTESTANT_OF[d]);
      expect(c.persona.avatar).toMatch(/svg/);
    }
    expect(PERSONAS.map((p) => p.id)).toEqual(['etim', 'chidi', 'dung', 'aisha']);
    expect(personaById('nobody').id).toBe('etim');
    expect(personaById('dung').id).toBe('dung');
  });

  it('accuracy matches the brief: about 55, 72 and 88 percent on the shipped questions', () => {
    const want: Record<Difficulty, number> = { easy: 0.55, medium: 0.72, hard: 0.88 };
    for (const d of DIFFICULTIES) {
      const brain = buzzBrain(TUNING[d]);
      const rng = createRng(12);
      let right = 0;
      const N = 6000;
      for (let i = 0; i < N; i++) {
        const q = POOL[i % POOL.length]!;
        if (brain.decide({ q, limitMs: DUEL_TIME_MS }, rng).choice === q.answer) right++;
      }
      // the pack is 40/40/20 easy/medium/hard, so the question-difficulty shifts cancel out
      expect(right / N).toBeGreaterThan(want[d] - 0.04);
      expect(right / N).toBeLessThan(want[d] + 0.04);
    }
  });

  it('buzz times stay in each persona range (hard questions take 10 percent longer) and before the clock ends', () => {
    for (const d of DIFFICULTIES) {
      const brain = buzzBrain(TUNING[d]);
      const rng = createRng(3);
      const [lo, hi] = TUNING[d].buzzMs;
      for (let i = 0; i < 1500; i++) {
        const q = POOL[i % POOL.length]!;
        const { atMs, choice } = brain.decide({ q, limitMs: DUEL_TIME_MS }, rng);
        const slow = q.difficulty === 'hard' ? 1.1 : 1;
        expect(atMs).toBeGreaterThanOrEqual(Math.round(lo * slow) - 1);
        expect(atMs).toBeLessThanOrEqual(Math.min(Math.round(hi * slow), DUEL_TIME_MS - 500));
        expect([0, 1, 2, 3]).toContain(choice);
      }
    }
    // Aisha is quick, Dung late, Chidi sloppy but earlier than Dung
    expect(TUNING.hard.buzzMs[1]).toBeLessThanOrEqual(TUNING.easy.buzzMs[0]);
    expect(TUNING.medium.buzzMs[0]).toBeGreaterThan(TUNING.easy.buzzMs[0]);
  });

  it('a wrong guess is never the right answer, and knowChance is clamped', () => {
    const rng = createRng(8);
    const q = mkQ('z', 1, 'hard');
    const miss = buzzBrain({
      accuracy: 0,
      buzzMs: [1000, 2000],
      adj: { easy: 0, medium: 0, hard: 0 },
    });
    let right = 0;
    for (let i = 0; i < 2000; i++)
      if (miss.decide({ q, limitMs: 15000 }, rng).choice === 1) right++;
    // only the 5 percent floor of knowing: a wrong guess is spread over the three wrong plates
    expect(right / 2000).toBeLessThan(0.09);
    expect(knowChance({ ...TUNING.hard, accuracy: 5 }, 'easy')).toBe(0.97);
    expect(knowChance({ ...TUNING.easy, accuracy: -5 }, 'hard')).toBe(0.05);
  });

  it('is seeded: the same seed buzzes the same way', () => {
    const q = POOL[3]!;
    const a = createContestant({ seed: 5, difficulty: 'hard' }).decide({ q, limitMs: 15000 });
    const b = createContestant({ seed: 5, difficulty: 'hard' }).decide({ q, limitMs: 15000 });
    expect(a).toEqual(b);
  });
});

describe('Quiz Duel: difficulty measurably raises the challenge', () => {
  const duel = (d: Difficulty, bot: HumanBot = AVERAGE_BOT) =>
    simulate({ pool: POOL, mode: 'duel', difficulty: d, rounds: ROUNDS, seed: 100, bot });

  it(`the contestant scores more at each step (Hard > Medium > Easy) over ${ROUNDS} rounds, by a clear margin`, () => {
    const [e, m, h] = [duel('easy'), duel('medium'), duel('hard')];
    expect(e.rounds).toBeGreaterThanOrEqual(1000);
    // per-round score spread is about 250: a gap of 60 points is > 5 standard errors at n = 1200
    expect(m.cpuScore - e.cpuScore).toBeGreaterThan(5 * SE(250, ROUNDS));
    expect(h.cpuScore - m.cpuScore).toBeGreaterThan(5 * SE(250, ROUNDS));
    expect(h.cpuScore).toBeGreaterThan(e.cpuScore * 1.6);
  });

  it('a fixed human-seat bot wins less often and scores less against the harder contestants', () => {
    const [e, m, h] = [duel('easy'), duel('medium'), duel('hard')];
    expect(e.humanWins).toBeGreaterThan(m.humanWins + 0.1);
    expect(m.humanWins).toBeGreaterThan(h.humanWins + 0.1);
    expect(e.humanWins).toBeGreaterThan(0.7);
    expect(h.humanWins).toBeLessThan(0.45);
    // the bot itself is unchanged: what changes is the gap to the rival
    expect(e.score - e.cpuScore).toBeGreaterThan(m.score - m.cpuScore);
    expect(m.score - m.cpuScore).toBeGreaterThan(h.score - h.cpuScore);
  });

  it('Hard (Aisha) beats Easy (Chidi) head to head, clearly', () => {
    const aishaAsSeat = botFromTuning(TUNING.hard);
    const vsChidi = simulate({
      pool: POOL,
      mode: 'duel',
      difficulty: 'easy',
      rounds: ROUNDS,
      seed: 7,
      bot: aishaAsSeat,
    });
    expect(vsChidi.humanWins).toBeGreaterThan(0.85);
    expect(vsChidi.score - vsChidi.cpuScore).toBeGreaterThan(300);
    const chidiAsSeat = botFromTuning(TUNING.easy);
    const vsAisha = simulate({
      pool: POOL,
      mode: 'duel',
      difficulty: 'hard',
      rounds: ROUNDS,
      seed: 7,
      bot: chidiAsSeat,
    });
    expect(vsAisha.humanWins).toBeLessThan(0.15);
  });

  it('a duel always ends: ten questions, CPU score never negative, no state left open', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playRound({ pool: POOL, mode: 'duel', difficulty: 'hard', seed });
      expect(s.phase).toBe('done');
      expect(s.history).toHaveLength(10);
      expect(s.cpu!.score).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Classic and Daily: difficulty raises the challenge for a fixed player', () => {
  /** knows what an average player knows, but thinks slowly: 6 to 16 s per answer */
  const SLOW: HumanBot = { accuracy: AVERAGE_BOT.accuracy, answerMs: [6000, 16000] };
  const classic = (d: Difficulty) =>
    simulate({ pool: POOL, mode: 'classic', difficulty: d, rounds: 500, seed: 31, bot: SLOW });

  it('fewer correct answers and more timeouts at each step (Easy > Medium > Hard)', () => {
    const [e, m, h] = [classic('easy'), classic('medium'), classic('hard')];
    expect(e.correct).toBeGreaterThan(m.correct + 0.5);
    expect(m.correct).toBeGreaterThan(h.correct + 0.5);
    expect(e.timeouts).toBeLessThan(0.2);
    expect(h.timeouts).toBeGreaterThan(m.timeouts + 0.5);
    expect(m.timeouts).toBeGreaterThan(e.timeouts);
  });

  it('the pass mark (6 of 10) is reached less often on harder settings', () => {
    const passRate = (d: Difficulty): number => {
      let pass = 0;
      for (let i = 0; i < 500; i++) {
        const s = playRound({
          pool: POOL,
          mode: 'classic',
          difficulty: d,
          seed: 31 + i * 7919,
          bot: SLOW,
        });
        if (s.correct >= 6) pass++;
      }
      return pass / 500;
    };
    const [e, m, h] = [passRate('easy'), passRate('medium'), passRate('hard')];
    expect(e).toBeGreaterThan(m + 0.1);
    expect(m).toBeGreaterThan(h + 0.1);
  });

  it('the daily plays the same for everyone whatever the difficulty chosen', () => {
    const a = playRound({ pool: POOL, mode: 'daily', difficulty: 'easy', seed: 9 });
    const b = playRound({ pool: POOL, mode: 'daily', difficulty: 'hard', seed: 9 });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.limitMs).toBe(b.limitMs);
  });
});

describe('pack validation', () => {
  const good = () => structuredClone(PACK);

  it('the shipped pack passes, including the text-length caps', () => {
    expect(validateSabiPack(good()).ok).toBe(true);
    expect(PACK.questions).toHaveLength(300);
  });

  it('rejects a pack with a malformed question, whatever is wrong with it', () => {
    const breakers: [string, (q: Record<string, unknown>) => void][] = [
      ['three options', (q) => (q.options = ['a', 'b', 'c'])],
      ['duplicate options', (q) => (q.options = ['a', 'a', 'c', 'd'])],
      ['answer out of range', (q) => (q.answer = 4)],
      ['answer not a number', (q) => (q.answer = 'A')],
      ['empty question', (q) => (q.q = '  ')],
      ['bad difficulty', (q) => (q.difficulty = 'impossible')],
      ['no source', (q) => delete q.source],
      ['reviewed not a boolean', (q) => (q.reviewed = 'no')],
      ['bad id', (q) => (q.id = 'Has Spaces')],
      ['question too long', (q) => (q.q = 'x'.repeat(MAX_QUESTION_CHARS + 1))],
      ['option too long', (q) => ((q.options as string[])[2] = 'y'.repeat(MAX_OPTION_CHARS + 1))],
    ];
    for (const [name, brk] of breakers) {
      const p = good();
      brk(p.questions[5] as unknown as Record<string, unknown>);
      const r = validateSabiPack(p);
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.errors.length, name).toBeGreaterThan(0);
    }
    expect(validateSabiPack(null).ok).toBe(false);
    expect(validateSabiPack({ ...good(), questions: [] }).ok).toBe(false);
    const dup = good();
    dup.questions[1] = { ...dup.questions[0]! };
    expect(validateQuizPack(dup).ok).toBe(false);
    expect(validateSabiPack(dup).ok).toBe(false);
  });

  it('unreviewed questions are valid: review is a release gate, not a runtime filter', () => {
    expect(PACK.questions.every((q) => q.reviewed === false)).toBe(true);
    expect(validateSabiPack(good()).ok).toBe(true);
  });
});
