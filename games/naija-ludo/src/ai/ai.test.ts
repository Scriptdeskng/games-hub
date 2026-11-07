import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, HOME, type Rules } from '../rules/config';
import {
  apply,
  createGame,
  isOver,
  legalMoves,
  type Action,
  type GameState,
} from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { danger, exposure, scoreMove } from './eval';
import { PERSONAS, createOpponents, personaById, pickPersonas } from './index';
import { headToHead, simulate, wilson } from './sim';

/** Games per match-up for the strength claims (the Definition of Done asks for 200; we run 1000). */
const GAMES = 1000;

const cpuAt = (idx: number): number => (idx - 26 + 52) % 52;
const at = (seeds: number[], c1: number[], roll: number, rules: Partial<Rules> = {}): GameState => {
  const s = createGame({
    seed: 3,
    human: { id: 'you', name: 'You' },
    cpus: [{ id: 'c1', name: 'C' }],
    rules,
  });
  return {
    ...s,
    players: [
      { ...s.players[0]!, seeds },
      { ...s.players[1]!, seeds: c1 },
    ],
    phase: 'move',
    roll,
  };
};

describe('wilson interval', () => {
  it('brackets the observed rate and tightens with more games', () => {
    const a = wilson(60, 100);
    const b = wilson(600, 1000);
    expect(a.lo).toBeLessThan(0.6);
    expect(a.hi).toBeGreaterThan(0.6);
    expect(b.hi - b.lo).toBeLessThan(a.hi - a.lo);
  });
});

describe('evaluation helpers (public state only)', () => {
  it('danger counts opponents 1..6 behind, ignores safe squares, columns and stacks', () => {
    const s = at([20, -1, -1, -1], [cpuAt(17), -1, -1, -1], 1);
    const me = s.players[0]!;
    expect(danger(s, me, 20)).toBeCloseTo(1 / 6);
    expect(danger(s, me, 21)).toBe(0); // star square
    expect(danger(s, me, 53)).toBe(0); // home column
    expect(danger(s, me, -1)).toBe(0);
    const far = at([20, -1, -1, -1], [cpuAt(10), -1, -1, -1], 1);
    expect(danger(far, far.players[0]!, 20)).toBe(0);
    const stack = at([20, 20, -1, -1], [cpuAt(17), -1, -1, -1], 1);
    expect(danger(stack, stack.players[0]!, 20)).toBe(0);
    const open = at([20, 20, -1, -1], [cpuAt(17), -1, -1, -1], 1, { stacks: 'off' });
    expect(danger(open, open.players[0]!, 20)).toBeGreaterThan(0);
    expect(exposure(s, me)).toBeGreaterThan(0);
  });

  it('an opponent that would have to leave the track before reaching you is no threat', () => {
    // c1 is on progress 49 (square 23): 3 squares behind my seed on 26, but its next 3 steps leave the track
    const s = at([26, -1, -1, -1], [49, -1, -1, -1], 1);
    // my slot-0 seed at progress 26 is square 26; c1 slot 2 progress 49 is square (26+49)%52 = 23
    expect(danger(s, s.players[0]!, 26)).toBe(0); // 26 is a start square anyway
    const t = at([27, -1, -1, -1], [49, -1, -1, -1], 1);
    expect(danger(t, t.players[0]!, 27)).toBe(0); // 49 + 4 = 53 leaves the track
  });
});

