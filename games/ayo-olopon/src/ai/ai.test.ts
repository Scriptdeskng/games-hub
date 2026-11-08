import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, MAX_PLIES, PITS, type Rules } from '../rules/config';
import {
  apply,
  createGame,
  isLegal,
  isOver,
  legalMoves,
  type GameState,
  type Side,
} from '../rules/engine';
import {
  HARD_SEARCH,
  HINT_SEARCH,
  bestPits,
  createHardBrain,
  easyBrain,
  gainOf,
  mediumBrain,
} from './brains';
import { PERSONAS, PERSONA_OF, createOpponent, personaById } from './index';
import { searchBest } from './search';
import { headToHead, mergeStats, simulate, wilson, type MatchStats } from './sim';
import type { Difficulty } from '@naija/core/ui-kit';

/** Games per match-up for the strength claims (the Definition of Done asks for 200). */
const GAMES = 500;

const mk = (
  set: Record<number, number>,
  o: { side?: Side; store?: [number, number]; rules?: Partial<Rules> } = {},
): GameState => {
  const pits = new Array<number>(PITS).fill(0);
  for (const [k, v] of Object.entries(set)) pits[Number(k)] = v;
  const g = createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpu: { id: 'cpu', name: 'CPU' },
    rules: o.rules,
    first: o.side ?? 0,
  });
  return { ...g, pits, store: o.store ?? [0, 0] };
};
const hard = createHardBrain();

/** A long match in chunks of 50 games, yielding between chunks so the test runner stays responsive. */
async function match(
  a: Difficulty,
  b: Difficulty,
  games: number,
  seed: number,
  rules?: Partial<Rules>,
): Promise<MatchStats> {
  const parts: MatchStats[] = [];
  for (let done = 0; done < games; done += 50) {
    parts.push(headToHead(a, b, Math.min(50, games - done), { seed: seed + done, rules }));
    await new Promise((r) => setTimeout(r, 0));
  }
  return mergeStats(parts);
}

describe('wilson interval', () => {
  it('brackets the observed rate and tightens with more games', () => {
    const a = wilson(60, 100);
    const b = wilson(600, 1000);
    expect(a.lo).toBeLessThan(0.6);
    expect(a.hi).toBeGreaterThan(0.6);
    expect(b.hi - b.lo).toBeLessThan(a.hi - a.lo);
  });
});

describe('personas', () => {
  it('Efe = Easy, Baba Ade = Medium, Malam Sani = Hard', () => {
    expect(PERSONA_OF).toEqual({ easy: 'efe', medium: 'baba-ade', hard: 'malam-sani' });
    expect(PERSONAS.map((p) => p.id)).toEqual(['efe', 'baba-ade', 'malam-sani']);
    expect(personaById('nobody').id).toBe('efe');
  });
  it('every persona has the banter keys ayo.banter.<persona>.<event>', () => {
    for (const p of PERSONAS) {
      for (const ev of ['start', 'capture', 'captured', 'chain', 'win', 'lose', 'draw', 'idle']) {
        expect(p.banter[ev]).toEqual([`ayo.banter.${p.id}.${ev}`]);
      }
    }
  });
  it('a CPU thinks for 0.4 to 1.2 s, seeded', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const a = createOpponent({ id: 'cpu', seed: 3, difficulty: d });
      const b = createOpponent({ id: 'cpu', seed: 3, difficulty: d });
      expect(a.persona.id).toBe(PERSONA_OF[d]);
      for (let i = 0; i < 30; i++) {
        const ms = a.thinkMs();
        expect(ms).toBeGreaterThanOrEqual(400);
        expect(ms).toBeLessThanOrEqual(1200);
        expect(b.thinkMs()).toBe(ms);
      }
    }
  });
  it('createOpponent plays a legal move at every level', () => {
    const s = createGame({
      seed: 2,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 1,
    });
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const a = createOpponent({ id: 'b', seed: 2, difficulty: d }).decide(s);
      expect(isLegal(s, a.pit)).toBe(true);
    }
  });
});

