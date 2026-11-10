import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import type { KickOutcome, Zone } from '../physics';
import {
  applyKick,
  createShootout,
  curveClass,
  isOver,
  isSudden,
  launch,
  other,
  saves,
  settle,
  slotsOf,
  suddenRounds,
  sweetGoals,
  type KickRecord,
  type Shootout,
} from './shootout';
import type { Side } from './config';

const rec = (outcome: KickOutcome, over: Partial<KickRecord> = {}): KickRecord => ({
  side: 0,
  outcome,
  impact: outcome === 'goal' ? 'in' : 'wide',
  zone: 'ul',
  power: 3,
  curve: 0,
  dive: null,
  ...over,
});
const fresh = (first: Side = 0): Shootout =>
  createShootout({ seed: 1, teams: ['lanterns', 'sparks'], first });
/** play a script of outcomes for the sides in kicking order */
const play = (outs: KickOutcome[], first: Side = 0): Shootout =>
  outs.reduce((s, o) => applyKick(s, rec(o)), fresh(first));
const G: KickOutcome = 'goal';
const M: KickOutcome = 'saved';

describe('start of a shootout', () => {
  it('begins with the first kicker up, nothing scored, quota 5', () => {
    const s = fresh(1);
    expect(s).toMatchObject({
      turn: 1,
      first: 1,
      goals: [0, 0],
      taken: [0, 0],
      quota: 5,
      status: 'playing',
      winner: null,
    });
    expect(isOver(s)).toBe(false);
    expect(isSudden(s)).toBe(false);
  });

  it('the coin toss is seeded: same seed same first kicker, and both sides can come up', () => {
    const firsts = new Set<number>();
    for (let seed = 1; seed < 40; seed++) {
      const a = createShootout({ seed, teams: ['lanterns', 'bells'] });
      const b = createShootout({ seed, teams: ['lanterns', 'bells'] });
      expect(a).toEqual(b);
      firsts.add(a.first);
      expect(a.turn).toBe(a.first);
    }
    expect(firsts.size).toBe(2);
  });

  it('is serialisable: a JSON round trip changes nothing', () => {
    const s = play([G, M, G, G, M]);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('turn order', () => {
  it('alternates, starting with the first kicker', () => {
    for (const first of [0, 1] as Side[]) {
      let s = fresh(first);
      const order: Side[] = [];
      for (let i = 0; i < 6; i++) {
        order.push(s.turn);
        s = applyKick(s, rec(i % 2 ? G : M));
      }
      expect(order).toEqual([first, other(first), first, other(first), first, other(first)]);
    }
  });

  it('records the kicker from the turn, not from the record passed in', () => {
    const s = applyKick(fresh(1), rec(G, { side: 0 }));
    expect(s.kicks[0]!.side).toBe(1);
    expect(s.goals).toEqual([0, 1]);
  });
});

describe('early end (standard rules), both sides', () => {
  it('the first kicker wins early: 3-0 after three kicks each', () => {
    // A G, B M, A G, B M, A G, B M -> A leads 3-0 and B has 2 left: over after B's third kick
    const s = play([G, M, G, M, G, M]);
    expect(s).toMatchObject({ status: 'over', winner: 0, early: true, taken: [3, 3] });
  });

  it('is not over while the trailing side can still draw level', () => {
    const s = play([G, M, G, M, G]);
    expect(s.status).toBe('playing'); // 3-0, B has 3 left after 2 kicks: 3 > 0 + 3 is false
  });

  it('the second kicker wins early: it scores everything while the first misses', () => {
    const s = play([M, G, M, G, M, G]);
    expect(s).toMatchObject({ status: 'over', winner: 1, early: true });
    expect(s.taken).toEqual([3, 3]);
  });

  it('works the same when the human is second (first = 1)', () => {
    const s = play([M, G, M, G, M, G], 1);
    expect(s).toMatchObject({ status: 'over', winner: 0, early: true });
  });

  it('the first kicker can lose early with kicks to spare: 0-2 after 2, then 0-3 after 3', () => {
    // A M, B G, A M, B G, A M -> A 0, B 2, A has 2 left... B 2 > 0 + 2 is false; continue
    let s = play([M, G, M, G, M]);
    expect(s.status).toBe('playing');
    s = applyKick(s, rec(G)); // B scores a third: 3 > 0 + 2 -> over
    expect(s).toMatchObject({ status: 'over', winner: 1, early: true });
  });

  it('a side that leads after its own kick can end it before the other kicks (4 kicks, 4-0 after A 4, B 3)', () => {
    // A G B M A G B M A G B M A G -> A 4, B 0 with B 2 left?? B has taken 3: rem 2, 4 > 2
    const s = play([G, M, G, M, G, M]);
    expect(s.status).toBe('over'); // already over after B's third kick, so the fourth never happens
    expect(applyKick(s, rec(G))).toBe(s);
  });

  it('a full 5-5 shootout needs no early end: 3-2 after five each is decided on the last kick', () => {
    const s = play([G, G, G, G, M, M, M, M, G, M]);
    expect(s.taken).toEqual([5, 5]);
    expect(s).toMatchObject({ status: 'over', winner: 0, early: false, goals: [3, 2] });
  });

  it('never ends early while both sides can still reach each other (property, 2000 random shootouts)', () => {
    const rng = createRng(2024);
    for (let n = 0; n < 2000; n++) {
      let s = fresh(rng.chance(0.5) ? 0 : 1);
      const p = [rng.range(0.2, 0.95), rng.range(0.2, 0.95)];
      let guard = 0;
      while (s.status === 'playing' && guard++ < 300) {
        const before = s;
        s = applyKick(s, rec(rng.chance(p[s.turn]!) ? G : M));
        // invariants after every kick
        expect(Math.abs(s.taken[0] - s.taken[1])).toBeLessThanOrEqual(1);
        expect(s.taken[0]).toBeLessThanOrEqual(s.quota);
        expect(s.taken[1]).toBeLessThanOrEqual(s.quota);
        expect(s.goals[0] + s.goals[1]).toBe(s.kicks.filter((k) => k.outcome === 'goal').length);
        if (s.status === 'playing') {
          // not decided: each side can still catch up
          const rem = [s.quota - s.taken[0], s.quota - s.taken[1]];
          expect(s.goals[0] > s.goals[1] + rem[1]!).toBe(false);
          expect(s.goals[1] > s.goals[0] + rem[0]!).toBe(false);
          expect(s.turn).toBe(s.taken[0] === s.taken[1] ? s.first : other(s.first));
        }
        void before;
      }
      expect(s.status).toBe('over');
      expect(s.winner === 0 || s.winner === 1).toBe(true);
      expect(s.goals[s.winner!]).toBeGreaterThan(s.goals[other(s.winner!)]);
      if (s.early) expect(s.taken[0] + s.taken[1]).toBeLessThan(2 * s.quota);
    }
  });
});

describe('sudden death', () => {
  const level5 = [G, G, M, M, G, G, M, M, G, G]; // 3-3 after five each (first = 0)

  it('a level score after five each each adds one kick each', () => {
    const s = play(level5);
    expect(s).toMatchObject({ status: 'playing', quota: 6, goals: [3, 3], turn: 0 });
    expect(isSudden(s)).toBe(true);
    expect(suddenRounds(s)).toBe(1);
  });

  it('one kick each: both score -> another round', () => {
    const s = play([...level5, G, G]);
    expect(s).toMatchObject({ status: 'playing', quota: 7, goals: [4, 4] });
    expect(suddenRounds(s)).toBe(2);
  });

  it('the first kicker scoring alone does not end it: the second still kicks', () => {
    const s = play([...level5, G]);
    expect(s).toMatchObject({ status: 'playing', turn: 1 });
  });

  it('first scores, second misses: the first kicker wins (not early: nobody had kicks left)', () => {
    const s = play([...level5, G, M]);
    expect(s).toMatchObject({ status: 'over', winner: 0, early: false });
  });

  it('first misses, second scores: the second kicker wins', () => {
    const s = play([...level5, M, G]);
    expect(s).toMatchObject({ status: 'over', winner: 1, early: false });
  });

  it('both miss: the round is level, so it goes on', () => {
    const s = play([...level5, M, M]);
    expect(s).toMatchObject({ status: 'playing', quota: 7 });
  });

  it('a chain of five sudden-death rounds ends on the sixth and the score line is right', () => {
    const chain: KickOutcome[] = [];
    for (let i = 0; i < 5; i++) chain.push(i % 2 ? G : M, i % 2 ? G : M);
    const s = play([...level5, ...chain, M, G]);
    expect(s).toMatchObject({ status: 'over', winner: 1, quota: 11 });
    expect(s.taken).toEqual([11, 11]);
  });

  it('works with the CPU kicking first', () => {
    const s = play([...level5, G, M], 1);
    expect(s).toMatchObject({ status: 'over', winner: 1 });
  });
});

describe('launch and settle (physics inside the state machine)', () => {
  it('launch advances the seeded RNG and is a pure function of the state', () => {
    const s = fresh(0);
    const a = launch(s, { aimX: 2, aimY: 1.5, power: 0.6, curve: 0 });
    const b = launch(s, { aimX: 2, aimY: 1.5, power: 0.6, curve: 0 });
    expect(a).toEqual(b);
    expect(a.state.rng).not.toBe(s.rng);
    expect(s.rng).toBe(createShootout({ seed: 1, teams: ['lanterns', 'sparks'], first: 0 }).rng);
  });

  it('settle records the zone, power, curve and dive and applies the outcome', () => {
    const s = fresh(0);
    const l = launch(s, { aimX: -3, aimY: 2, power: 0.6, curve: 0.9 });
    const r = settle(l.state, l.shot, { zone: 'dr', startT: -0.2 });
    expect(r.record).toMatchObject({ side: 0, power: 3, curve: 1, dive: 'dr' });
    expect(r.state.taken).toEqual([1, 0]);
    expect(r.state.kicks).toHaveLength(1);
    expect(['goal', 'saved', 'miss', 'post']).toContain(r.record.outcome);
    expect(r.state.goals[0]).toBe(r.record.outcome === 'goal' ? 1 : 0);
  });

  it('a keeper who guesses the right zone saves a soft central shot', () => {
    const l = launch(fresh(0), { aimX: 0, aimY: 0.55, power: 0.1, curve: 0 });
    const r = settle(l.state, l.shot, { zone: 'd', startT: 0 });
    expect(r.record.outcome).toBe('saved');
  });

  it('curveClass thresholds', () => {
    expect([
      curveClass(-1),
      curveClass(-0.24),
      curveClass(0),
      curveClass(0.25),
      curveClass(1),
    ]).toEqual([-1, 0, 0, 1, 1]);
  });
});

describe('scoreboard slots and counters', () => {
  it('marks results, the next kick and pending kicks', () => {
    let s = fresh(0);
    expect(slotsOf(s, 0)).toEqual(['next', 'pending', 'pending', 'pending', 'pending']);
    expect(slotsOf(s, 1)).toEqual(['pending', 'pending', 'pending', 'pending', 'pending']);
    s = applyKick(s, rec(G));
    expect(slotsOf(s, 0)).toEqual(['goal', 'pending', 'pending', 'pending', 'pending']);
    expect(slotsOf(s, 1)[0]).toBe('next');
    s = applyKick(s, rec('post'));
    s = applyKick(s, rec('miss'));
    expect(slotsOf(s, 0).slice(0, 2)).toEqual(['goal', 'miss']);
    expect(slotsOf(s, 1).slice(0, 1)).toEqual(['post']);
  });

  it('shows no next marker once the shootout is over', () => {
    const s = play([G, M, G, M, G, M]);
    expect(slotsOf(s, 0).includes('next')).toBe(false);
    expect(slotsOf(s, 1).includes('next')).toBe(false);
  });

  it('counts saves made by a side and sweet-spot goals', () => {
    let s = fresh(0);
    s = applyKick(s, rec('goal', { power: 3 }));
    s = applyKick(s, rec('saved'));
    s = applyKick(s, rec('goal', { power: 4 }));
    s = applyKick(s, rec('saved'));
    expect(saves(s, 0)).toBe(2); // side 0's keeper saved side 1's kicks
    expect(saves(s, 1)).toBe(0);
    expect(sweetGoals(s, 0)).toBe(1);
    expect(sweetGoals(s, 1)).toBe(0);
  });

  it('only ever shows the first five kicks of a side in the slots, even in sudden death', () => {
    const s = play([G, G, M, M, G, G, M, M, G, G, G, M]);
    expect(slotsOf(s, 0)).toHaveLength(5);
  });
});

describe('zone type sanity', () => {
  it('zone strings in records are the physics zones', () => {
    const z: Zone = 'ur';
    expect(rec('goal', { zone: z }).zone).toBe('ur');
  });
});