describe('Hard scores moves sensibly', () => {
  const pick = (s: GameState): number =>
    (createHardBrain().decide(s, createRng(1)) as Extract<Action, { type: 'move' }>).seed;

  it('captures when it can (and prefers the bigger victim)', () => {
    const s = at([5, 9, -1, -1], [cpuAt(9), -1, -1, -1], 4);
    expect(pick(s)).toBe(0);
    // two captures, both leave my seeds safe: the victim further along (square 20) is the bigger prize
    const two = at([16, 5, -1, -1], [cpuAt(20), cpuAt(9), -1, -1], 4);
    expect(legalMoves(two).filter((m) => m.captures.length)).toHaveLength(2);
    expect(pick(two)).toBe(0);
  });

  it('takes a seed out of the yard on a 6 and gets a seed home', () => {
    const out = at([-1, 30, -1, -1], [-1, -1, -1, -1], 6);
    expect(legalMoves(out).find((m) => m.seed === pick(out))?.release).toBe(true);
    expect(pick(at([53, 10, -1, -1], [-1, -1, -1, -1], 3))).toBe(0);
  });

  it('runs a threatened seed away rather than moving a safe one', () => {
    // seed 0 (square 20) has c1 three squares behind and a 6 takes it onto the safe square 26
    const s = at([20, 40, 56, 56], [cpuAt(17), -1, -1, -1], 6);
    expect(pick(s)).toBe(0);
  });

  it('does not walk a seed into the line of fire when a safe move exists', () => {
    // c1 sits on square 14; landing on 15 (1 ahead) is exposed, landing on star 21... choose between them
    const s = at([12, 18, -1, -1], [cpuAt(14), -1, -1, -1], 3);
    // seed 1 -> 21 (star, safe); seed 0 -> 15, right in front of c1
    expect(pick(s)).toBe(1);
    const moves = legalMoves(s);
    expect(scoreMove(s, moves[1]!)).toBeGreaterThan(scoreMove(s, moves[0]!));
  });

  it('asks only for a roll when it is time to roll', () => {
    const s = createGame({
      seed: 1,
      human: { id: 'a', name: 'A' },
      cpus: [{ id: 'b', name: 'B' }],
    });
    for (const b of [easyBrain, mediumBrain, createHardBrain()]) {
      expect(b.decide(s, createRng(1))).toEqual({ type: 'roll' });
    }
  });
});

