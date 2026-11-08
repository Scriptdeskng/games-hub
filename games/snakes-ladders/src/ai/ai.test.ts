import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type BoardLayout, type Rules } from '../rules/config';
import {
  apply,
  createGame,
  isOver,
  legalActions,
  playerById,
  type Action,
  type GameState,
} from '../rules/engine';
import { DEFAULT_LAYOUT } from '../rules/layout';
import { resolveLanding } from '../rules/board';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { PERSONAS, createOpponents, pickPersonas } from './index';
import { createPlanner, createPlannerCache } from './planner';
import { headToHead, simulate, wilson } from './sim';

const GAMES = 2000;

const stateAt = (patch: Partial<GameState>, pos = 0, rules: Partial<Rules> = {}): GameState => {
  const s = createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpus: [{ id: 'c', name: 'C' }],
    rules,
  });
  return { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, pos } : p)), ...patch };
};

describe('planner (exact expected turns)', () => {
  it('terminal square is 0 and every other square needs at least one turn', () => {
    const p = createPlanner(DEFAULT_LAYOUT, DEFAULT_RULES);
    for (let k = 0; k < p.period; k++) {
      expect(p.turnsLeft(100, k, true)).toBe(0);
      for (let sq = 0; sq < 100; sq++) expect(p.turnsLeft(sq, k, false)).toBeGreaterThanOrEqual(1);
    }
    expect(p.period).toBe(5);
  });

  it('matches a Monte Carlo average of the plain game (no re-roll, no two-dice turns)', () => {
    const rules: Rules = { ...DEFAULT_RULES, reroll: false, choiceDice: false };
    const planner = createPlanner(DEFAULT_LAYOUT, rules);
    const rng = createRng(77);
    let total = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      let pos = 0;
      let turns = 0;
      while (pos < 100) {
        turns++;
        pos = resolveLanding(DEFAULT_LAYOUT, rules, pos, rng.int(1, 6)).to;
      }
      total += turns;
    }
    const exact = planner.turnsLeft(0, 0, false);
    expect(Math.abs(total / n - exact) / exact).toBeLessThan(0.02);
  });

  it('the power-ups can only help: more options never raise the expected turns', () => {
    const none = createPlanner(DEFAULT_LAYOUT, {
      ...DEFAULT_RULES,
      reroll: false,
      choiceDice: false,
    });
    const reroll = createPlanner(DEFAULT_LAYOUT, { ...DEFAULT_RULES, choiceDice: false });
    const both = createPlanner(DEFAULT_LAYOUT, DEFAULT_RULES);
    const a = none.turnsLeft(0, 0, true);
    const b = reroll.turnsLeft(0, 0, true);
    const c = both.turnsLeft(0, 0, true);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
    // a spent re-roll is never worth more than an unspent one
    for (let sq = 0; sq < 100; sq++) {
      expect(both.turnsLeft(sq, 0, true)).toBeLessThanOrEqual(both.turnsLeft(sq, 0, false) + 1e-6);
    }
  });

  it('keeps the die that lands on a ladder and re-rolls out of a long snake', () => {
    const p = createPlanner(DEFAULT_LAYOUT, DEFAULT_RULES);
    // from 4: a 4 reaches the okada ladder at 8 (to 36), a 3 is a plain square
    expect(p.pick(4, 4, false, [3, 4])).toBe(1);
    expect(p.pick(4, 4, false, [4, 3])).toBe(0);
    // from 93 a roll of 5 reaches the toll-gate queue at 98 (back to 78): worth spending the re-roll
    expect(p.shouldReroll(93, 0, 5)).toBe(true);
    // a roll that wins is never thrown away
    expect(p.shouldReroll(97, 0, 3)).toBe(false);
  });

  it('is solved once per layout and rules and then shared by the cache that solved it', () => {
    const cache = createPlannerCache();
    const rules = { ...DEFAULT_RULES, choiceEvery: 7 };
    const t0 = performance.now();
    const a = cache.get(DEFAULT_LAYOUT, rules);
    const solve = performance.now() - t0;
    const t1 = performance.now();
    const b = cache.get(DEFAULT_LAYOUT, rules);
    const again = performance.now() - t1;
    expect(b).toBe(a);
    expect(again).toBeLessThan(1);
    expect(cache.get(DEFAULT_LAYOUT, { ...rules, exactFinish: false })).not.toBe(a);
    expect(cache.size).toBe(2);
    cache.warm(DEFAULT_LAYOUT, rules);
    expect(cache.get(DEFAULT_LAYOUT, rules)).toBe(a);
    expect(cache.size).toBe(2);
    // Deterministic cost guard (a wall clock is useless here: v8 coverage instrumentation made
    // this solve ~20x slower, and coverage cannot be detected cleanly). The solve costs
    // sweeps * squares * choice-period operations, so bounding the sweeps catches a convergence
    // regression the same on every machine. Measured natively: a few ms.
    expect(a.sweeps).toBeGreaterThan(0);
    expect(a.sweeps).toBeLessThan(400); // measured: 221
    // Loose sanity ceiling only (~10x the coverage-run measurement); never the real guard.
    expect(solve).toBeLessThan(10000);
  });

  it('caches are instance-local: another cache (another game or app) never sees these tables', () => {
    const one = createPlannerCache();
    const two = createPlannerCache();
    const a = one.get(DEFAULT_LAYOUT, DEFAULT_RULES);
    expect(two.size).toBe(0);
    expect(two.get(DEFAULT_LAYOUT, DEFAULT_RULES)).not.toBe(a);
    expect(one.size).toBe(1);
  });

  it('evicts old entries instead of growing without bound', () => {
    const cache = createPlannerCache();
    for (let n = 2; n < 22; n++) cache.warm(DEFAULT_LAYOUT, { ...DEFAULT_RULES, choiceEvery: n });
    expect(cache.size).toBeLessThanOrEqual(16);
  });

  it('works for the other toggles too', () => {
    for (const exactFinish of [true, false]) {
      for (const choiceDice of [true, false]) {
        const p = createPlanner(DEFAULT_LAYOUT, { ...DEFAULT_RULES, exactFinish, choiceDice });
        expect(p.turnsLeft(0, 0, false)).toBeGreaterThan(5);
        expect(Number.isFinite(p.afterRoll(10, 0, false, 3))).toBe(true);
      }
    }
    // without exact finish it is quicker
    const a = createPlanner(DEFAULT_LAYOUT, { ...DEFAULT_RULES, exactFinish: true });
    const b = createPlanner(DEFAULT_LAYOUT, { ...DEFAULT_RULES, exactFinish: false });
    expect(b.turnsLeft(0, 0, true)).toBeLessThan(a.turnsLeft(0, 0, true));
  });

  it('a board with nothing on it gives the textbook answer', () => {
    const empty: BoardLayout = { size: 10, ladders: [], snakes: [] };
    const p = createPlanner(empty, {
      ...DEFAULT_RULES,
      exactFinish: false,
      reroll: false,
      choiceDice: false,
    });
    // 100 squares at 3.5 per turn, plus the overshoot at the end: about 29-30 turns
    expect(p.turnsLeft(0, 0, false)).toBeGreaterThan(28);
    expect(p.turnsLeft(0, 0, false)).toBeLessThan(31);
    expect(p.turnsLeft(99, 0, false)).toBe(1);
  });
});

