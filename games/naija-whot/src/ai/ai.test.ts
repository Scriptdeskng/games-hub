import fs from 'node:fs';
import path from 'node:path';
import { createRng } from '@naija/core/rng';
import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { describe, expect, it } from 'vitest';
import { CPU_COUNTS, RULE_KEYS, DEFAULT_RULES } from '../rules/config';
import { apply, createGame, isOver, type GameState } from '../rules/engine';
import { SEATS } from '../rules/testkit';
import { viewFor } from '../rules/view';
import {
  CALL_RATES,
  brainsFor,
  createOpponents,
  pickPersonas,
  PERSONAS,
  personaById,
} from './index';
import { knowledge, pAnyOf } from './knowledge';
import { headToHead, simulate, wilson } from './sim';

const GAMES = 1000;
const lowerBound = (a: Difficulty, rest: Difficulty[], o = {}): number =>
  headToHead(a, rest, GAMES, o).lo;

/** simulation suites run thousands of full games: give them room on a loaded machine */
const SIM = { timeout: 120_000 };

describe('difficulty: Hard beats Medium beats Easy (seeded simulations)', SIM, () => {
  it(`Hard beats Easy at least 80% (Wilson lower bound) over ${GAMES} games, every persona style`, () => {
    for (const styles of [
      undefined,
      ['cautious', 'balanced'],
      ['aggressive', 'balanced'],
      ['hoarder', 'balanced'],
    ] as const) {
      const m = headToHead('hard', ['easy'], GAMES, { styles });
      expect(m.lo, `hard (${styles?.[0] ?? 'balanced'}) vs easy: ${m.rate}`).toBeGreaterThanOrEqual(
        0.8,
      );
      expect(m.illegal).toBe(0);
    }
  });
  it('Hard beats Medium, and Medium beats Easy', () => {
    expect(lowerBound('hard', ['medium'])).toBeGreaterThan(0.5);
    expect(lowerBound('medium', ['easy'])).toBeGreaterThan(0.5);
  });
  it('Hard also beats a table of 2 or 3 Easy CPUs well above its fair share', () => {
    expect(lowerBound('hard', ['easy', 'easy'])).toBeGreaterThan(0.5); // fair share 1/3
    expect(lowerBound('hard', ['easy', 'easy', 'easy'])).toBeGreaterThan(0.4); // fair share 1/4
  });
  it('wilson is a proper interval', () => {
    const w = wilson(80, 100);
    expect(w.lo).toBeLessThan(0.8);
    expect(w.hi).toBeGreaterThan(0.8);
  });
});

describe('legality: no CPU ever plays an illegal move', SIM, () => {
  const mixes: Difficulty[][] = [
    ['easy', 'medium', 'hard', 'easy'],
    ['hard', 'hard', 'medium', 'easy'],
    ['medium', 'easy', 'hard', 'hard'],
  ];
  for (const cpus of CPU_COUNTS) {
    it(`${cpus} CPU(s): 200 seeded games, default rules and each toggle flipped`, () => {
      const variants: Partial<typeof DEFAULT_RULES>[] = [
        {},
        ...RULE_KEYS.map((k) => ({ [k]: !DEFAULT_RULES[k] })),
        { semiLast: true },
        { whotOnPending: true, stackTwo: false, defendFive: false, finishOnSpecial: false },
        { marketEnds: true, finishOnSpecial: false, marketAgain: false },
      ];
      for (const rules of variants) {
        for (let i = 0; i < 200; i++) {
          const seats = mixes[i % mixes.length]!.slice(0, cpus + 1);
          const r = simulate({ seed: 20_000 + i, seats, rules, first: i % seats.length });
          expect(r.illegal, `${JSON.stringify(rules)} seed ${20_000 + i}`).toBe(0);
          expect(isOver(r.state)).toBe(true);
        }
      }
    });
  }
  it('General Market with 3 CPUs shows up and resolves in simulated games', () => {
    let markets = 0;
    for (let i = 0; i < 60; i++) {
      const seats: Difficulty[] = ['hard', 'medium', 'easy', 'easy'];
      let s: GameState = createGame({
        seed: 400 + i,
        human: { id: 's0', name: 'A' },
        cpus: SEATS(3),
      });
      const b = seats.map((d) => brainsFor('balanced')[d]);
      const rng = createRng(i + 1);
      while (!isOver(s)) {
        const before = s.hands.map((h) => h.length);
        s = apply(s, b[s.turns.index]!.decide(viewFor(s, s.turns.index), rng));
        if (s.last.some((e) => e.type === 'effect' && e.kind === 'market')) {
          markets++;
          const mover = s.last.find((e) => e.type === 'play')!;
          if (mover.type === 'play') {
            s.hands.forEach((h, k) => {
              if (k !== mover.seat) expect(h.length).toBeGreaterThanOrEqual(before[k]! + 1);
            });
          }
        }
      }
    }
    expect(markets).toBeGreaterThan(5);
  });
});

