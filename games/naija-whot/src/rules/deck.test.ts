import { describe, expect, it } from 'vitest';
import { DECK, SHAPES, cardOf, cardValue, handValue, isSpecial, isWhot } from './cards';
import { CPU_COUNTS, DEFAULT_RULES, RULE_KEYS, sanitizeRules } from './config';
import { apply, createGame, currentSeatOf, seatIndexOf, topCard } from './engine';
import { canPlayCard, matchesTop } from './legal';
import { id, position, whot, SEATS } from './testkit';
import { viewFor } from './view';

const game = (cpus: number, seed = 1) =>
  createGame({ seed, human: { id: 'you', name: 'You' }, cpus: SEATS(cpus) });

describe('the deck', () => {
  it('has exactly the 54 cards of GAMES.md', () => {
    expect(DECK).toHaveLength(54);
    const count = (s: string): number => DECK.filter((c) => c.shape === s).length;
    expect([
      count('circle'),
      count('triangle'),
      count('cross'),
      count('square'),
      count('star'),
    ]).toEqual([12, 12, 9, 9, 7]);
    expect(count('whot')).toBe(5);
    expect(DECK.filter((c) => c.shape === 'whot').every((c) => c.n === 20)).toBe(true);
    expect(DECK.filter((c) => c.shape === 'circle').map((c) => c.n)).toEqual([
      1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14,
    ]);
    expect(DECK.filter((c) => c.shape === 'cross').map((c) => c.n)).toEqual([
      1, 2, 3, 5, 7, 10, 11, 13, 14,
    ]);
    expect(DECK.filter((c) => c.shape === 'star').map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 7, 8]);
    expect(DECK.map((c) => c.id)).toEqual([...Array(54).keys()]);
  });
  it('knows power cards and count-up values', () => {
    expect([1, 2, 5, 8, 14, 20].every((n) => isSpecial(DECK.find((c) => c.n === n)!.id))).toBe(
      true,
    );
    expect(isSpecial(id('circle', 7))).toBe(false);
    expect(isWhot(whot())).toBe(true);
    expect(cardValue(whot())).toBe(20);
    expect(handValue([id('circle', 7), id('star', 3), whot()])).toBe(30);
    expect(cardOf(id('star', 7)).shape).toBe('star');
  });
});

describe('createGame', () => {
  it.each(CPU_COUNTS)(
    'deals 5 cards to each of %i CPUs plus the human, and flips a plain starter',
    (n) => {
      for (let seed = 1; seed <= 40; seed++) {
        const s = game(n, seed);
        expect(s.hands).toHaveLength(n + 1);
        expect(s.hands.every((h) => h.length === 5)).toBe(true);
        expect(s.discard).toHaveLength(1);
        expect(isSpecial(topCard(s))).toBe(false);
        const all = [...s.hands.flat(), ...s.draw, ...s.discard];
        expect(new Set(all).size).toBe(54);
        expect(all).toHaveLength(54);
        expect(s.turns.seats[0]).toMatchObject({ id: 'you', kind: 'human' });
        expect(s.phase).toBe('play');
      }
    },
  );
  it('is deterministic per seed and differs across seeds', () => {
    expect(game(2, 5)).toEqual(game(2, 5));
    expect(game(2, 5).hands).not.toEqual(game(2, 6).hands);
  });
  it('rejects 0 or 4 CPUs (single human only) and honours the first seat', () => {
    expect(() => game(0)).toThrow(RangeError);
    expect(() =>
      createGame({ seed: 1, human: { id: 'you', name: 'You' }, cpus: [...SEATS(3), SEATS(1)[0]!] }),
    ).toThrow(RangeError);
    const s = createGame({ seed: 1, human: { id: 'you', name: 'You' }, cpus: SEATS(2), first: 2 });
    expect(s.turns.index).toBe(2);
    expect(currentSeatOf(s).id).toBe('c2');
    expect(
      createGame({ seed: 1, human: { id: 'you', name: 'You' }, cpus: SEATS(1), first: 9 }).turns
        .index,
    ).toBe(1);
  });
});

describe('matching', () => {
  const ctx = (discard: number[], called: 'star' | null = null) =>
    position({ hands: [[], []], discard, called });
  it('matches by shape or by number', () => {
    const s = ctx([id('circle', 7)]);
    expect(matchesTop(s, id('circle', 3))).toBe(true);
    expect(matchesTop(s, id('star', 7))).toBe(true);
    expect(matchesTop(s, id('star', 3))).toBe(false);
  });
  it('a Whot matches anything and after a Whot only the called shape (or another Whot) matches', () => {
    expect(matchesTop(ctx([id('circle', 7)]), whot())).toBe(true);
    const s = ctx([whot()], 'star');
    expect(matchesTop(s, id('star', 3))).toBe(true);
    expect(matchesTop(s, id('circle', 3))).toBe(false);
    expect(matchesTop(s, whot(1))).toBe(true);
  });
  it('playing a card you do not hold is illegal', () => {
    const s = position({
      hands: [[id('circle', 3)], [id('circle', 4)]],
      discard: [id('circle', 7)],
    });
    expect(canPlayCard(s, s.hands[0]!, id('circle', 4))).toBe(false);
    expect(() => apply(s, { type: 'play', card: id('circle', 4) })).toThrow(RangeError);
  });
});

describe('seats, views and rules data', () => {
  it('finds seats and exposes only public information in a view', () => {
    const s = game(3, 3);
    expect(seatIndexOf(s, 'c2')).toBe(2);
    const v = viewFor(s, 1);
    expect(v.hand).toEqual(s.hands[1]);
    expect(v.sizes).toEqual([5, 5, 5, 5]);
    expect(v.drawCount).toBe(s.draw.length);
    expect(JSON.stringify(v)).not.toContain('"hands"');
    expect(Object.keys(v).sort()).toEqual(
      [
        'called',
        'calls',
        'discard',
        'drawCount',
        'hand',
        'log',
        'pending',
        'rules',
        'seat',
        'seats',
        'sizes',
        'turn',
      ].sort(),
    );
  });
  it('sanitizeRules repairs anything', () => {
    expect(sanitizeRules(null)).toEqual(DEFAULT_RULES);
    expect(sanitizeRules('x')).toEqual(DEFAULT_RULES);
    expect(sanitizeRules({ stackTwo: 'no', defendFive: false }).stackTwo).toBe(true);
    expect(sanitizeRules({ defendFive: false }).defendFive).toBe(false);
    expect(sanitizeRules({ lastCard: false, semiLast: true }).semiLast).toBe(false);
    expect(RULE_KEYS).toHaveLength(9);
    expect(DEFAULT_RULES).toMatchObject({
      stackTwo: true,
      defendFive: true,
      whotOnPending: false,
      finishOnSpecial: true,
      lastCard: true,
      semiLast: false,
      marketEnds: false,
      calmLate: true,
    });
  });
  it('every shape appears in SHAPES', () => {
    expect(SHAPES).toEqual(['circle', 'triangle', 'cross', 'square', 'star']);
  });
});