describe('brains choose legal actions', () => {
  const brains = { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() };
  for (const [name, brain] of Object.entries(brains)) {
    it(`${name}: every decision across 100 whole games is legal`, () => {
      const rng = createRng(5);
      for (let seed = 1; seed <= 100; seed++) {
        let s = createGame({
          seed,
          human: { id: 'you', name: 'You' },
          cpus: [{ id: 'c', name: 'C' }],
          rules: {
            exactFinish: seed % 2 === 0,
            reroll: seed % 3 !== 0,
            choiceDice: seed % 5 !== 0,
          },
        });
        for (let n = 0; !isOver(s) && n < 5000; n++) {
          const a = brain.decide(s, rng);
          expect(legalActions(s)).toContainEqual(a);
          s = apply(s, a);
        }
        expect(isOver(s)).toBe(true);
      }
    });
  }

  it('Easy really is random: both dice and both reroll answers show up', () => {
    const rng = createRng(2);
    const pick = stateAt({ phase: 'pick', dice: [2, 5] });
    const decide = stateAt({ phase: 'decide', roll: 3 });
    const picks = new Set<number>();
    const rolls = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = easyBrain.decide(pick, rng) as { index: number };
      picks.add(p.index);
      rolls.add(easyBrain.decide(decide, rng).type);
    }
    expect([...picks].sort()).toEqual([0, 1]);
    expect([...rolls].sort()).toEqual(['accept', 'reroll']);
    expect(easyBrain.decide(stateAt({}), rng)).toEqual({ type: 'roll' });
    // never offers a re-roll that was already spent
    const spent = stateAt({ phase: 'decide', roll: 3 });
    spent.players[0]!.rerollLeft = false;
    for (let i = 0; i < 100; i++) expect(easyBrain.decide(spent, rng).type).toBe('accept');
  });

  it('Medium follows its rules of thumb most of the time, and slips now and then', () => {
    const rng = createRng(1);
    const rate = (s: GameState, want: Action): number => {
      let hit = 0;
      for (let i = 0; i < 1000; i++) {
        if (JSON.stringify(mediumBrain.decide(s, rng)) === JSON.stringify(want)) hit++;
      }
      return hit / 1000;
    };
    // on 40 a 4 lands on 44 (a pothole snake head): dodge it
    const snake = stateAt({ phase: 'decide', roll: 4 }, 40);
    expect(rate(snake, { type: 'reroll' })).toBeGreaterThan(0.75);
    expect(rate(snake, { type: 'reroll' })).toBeLessThan(0.95); // slips: not perfect
    const fine = stateAt({ phase: 'decide', roll: 2 }, 40);
    expect(rate(fine, { type: 'accept' })).toBeGreaterThan(0.85);
    // near the end an overshoot is worth a re-roll, unless it is already spent
    expect(rate(stateAt({ phase: 'decide', roll: 6 }, 96), { type: 'reroll' })).toBeGreaterThan(
      0.75,
    );
    const spent = stateAt({ phase: 'decide', roll: 6 }, 96);
    spent.players[0]!.rerollLeft = false;
    for (let i = 0; i < 100; i++) expect(mediumBrain.decide(spent, rng).type).not.toBe('reroll');
    // 4 from square 4 lands on the ladder at 8: keep that die
    expect(
      rate(stateAt({ phase: 'pick', dice: [3, 4] }, 4), { type: 'pick', index: 1 }),
    ).toBeGreaterThan(0.75);
    expect(
      rate(stateAt({ phase: 'pick', dice: [4, 3] }, 4), { type: 'pick', index: 0 }),
    ).toBeGreaterThan(0.75);
  });

  it('Hard knows when the re-roll is worth spending, and keeps it otherwise', () => {
    const hard = createHardBrain();
    const rng = createRng(1);
    const awful = stateAt({ phase: 'decide', roll: 5 }, 93);
    expect(hard.decide(awful, rng)).toEqual({ type: 'reroll' });
    const fine = stateAt({ phase: 'decide', roll: 2 }, 12);
    expect(hard.decide(fine, rng)).toEqual({ type: 'accept' });
    const pick = stateAt({ phase: 'pick', dice: [3, 4] }, 4);
    expect(hard.decide(pick, rng)).toEqual({ type: 'pick', index: 1 });
    expect(hard.decide(stateAt({}), rng)).toEqual({ type: 'roll' });
  });
});