describe('the AI only uses public information', () => {
  it('brains never import or mention hidden state', () => {
    const src =
      fs.readFileSync(path.join(__dirname, 'brains.ts'), 'utf8') +
      fs.readFileSync(path.join(__dirname, 'knowledge.ts'), 'utf8');
    expect(src).not.toMatch(/GameState|\.hands\b|\.draw\b|rules\/engine/);
  });
  it('decisions are identical when only hidden cards (other hands, market order) change', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = createGame({ seed, human: { id: 'a', name: 'A' }, cpus: SEATS(2) });
      const warm = brainsFor('balanced').medium;
      const wr = createRng(seed);
      for (let i = 0; i < 12 && !isOver(s); i++)
        s = apply(s, warm.decide(viewFor(s, s.turns.index), wr));
      if (isOver(s)) continue;
      const seat = s.turns.index;
      // swap the hidden cards: reverse the market and rotate cards between the other hands
      const others = s.hands.map((h, i) => (i === seat ? null : h));
      const pool = others
        .flatMap((h) => h ?? [])
        .concat(s.draw)
        .reverse();
      let at = 0;
      const hands = s.hands.map((h, i) => (i === seat ? h : pool.slice(at, (at += h.length))));
      const hidden: GameState = { ...s, hands, draw: pool.slice(at) };
      expect(JSON.stringify(viewFor(hidden, seat))).toBe(JSON.stringify(viewFor(s, seat)));
      for (const d of DIFFICULTIES) {
        for (const style of ['balanced', 'cautious', 'aggressive', 'hoarder'] as const) {
          const a = brainsFor(style)[d].decide(viewFor(s, seat), createRng(seed));
          const b = brainsFor(style)[d].decide(viewFor(hidden, seat), createRng(seed));
          expect(b).toEqual(a);
        }
      }
    }
  });
  it('card counting only counts cards not in my hand or the face-up pile', () => {
    const s = createGame({ seed: 3, human: { id: 'a', name: 'A' }, cpus: SEATS(1) });
    const v = viewFor(s, 0);
    const k = knowledge(v);
    expect(k.unseen).toHaveLength(54 - 5 - 1);
    expect(k.unseen.some((id) => v.hand.includes(id) || v.discard.includes(id))).toBe(false);
    expect(pAnyOf(40, 0, 5)).toBe(0);
    expect(pAnyOf(10, 10, 3)).toBe(1);
    expect(pAnyOf(40, 5, 5)).toBeGreaterThan(0.3);
    expect(pAnyOf(40, 5, 5)).toBeLessThan(0.6);
  });
});

describe('Last card behaviour by difficulty and persona', () => {
  it('announce and catch rates rise with difficulty', () => {
    expect(CALL_RATES.easy.announce).toBeLessThan(CALL_RATES.medium.announce);
    expect(CALL_RATES.medium.announce).toBeLessThan(CALL_RATES.hard.announce);
    expect(CALL_RATES.easy.catch).toBeLessThan(CALL_RATES.medium.catch);
    expect(CALL_RATES.medium.catch).toBeLessThan(CALL_RATES.hard.catch);
  });
  it('a Hard CPU catches an exposed player, an Easy one only sometimes', () => {
    const count = (d: Difficulty): number => {
      let caught = 0;
      for (let i = 0; i < 200; i++) {
        let s = createGame({
          seed: i + 1,
          human: { id: 'a', name: 'A' },
          cpus: SEATS(1),
          first: 0,
        });
        s = {
          ...s,
          hands: [[s.hands[0]![0] as number], s.hands[1]!],
          calls: ['none', 'none'],
          turns: { ...s.turns, index: 1 },
        };
        const a = brainsFor('balanced')[d].decide(viewFor(s, 1), createRng(i));
        if (a.type === 'catch') caught++;
      }
      return caught;
    };
    expect(count('hard')).toBeGreaterThan(170);
    expect(count('easy')).toBeLessThan(80);
    expect(count('medium')).toBeGreaterThan(count('easy'));
  });
});

describe('personas and CPUs', () => {
  it('seats Mama Nkechi, then Tari, then Aisha', () => {
    expect(pickPersonas(1)).toEqual(['mama-nkechi']);
    expect(pickPersonas(2)).toEqual(['mama-nkechi', 'tari']);
    expect(pickPersonas(3)).toEqual(['mama-nkechi', 'tari', 'aisha']);
    expect(pickPersonas(9)).toHaveLength(3);
    expect(personaById('nobody').id).toBe('mama-nkechi');
    expect(PERSONAS.map((p) => p.style)).toEqual(['cautious', 'aggressive', 'hoarder']);
  });
  it('think delays stay in 0.4 to 1.2 s, and every persona has all banter events', () => {
    for (const d of DIFFICULTIES) {
      const cpus = createOpponents({
        seed: 4,
        difficulty: d,
        seats: pickPersonas(3).map((p, i) => ({ id: `c${i}`, persona: p })),
      });
      for (const c of cpus)
        for (let i = 0; i < 50; i++) {
          const ms = c.thinkMs();
          expect(ms).toBeGreaterThanOrEqual(400);
          expect(ms).toBeLessThanOrEqual(1200);
        }
    }
    for (const p of PERSONAS) {
      for (const e of [
        'play',
        'pickTwo',
        'gotPickTwo',
        'market',
        'suspension',
        'holdOn',
        'whotCall',
        'lastCard',
        'win',
        'lose',
      ])
        expect(p.banter[e]?.[0], `${p.id}.${e}`).toBe(`whot.banter.${p.id}.${e}`);
    }
  });
  it('the same seed replays the same CPU game', () => {
    const a = simulate({ seed: 9, seats: ['hard', 'medium', 'easy'] });
    const b = simulate({ seed: 9, seats: ['hard', 'medium', 'easy'] });
    expect(a.state).toEqual(b.state);
  });
  it('Hard keeps a Whot back while another card fits', () => {
    let s = createGame({ seed: 1, human: { id: 'a', name: 'A' }, cpus: SEATS(1) });
    const whot = 49;
    const plain = s.hands[0]!.find((id) => id !== whot) as number;
    s = { ...s, hands: [[whot, 3, 4, 5, plain], s.hands[1]!], discard: [0] };
    const a = brainsFor('balanced').hard.decide(viewFor(s, 0), createRng(1));
    expect(a.type === 'play' ? a.card : -1).not.toBe(whot);
  });
});
