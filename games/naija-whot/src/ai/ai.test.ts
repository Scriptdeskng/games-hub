import fs from 'node:fs';
import path from 'node:path';
import { createRng } from '@naija/core/rng';
import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { describe, expect, it } from 'vitest';
import { cardOf } from '../rules/cards';
import { CPU_COUNTS, RULE_KEYS, DEFAULT_RULES } from '../rules/config';
import { apply, createGame, isOver, type GameState } from '../rules/engine';
import { legalActions } from '../rules/legal';
import type { PublicView } from '../rules/view';
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
import { lastPlayedShape } from './styles';
import { headToHead, simulate, wilson } from './sim';
import type { Style } from './personas';

const GAMES = 1000;
const lowerBound = (a: Difficulty, rest: Difficulty[], o = {}): number =>
  headToHead(a, rest, GAMES, o).lo;

/** simulation suites run thousands of full games: give them room on a loaded machine */
const SIM = { timeout: 120_000 };

describe('difficulty: Hard beats Medium beats Easy (seeded simulations)', SIM, () => {
  it(`Hard beats Easy at least 80% (Wilson lower bound) over ${GAMES} games, every persona style`, () => {
    // Hard in each style against a plain Easy, and against an Easy of the same style (the real table)
    for (const styles of [
      undefined,
      ['cautious', 'balanced'],
      ['aggressive', 'balanced'],
      ['hoarder', 'balanced'],
      ['cautious', 'cautious'],
      ['aggressive', 'aggressive'],
      ['hoarder', 'hoarder'],
    ] as const) {
      const m = headToHead('hard', ['easy'], GAMES, { styles });
      expect(m.games).toBeGreaterThanOrEqual(1000);
      expect(
        m.lo,
        `hard (${styles?.join(' vs ') ?? 'balanced'}) vs easy: ${m.rate}`,
      ).toBeGreaterThanOrEqual(0.8);
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

describe('no game ends on the 600-turn cap (W-01)', SIM, () => {
  // 500 seeded games per table size and difficulty; the calm late game ends long games well before 600
  for (const cpus of CPU_COUNTS) {
    for (const d of DIFFICULTIES) {
      it(`${cpus} CPU(s), everybody ${d}: the cap fires in at most 1% of games`, () => {
        let cap = 0;
        const games = 500;
        for (let i = 0; i < games; i++) {
          const r = simulate({
            seed: 5000 + i,
            seats: Array<Difficulty>(cpus + 1).fill(d),
            first: i % (cpus + 1),
          });
          if (r.state.endedBy === 'cap') cap++;
        }
        expect(cap / games).toBeLessThanOrEqual(0.01);
      });
    }
  }
  it('with the calm rule off, 3-CPU Hard games still hit the cap (the rule is what fixes it)', () => {
    let cap = 0;
    for (let i = 0; i < 200; i++) {
      const r = simulate({
        seed: 5000 + i,
        seats: ['hard', 'hard', 'hard', 'hard'],
        rules: { calmLate: false },
        first: i % 4,
      });
      if (r.state.endedBy === 'cap') cap++;
    }
    expect(cap).toBeGreaterThan(8); // measured: 14% of games
  });
});

/** Every decision of 150 seeded Medium games (3 seats): the same states for every style and level. */
function sampleViews(): PublicView[] {
  const views: PublicView[] = [];
  for (let i = 0; i < 150; i++) {
    let s = createGame({ seed: 900 + i, human: { id: 'a', name: 'A' }, cpus: SEATS(2) });
    const b = brainsFor('balanced').medium;
    const r = createRng(i + 1);
    while (!isOver(s)) {
      const v = viewFor(s, s.turns.index);
      views.push(v);
      s = apply(s, b.decide(v, r));
    }
  }
  return views;
}

describe('persona styles are real inputs at every difficulty (W-03)', SIM, () => {
  const views = sampleViews();
  const isPower = (v: PublicView, card: number): boolean =>
    !v.pending && [2, 5, 14].includes(cardOf(card).n);
  /** share of states where a power card AND a plain card fit and the CPU led with the power card */
  const leadRate = (d: Difficulty, style: Style): number => {
    const rng = createRng(7);
    let n = 0;
    let lead = 0;
    for (const v of views) {
      const plays = legalActions(v, v.hand).flatMap((a) => (a.type === 'play' ? [a] : []));
      const power = plays.some((a) => isPower(v, a.card));
      const plain = plays.some((a) => !isPower(v, a.card) && cardOf(a.card).shape !== 'whot');
      if (!power || !plain) continue;
      n++;
      const a = brainsFor(style)[d].decide(v, rng);
      if (a.type === 'play' && isPower(v, a.card)) lead++;
    }
    expect(n).toBeGreaterThan(1500);
    return lead / n;
  };
  /** share of states (hand > 3, no pick pending) where a Whot and another card fit and Whot was played */
  const whotRate = (d: Difficulty, style: Style): number => {
    const rng = createRng(7);
    let n = 0;
    let whot = 0;
    for (const v of views) {
      if (v.pending || v.hand.length <= 3) continue;
      const plays = legalActions(v, v.hand).flatMap((a) => (a.type === 'play' ? [a] : []));
      const hasWhot = plays.some((a) => cardOf(a.card).shape === 'whot');
      if (!hasWhot || !plays.some((a) => cardOf(a.card).shape !== 'whot')) continue;
      n++;
      const a = brainsFor(style)[d].decide(v, rng);
      if (a.type === 'play' && cardOf(a.card).shape === 'whot') whot++;
    }
    expect(n).toBeGreaterThan(1000);
    return whot / n;
  };

  it.each(DIFFICULTIES)('%s: Mama Nkechi leads with 2, 5 and 14 far less than Tari', (d) => {
    const cautious = leadRate(d, 'cautious');
    const balanced = leadRate(d, 'balanced');
    const aggressive = leadRate(d, 'aggressive');
    expect(cautious, `cautious ${cautious} balanced ${balanced}`).toBeLessThan(balanced - 0.15);
    expect(aggressive, `aggressive ${aggressive} balanced ${balanced}`).toBeGreaterThan(
      balanced + 0.07,
    );
  });
  it.each(['easy', 'medium', 'hard'] as const)(
    '%s: Aisha hoards her Whot while she has more than 3 cards',
    (d) => {
      const hoarder = whotRate(d, 'hoarder');
      const balanced = whotRate(d, 'balanced');
      expect(hoarder, `hoarder ${hoarder} balanced ${balanced}`).toBeLessThan(
        d === 'hard' ? 0.005 : balanced * 0.5,
      );
      expect(whotRate(d, 'cautious'), `cautious vs balanced ${balanced}`).toBeLessThan(
        d === 'medium' ? balanced * 0.8 : balanced,
      );
    },
  );
  it('Aisha at Hard plays her Whot again once she is down to three cards', () => {
    const rng = createRng(3);
    let n = 0;
    let whot = 0;
    for (const v of views) {
      if (v.pending || v.hand.length !== 3) continue;
      const plays = legalActions(v, v.hand).flatMap((a) => (a.type === 'play' ? [a] : []));
      if (!plays.some((a) => cardOf(a.card).shape === 'whot')) continue;
      n++;
      const a = brainsFor('hoarder').hard.decide(v, rng);
      if (a.type === 'play' && cardOf(a.card).shape === 'whot') whot++;
    }
    expect(n).toBeGreaterThan(50);
    expect(whot / n).toBeGreaterThan(0.3);
  });
  it.each(['easy', 'medium', 'hard'] as const)(
    '%s: Tari names the shape the other player just played (others do not)',
    (d) => {
      const rate = (style: Style): number => {
        const rng = createRng(11);
        let n = 0;
        let same = 0;
        for (const v of views) {
          const want = lastPlayedShape(v);
          if (!want || v.pending) continue;
          const plays = legalActions(v, v.hand).flatMap((a) => (a.type === 'play' ? [a] : []));
          if (!plays.some((a) => cardOf(a.card).shape === 'whot')) continue;
          const a = brainsFor(style)[d].decide(v, rng);
          if (a.type !== 'play' || cardOf(a.card).shape !== 'whot') continue;
          n++;
          if (a.call === want) same++;
        }
        expect(n).toBeGreaterThan(40);
        return same / n;
      };
      const tari = rate('aggressive');
      const other = rate('balanced');
      // Hard weighs the call against card counting, so it only leans; Easy and Medium follow it
      expect(tari, `tari ${tari} balanced ${other}`).toBeGreaterThan(
        other + (d === 'hard' ? 0.05 : 0.2),
      );
    },
  );
  it('the style is a real input: all four styles decide differently on the same states', () => {
    for (const d of DIFFICULTIES) {
      const out = (['balanced', 'cautious', 'aggressive', 'hoarder'] as const).map((s) => {
        const rng = createRng(5);
        return views.map((v) => JSON.stringify(brainsFor(s)[d].decide(v, rng))).join('|');
      });
      expect(new Set(out).size).toBe(4);
    }
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