describe('difficulty raises the challenge (seeded simulations)', () => {
  const hardEasy = headToHead('hard', 'easy', GAMES);
  const mediumEasy = headToHead('medium', 'easy', GAMES);
  const hardMedium = headToHead('hard', 'medium', GAMES);
  const easyEasy = headToHead('easy', 'easy', GAMES);

  it('the match setup is fair: Easy vs Easy is a coin flip', () => {
    expect(easyEasy.lo).toBeLessThan(0.5);
    expect(easyEasy.hi).toBeGreaterThan(0.5);
  });

  it(`Hard beats Easy in at least 55% of ${GAMES} games (Definition of Done), with the lower 95% bound above 50%`, () => {
    expect(hardEasy.rate).toBeGreaterThanOrEqual(0.55);
    expect(hardEasy.lo).toBeGreaterThan(0.5);
    // the lower bound of the confidence interval clears the DoD threshold too
    expect(hardEasy.lo).toBeGreaterThanOrEqual(0.55);
  });

  it('Medium beats Easy, and Hard beats Medium (each lower 95% bound above 50%)', () => {
    expect(mediumEasy.lo).toBeGreaterThan(0.5);
    expect(hardMedium.lo).toBeGreaterThan(0.5);
    expect(hardEasy.rate).toBeGreaterThan(mediumEasy.rate);
  });

  it('stronger CPUs finish in fewer turns', () => {
    const planners = createPlannerCache();
    const avg = (d: 'easy' | 'medium' | 'hard'): number => {
      let t = 0;
      for (let i = 0; i < 400; i++) t += simulate({ planners, seed: 500 + i, seats: [d, d] }).turns;
      return t / 400;
    };
    const [e, m, h] = [avg('easy'), avg('medium'), avg('hard')];
    expect(m).toBeLessThan(e);
    expect(h).toBeLessThan(m);
  });

  it('Hard still beats Easy with the other rule toggles', () => {
    for (const rules of [{ exactFinish: false }, { choiceDice: false }, { reroll: false }]) {
      const r = headToHead('hard', 'easy', 600, { rules, seed: 9000 });
      expect(r.rate, JSON.stringify(rules)).toBeGreaterThan(0.5);
    }
  });

  it('Wilson interval is sane', () => {
    const { lo, hi } = wilson(50, 100);
    expect(lo).toBeCloseTo(0.404, 2);
    expect(hi).toBeCloseTo(0.596, 2);
    expect(wilson(0, 50).lo).toBe(0);
  });
});