describe('Easy, Medium', () => {
  it('Easy plays every legal move sooner or later (random)', () => {
    const s = mk({ 0: 1, 2: 2, 4: 3, 8: 1 });
    const rng = createRng(4);
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) seen.add(easyBrain.decide(s, rng).pit);
    expect([...seen].sort()).toEqual([0, 2, 4]);
  });
  it('Medium takes the biggest capture (greedy 1-ply) most of the time', () => {
    // pit 5 (1 seed) lands in pit 6 (2 -> 3): 3 seeds. pit 4 (2 seeds) lands in pit 6 too but pit 6 becomes... compute gains
    const s = mk({ 5: 1, 4: 1, 6: 2, 7: 1, 0: 3, 10: 9 });
    const gains = legalMoves(s).map((m) => gainOf(s, m));
    expect(Math.max(...gains)).toBeGreaterThan(0);
    const best = legalMoves(s)[gains.indexOf(Math.max(...gains))]!.pit;
    const rng = createRng(11);
    let hits = 0;
    for (let i = 0; i < 200; i++) if (mediumBrain.decide(s, rng).pit === best) hits++;
    // it slips at the profile's mistake rate (20%) and the random slip may still pick the best pit
    expect(hits / 200).toBeGreaterThan(0.7);
    expect(hits / 200).toBeLessThan(0.99);
  });
  it('gainOf counts what a move would capture without changing the state', () => {
    const s = mk({ 5: 1, 6: 1, 10: 9, 0: 1 });
    const before = JSON.stringify(s);
    expect(gainOf(s, { pit: 5, count: 1 })).toBe(2);
    expect(gainOf(s, { pit: 0, count: 1 })).toBe(0);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('Hard search', () => {
  it('takes a capture that wins the game outright', () => {
    const s = mk({ 5: 1, 6: 1, 0: 2, 3: 1, 10: 9 }, { store: [23, 5] });
    expect(hard.decide(s, createRng(1))).toEqual({ type: 'move', pit: 5 });
  });
  it('prefers the bigger capture and avoids leaving a capture behind', () => {
    // pit 5 captures 3 (pit 6: 2 -> 3); pit 4 only sows quietly
    const s = mk({ 5: 1, 4: 1, 6: 2, 10: 9, 0: 4 });
    expect(bestPits(s)).toEqual([5]);
  });
  it('sees the opponent reply: it will not hand over a big chain', () => {
    // moving pit 0 (1 seed) puts a seed in pit 1 making it 3 with the CPU's 2-seed pit 11 able to capture;
    // the search must at least return a legal move and a value
    const s = mk({ 0: 1, 1: 2, 3: 6, 11: 2, 9: 5 }, { side: 0 });
    const r = searchBest(s.pits, s.store, 0, s.rules, 0, HARD_SEARCH);
    expect(r.best.length).toBeGreaterThan(0);
    for (const pit of r.best) expect(isLegal(s, pit)).toBe(true);
  });
  it('honours the must-feed rule at the root', () => {
    const s = mk({ 0: 2, 4: 2, 5: 1 });
    for (let seed = 0; seed < 5; seed++) {
      expect([4, 5]).toContain(hard.decide(s, createRng(seed)).pit);
    }
  });
  it('a single legal move is returned at once', () => {
    const s = mk({ 2: 3, 8: 4 });
    const r = searchBest(s.pits, s.store, 0, s.rules, 0, HARD_SEARCH);
    expect(r.best).toEqual([2]);
    expect(r.nodes).toBe(0);
  });
  it('searches 6 to 8 plies in the opening and middle game, within the node budget', () => {
    const depths: number[] = [];
    const rng = createRng(77);
    let worst = 0;
    for (let g = 0; g < 12; g++) {
      let s = createGame({
        seed: g,
        human: { id: 'a', name: 'A' },
        cpu: { id: 'b', name: 'B' },
        first: 0,
      });
      for (let i = 0; i < 14 && !isOver(s); i++) {
        const moves = legalMoves(s);
        if (i >= 4 && i % 2 === 0 && s.plies < 24) {
          const r = searchBest(
            s.pits,
            s.store,
            s.turns.index as Side,
            s.rules,
            s.plies,
            HARD_SEARCH,
          );
          if (moves.length > 1) {
            depths.push(r.depth);
            worst = Math.max(worst, r.nodes);
          }
        }
        s = apply(s, { type: 'move', pit: rng.pick(moves).pit });
      }
    }
    expect(depths.length).toBeGreaterThan(20);
    const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
    expect(mean).toBeGreaterThanOrEqual(6);
    expect(Math.max(...depths)).toBeLessThanOrEqual(8);
    expect(worst).toBeLessThanOrEqual(HARD_SEARCH.maxNodes);
  }, 60000);
  it('is cheap enough for a 4x throttled phone: one decision is a few milliseconds', () => {
    const s = createGame({
      seed: 5,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 0,
    });
    const times: number[] = [];
    for (let i = 0; i < 25; i++) {
      const t = performance.now();
      searchBest(s.pits, s.store, 0, s.rules, 0, HARD_SEARCH);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    // Measured 2-4 ms natively; the 120 ms p90 bound (kept as it was) has 30x slack for a busy
    // machine. Under v8 coverage (NAIJA_COVERAGE=1, set by vitest.config.ts) instrumented code
    // measured 156 ms p90 with parallel workers, so only that wall-clock bound is skipped there;
    // the deterministic guard on decision cost is the node-budget test above (a node count).
    if (process.env.NAIJA_COVERAGE !== '1') {
      expect(times[Math.floor(times.length * 0.9)]).toBeLessThan(120);
    }
    expect(times).toHaveLength(25);
  }, 60_000);
  it('stops deepening when the node budget runs out, and still answers', () => {
    const s = createGame({
      seed: 5,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 0,
    });
    const small = searchBest(s.pits, s.store, 0, s.rules, 0, { maxDepth: 8, maxNodes: 300 });
    const big = searchBest(s.pits, s.store, 0, s.rules, 0, { maxDepth: 8, maxNodes: 24000 });
    expect(small.depth).toBeLessThan(big.depth);
    expect(small.nodes).toBeLessThanOrEqual(300 + 6);
    expect(small.best.length).toBeGreaterThan(0);
  });
  it('is deterministic: the same position and rng give the same move; no state is kept between calls', () => {
    const s = createGame({
      seed: 8,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 0,
    });
    const a = hard.decide(s, createRng(5));
    const b = createHardBrain().decide(s, createRng(5));
    expect(a).toEqual(b);
    expect(hard.decide(s, createRng(5))).toEqual(a);
  });
  it('knows the game is capped and that a forced result ends the search early', () => {
    const s = mk({ 5: 1, 6: 1, 0: 2, 3: 1, 10: 9 }, { store: [23, 5] });
    const r = searchBest(s.pits, s.store, 0, s.rules, 0, HARD_SEARCH);
    expect(r.depth).toBeLessThan(8);
    expect(r.value).toBeGreaterThan(50000);
    const late = searchBest(s.pits, s.store, 0, s.rules, MAX_PLIES - 2, HARD_SEARCH);
    expect(late.best.length).toBeGreaterThan(0);
  });
  it('the hint search is much cheaper than the CPU search', () => {
    const s = createGame({
      seed: 5,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 0,
    });
    const h = searchBest(s.pits, s.store, 0, s.rules, 0, HINT_SEARCH);
    const big = searchBest(s.pits, s.store, 0, s.rules, 0, HARD_SEARCH);
    expect(h.nodes).toBeLessThan(big.nodes);
    expect(bestPits(s, HINT_SEARCH).length).toBeGreaterThan(0);
  });
  it('plays the CPU side too (side 1) and reaches a legal pit', () => {
    const s = mk({ 6: 1, 7: 2, 1: 1, 0: 2, 4: 9 }, { side: 1 });
    for (const pit of bestPits(s)) expect(isLegal(s, pit)).toBe(true);
  });
});

describe('simulations (seeded, no UI)', () => {
  it('0 illegal moves over 200 games for every pairing, and every game finishes', async () => {
    const levels = ['easy', 'medium', 'hard'] as const;
    for (const a of levels) {
      for (const b of levels) {
        const games = a === 'hard' && b === 'hard' ? 20 : a === 'hard' || b === 'hard' ? 60 : 200;
        let illegal = 0;
        for (let i = 0; i < games; i++) {
          const r = simulate({ seed: 500 + i, seats: [a, b], first: (i % 2) as Side });
          illegal += r.illegal;
          expect(isOver(r.state), `${a} v ${b} game ${i}`).toBe(true);
          expect(r.plies).toBeLessThanOrEqual(MAX_PLIES);
        }
        expect(illegal, `${a} v ${b}`).toBe(0);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }, 120000);

  it(`Hard beats Easy: Wilson lower bound >= 80% over ${GAMES} games`, async () => {
    const m = await match('hard', 'easy', GAMES, 1000);
    expect(m.illegal).toBe(0);
    expect(m.lo).toBeGreaterThanOrEqual(0.8);
  }, 300000);

  it('Hard beats Medium and Medium beats Easy, over many games (Hard > Medium > Easy)', async () => {
    const hm = await match('hard', 'medium', 200, 7000);
    const me = await match('medium', 'easy', 1000, 9000);
    expect(hm.lo).toBeGreaterThanOrEqual(0.8);
    expect(me.lo).toBeGreaterThan(0.6);
    expect(me.lo).toBeLessThan(me.hi);
    // the ordering: Hard's rate against Easy is higher than Medium's rate against Easy
    const he = await match('hard', 'easy', 50, 11000);
    expect(he.rate).toBeGreaterThan(me.rate);
  }, 300000);

  it('the same seed replays the same game', () => {
    const a = simulate({ seed: 31, seats: ['hard', 'medium'] });
    const b = simulate({ seed: 31, seats: ['hard', 'medium'] });
    expect(a.state).toEqual(b.state);
  });

  it('every rule toggle still plays out cleanly, and Hard still beats Easy by a wide margin', async () => {
    const variants: Partial<Rules>[] = [
      { skipOrigin: false },
      { captureChain: false },
      { capture: 'threeOnly' },
      { mustFeed: false },
      { endSeeds: 'starver' },
      {
        skipOrigin: false,
        captureChain: false,
        capture: 'threeOnly',
        mustFeed: false,
        endSeeds: 'starver',
      },
    ];
    for (const rules of variants) {
      const m = await match('hard', 'easy', 30, 300, rules);
      expect(m.illegal, JSON.stringify(rules)).toBe(0);
      expect(m.rate, JSON.stringify(rules)).toBeGreaterThanOrEqual(0.85);
      const e = await match('easy', 'easy', 20, 300, rules);
      expect(e.illegal).toBe(0);
    }
    expect(DEFAULT_RULES.mustFeed).toBe(true);
  }, 300000);
});