describe('Medium prefers captures and safe squares', () => {
  const sensible = (s: GameState): number => {
    // mistakes are random, so ask many times and take the most common answer
    const counts = new Map<number, number>();
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const a = mediumBrain.decide(s, rng) as { type: 'move'; seed: number };
      counts.set(a.seed, (counts.get(a.seed) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  };
  it('captures first', () => {
    expect(sensible(at([5, 9, -1, -1], [cpuAt(9), -1, -1, -1], 4))).toBe(0);
  });
  it('then a safe square', () => {
    // seed 1: 18 -> 21 (star); seed 0: 12 -> 15 (not safe). The front seed is also seed 1 here, so swap them
    expect(sensible(at([18, 12, -1, -1], [-1, -1, -1, -1], 3))).toBe(0);
    expect(sensible(at([12, 18, -1, -1], [-1, -1, -1, -1], 3))).toBe(1);
  });
  it('slips at about its mistake rate, so it is not perfect', () => {
    const s = at([5, 9, -1, -1], [cpuAt(9), -1, -1, -1], 4);
    const rng = createRng(11);
    let off = 0;
    for (let i = 0; i < 1000; i++) {
      if ((mediumBrain.decide(s, rng) as { seed: number }).seed !== 0) off++;
    }
    expect(off).toBeGreaterThan(40);
    expect(off).toBeLessThan(200);
  });
});

describe('every difficulty plays legally', () => {
  it('only ever chooses legal moves, in every rule set, 1 and 3 CPUs', () => {
    const rulesets: Partial<Rules>[] = [{}, { stacks: 'block' }, { quick: true, stacks: 'off' }];
    for (const d of ['easy', 'medium', 'hard'] as const) {
      for (const rules of rulesets) {
        for (const cpus of [1, 3]) {
          const seats = Array.from({ length: cpus + 1 }, () => d);
          for (let g = 0; g < 25; g++) {
            const r = simulate({ seed: 500 + g, seats, rules });
            expect(r.winner).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});

describe('fairness: no dice peeking, dice independent of difficulty', () => {
  it('a brain ignores the dice rng state (changing it changes nothing)', () => {
    const s = at([5, 9, -1, -1], [cpuAt(14), 3, -1, -1], 4);
    for (const mk of [() => easyBrain, () => mediumBrain, () => createHardBrain()]) {
      const a = mk().decide(s, createRng(9));
      const b = mk().decide({ ...s, rng: s.rng ^ 0x55555 }, createRng(9));
      expect(b).toEqual(a);
    }
  });

  it('the dice sequence a seed produces does not depend on who plays or how well', () => {
    const rolls = (d: 'easy' | 'hard'): number[] => {
      let s = createGame({
        seed: 77,
        human: { id: 'a', name: 'A' },
        cpus: [{ id: 'b', name: 'B' }],
      });
      const cpus = createOpponents({
        seed: 77,
        difficulty: d,
        seats: [
          { id: 'a', persona: 'malam-sani' },
          { id: 'b', persona: 'funmi' },
        ],
      });
      const out: number[] = [];
      while (out.length < 40 && !isOver(s)) {
        const before = s;
        s = apply(s, cpus[s.turns.index]!.decide(s));
        if (s.lastRoll && s.lastRoll !== before.lastRoll) out.push(s.lastRoll.value);
      }
      return out;
    };
    // the first roll is the same for both levels, and the rng state after N rolls depends only on N
    expect(rolls('easy')[0]).toBe(rolls('hard')[0]);
  });
});

describe('seeded and instance-local', () => {
  it('the same seed replays the same game', () => {
    const a = simulate({ seed: 12, seats: ['hard', 'medium'] });
    const b = simulate({ seed: 12, seats: ['hard', 'medium'] });
    expect(b).toEqual(a);
  });

  it('interleaving games does not change results: no state is shared between CPUs or games', () => {
    const solo = simulate({ seed: 31, seats: ['hard', 'hard'] });
    simulate({ seed: 32, seats: ['hard', 'easy'] });
    expect(simulate({ seed: 31, seats: ['hard', 'hard'] })).toEqual(solo);
    const [x, y] = createOpponents({
      seed: 5,
      difficulty: 'hard',
      seats: [
        { id: 'x', persona: 'funmi' },
        { id: 'y', persona: 'malam-sani' },
      ],
    });
    const s = at([5, 9, -1, -1], [cpuAt(9), -1, -1, -1], 4);
    expect(x!.decide(s)).toEqual(y!.decide(s)); // same position, same answer
    expect(x!.getRngState()).not.toBe(y!.getRngState()); // each owns its own rng
  });
});

describe('personas and seating', () => {
  it('seats one of the three against one CPU, and all three in their affinity seats against three', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(['funmi', 'baba-ade', 'malam-sani']).toContain(pickPersonas(seed, 1)[0]);
      expect(pickPersonas(seed, 3)).toEqual(['funmi', 'malam-sani', 'baba-ade']);
    }
    const seen = new Set(Array.from({ length: 60 }, (_, i) => pickPersonas(i, 1)[0]));
    expect(seen.size).toBe(3);
    expect(pickPersonas(4, 1)).toEqual(pickPersonas(4, 1));
  });
  it("Malam Sani's thinking time stays within 0.6 s", () => {
    expect(personaById('malam-sani').think![1]).toBeLessThanOrEqual(600);
  });
  it('every persona has banter for every event the game raises', () => {
    for (const p of PERSONAS) {
      for (const e of [
        'start',
        'six',
        'capture',
        'captured',
        'home',
        'forfeit',
        'idle',
        'win',
        'lose',
      ]) {
        expect(p.banter[e]?.length, `${p.id} ${e}`).toBeGreaterThan(0);
      }
    }
    expect(personaById('nobody').id).toBe('funmi');
  });
});

describe('strength (seeded games, seat 0 against the rest, who starts rotates)', () => {
  const he = headToHead('hard', ['easy'], GAMES);
  const hm = headToHead('hard', ['medium'], GAMES);
  const me = headToHead('medium', ['easy'], GAMES);
  const h3 = headToHead('hard', ['easy', 'easy', 'easy'], GAMES);
  const m3 = headToHead('medium', ['easy', 'easy', 'easy'], GAMES);
  it('Definition of Done: Hard beats Easy in at least 60% of the games, with confidence', () => {
    expect(he.games).toBeGreaterThanOrEqual(1000);
    expect(he.rate).toBeGreaterThanOrEqual(0.6);
    expect(he.lo).toBeGreaterThanOrEqual(0.6); // Wilson lower bound over 1000 games
    expect(headToHead('hard', ['easy'], 200, { seed: 9000 }).rate).toBeGreaterThanOrEqual(0.6);
  });

  it('Hard > Medium > Easy: each level beats the one below it with confidence', () => {
    expect(hm.lo).toBeGreaterThan(0.5);
    expect(me.lo).toBeGreaterThan(0.5);
    // and the gap shows against the same opponent
    expect(he.rate).toBeGreaterThan(me.rate);
    expect(h3.rate).toBeGreaterThan(m3.rate);
  });

  it('one Hard CPU against three Easy ones wins far more than its fair quarter', () => {
    expect(h3.lo).toBeGreaterThan(0.25 * 2);
  });
});

describe('defaults', () => {
  it('the match-ups use the default rules', () => {
    expect(DEFAULT_RULES.stacks).toBe('safe');
    expect(HOME).toBe(56);
  });
});