describe('opponents and personas', () => {
  it('picks distinct personas, the same ones for the same seed', () => {
    for (const n of [1, 2, 3]) {
      const a = pickPersonas(11, n);
      expect(a).toHaveLength(n);
      expect(new Set(a).size).toBe(n);
      expect(pickPersonas(11, n)).toEqual(a);
    }
    // one opponent is Tari or Efe (varies with the seed); Aisha only joins for three
    const seen = new Set(Array.from({ length: 40 }, (_, i) => pickPersonas(i, 1)[0]));
    expect([...seen].sort()).toEqual(['efe', 'tari']);
    // the third seat alternates with the stored game counter: Funmi, Aisha, Funmi, ...
    expect([0, 1, 2, 3].map((g) => pickPersonas(3, 3, g)[2])).toEqual([
      'funmi',
      'aisha',
      'funmi',
      'aisha',
    ]);
    expect(pickPersonas(3, 3, 5)).toEqual(pickPersonas(3, 3, 5)); // never random per round
    expect(pickPersonas(3, 2, 1)).toEqual(pickPersonas(3, 2, 0));
    expect(pickPersonas(3, 2)).not.toContain('aisha');
    expect(pickPersonas(3, 2)).not.toContain('funmi');
  });

  it('Funmi has the same thinking range and no money banter, Aisha and Funmi share the AI profile', () => {
    const a = PERSONAS.find((p) => p.id === 'aisha')!;
    const f = PERSONAS.find((p) => p.id === 'funmi')!;
    expect(f.think).toEqual(a.think);
    const cpus = createOpponents({
      seed: 2,
      difficulty: 'hard',
      seats: [
        { id: 'a', persona: 'aisha' },
        { id: 'f', persona: 'funmi' },
      ],
    });
    expect(cpus[0]!.profile).toBe(cpus[1]!.profile);
  });

  it('createOpponents builds one CPU per seat with a natural thinking delay', () => {
    const cpus = createOpponents({
      seed: 3,
      difficulty: 'hard',
      seats: [
        { id: 'a', persona: 'tari' },
        { id: 'b', persona: 'aisha' },
      ],
    });
    expect(cpus.map((c) => c.persona.id)).toEqual(['tari', 'aisha']);
    for (const c of cpus) {
      for (let i = 0; i < 50; i++) {
        const ms = c.thinkMs();
        expect(ms).toBeGreaterThanOrEqual(400);
        expect(ms).toBeLessThanOrEqual(1200);
      }
    }
    const s = stateAt({});
    expect(cpus[0]!.decide(s)).toEqual({ type: 'roll' });
  });

  it('the CPUs play a whole game through their own decisions', () => {
    const cpus = createOpponents({
      seed: 5,
      difficulty: 'medium',
      seats: [
        { id: 'you', persona: 'tari' },
        { id: 'c', persona: 'efe' },
      ],
    });
    let s = stateAt({});
    for (let n = 0; !isOver(s) && n < 5000; n++) {
      const cpu = cpus.find((c) => c.id === s.turns.seats[s.turns.index]!.id)!;
      s = apply(s, cpu.decide(s) as Action);
    }
    expect(s.winner).not.toBeNull();
    expect(playerById(s, s.winner as string).pos).toBe(100);
  });
});

describe('persona data', () => {
  it('every banter key exists in English and Pidgin', async () => {
    const en = (await import('../i18n/en.json')).default as Record<string, unknown>;
    const pcm = (await import('../i18n/pcm.json')).default as Record<string, unknown>;
    for (const p of PERSONAS) {
      expect(en[p.nameKey], p.nameKey).toBeDefined();
      expect(pcm[p.nameKey], p.nameKey).toBeDefined();
      for (const [event, keys] of Object.entries(p.banter)) {
        expect(keys!.length, `${p.id}.${event}`).toBeGreaterThan(0);
        for (const k of keys!) {
          expect(en[k], k).toBeDefined();
          expect(pcm[k], k).toBeDefined();
        }
      }
      expect(p.avatar).toMatch(/\.svg|^data:image\/svg/);
    }
  });
});
