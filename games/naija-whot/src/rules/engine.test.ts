import { describe, expect, it } from 'vitest';
import { DECK, SHAPES, cardOf, cardValue, handValue, isSpecial, isWhot } from './cards';
import { CPU_COUNTS, DEFAULT_RULES, MAX_TURNS, RULE_KEYS, sanitizeRules } from './config';
import {
  apply,
  announce,
  canAnnounce,
  canCatch,
  catchPlayer,
  createGame,
  currentSeatOf,
  exposedSeat,
  handOf,
  isOver,
  legalPlays,
  mustDraw,
  seatIndexOf,
  topCard,
  turnsOf,
} from './engine';
import { canDraw, canPlayCard, legalActions, matchesTop, requiredCall } from './legal';
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

describe('playing and drawing', () => {
  const base = () =>
    position({
      hands: [
        [id('circle', 3), id('star', 4), id('cross', 10)],
        [id('square', 3), id('square', 7)],
      ],
      discard: [id('circle', 7)],
      draw: [id('triangle', 10), id('triangle', 11)],
    });
  it('a normal play moves the card to the pile and passes the turn', () => {
    const s = apply(base(), { type: 'play', card: id('circle', 3) });
    expect(topCard(s)).toBe(id('circle', 3));
    expect(s.hands[0]).toHaveLength(2);
    expect(currentSeatOf(s).id).toBe('c1');
    expect(s.last.map((e) => e.type)).toContain('play');
    expect(turnsOf(s, 'you')).toBe(1);
  });
  it('does not mutate the previous state', () => {
    const before = base();
    const copy = JSON.stringify(before);
    apply(before, { type: 'play', card: id('circle', 3) });
    expect(JSON.stringify(before)).toBe(copy);
  });
  it('a card that does not match is refused', () => {
    expect(() => apply(base(), { type: 'play', card: id('cross', 10) })).toThrow(RangeError);
  });
  it('drawing is refused while a card can be played, allowed otherwise', () => {
    expect(() => apply(base(), { type: 'draw' })).toThrow(RangeError);
    const stuck = position({
      hands: [[id('star', 4)], [id('square', 3)]],
      discard: [id('circle', 7)],
      draw: [id('triangle', 10)],
    });
    expect(mustDraw(stuck)).toBe(true);
    const s = apply(stuck, { type: 'draw' });
    expect(handOf(s, 'you')).toEqual([id('star', 4), id('triangle', 10)]);
    expect(currentSeatOf(s).id).toBe('c1');
  });
  it('legalActions lists plays (a Whot once per shape) and the draw only when allowed', () => {
    const s = position({
      hands: [[whot(), whot(1), id('circle', 3)], [id('star', 1)]],
      discard: [id('circle', 7)],
    });
    const acts = legalActions(s, s.hands[0]!);
    expect(acts.filter((a) => a.type === 'play' && a.card === whot())).toHaveLength(5);
    expect(acts.filter((a) => a.type === 'play' && a.card === whot(1))).toHaveLength(5);
    expect(acts.some((a) => a.type === 'draw')).toBe(false);
    expect(legalPlays(s)).toEqual([whot(), whot(1), id('circle', 3)]);
  });
  it('is closed once the game is over', () => {
    const s = position({ hands: [[id('circle', 3)], [id('star', 1)]], discard: [id('circle', 7)] });
    const done = apply(s, { type: 'play', card: id('circle', 3) });
    expect(isOver(done)).toBe(true);
    expect(legalPlays(done)).toEqual([]);
    expect(mustDraw(done)).toBe(false);
    expect(() => apply(done, { type: 'draw' })).toThrow(RangeError);
    expect(announce(done, 0)).toBe(done);
  });
});

describe('Whot 20', () => {
  it('plays on anything, names a shape and only that shape (or a Whot) follows', () => {
    const s0 = position({
      hands: [
        [whot(), id('circle', 3)],
        [id('star', 4), id('circle', 5), whot(1)],
      ],
      discard: [id('circle', 7)],
    });
    expect(() => apply(s0, { type: 'play', card: whot() })).toThrow(/name a shape/);
    const s = apply(s0, { type: 'play', card: whot(), call: 'star' });
    expect(s.called).toBe('star');
    expect(legalPlays(s)).toEqual([id('star', 4), whot(1)]);
    const s2 = apply(s, { type: 'play', card: id('star', 4) });
    expect(s2.called).toBeNull();
  });
  it('a Whot as the last card wins (finishOnSpecial on)', () => {
    const s = position({ hands: [[whot()], [id('circle', 2)]], discard: [id('circle', 7)] });
    const w = apply(s, { type: 'play', card: whot(), call: 'cross' });
    expect(w.winner).toBe('you');
    expect(w.endedBy).toBe('empty');
  });
});

describe('1 Hold On', () => {
  it('plays again, with any number of CPUs', () => {
    for (const cpus of CPU_COUNTS) {
      const s0 = position({
        hands: [
          [id('circle', 1), id('circle', 3)],
          ...Array.from({ length: cpus }, () => [id('star', 4)]),
        ],
        discard: [id('circle', 7)],
      });
      const s = apply(s0, { type: 'play', card: id('circle', 1) });
      expect(currentSeatOf(s).id).toBe('you');
      expect(s.last.some((e) => e.type === 'effect' && e.kind === 'hold')).toBe(true);
    }
  });
});

describe('2 Pick Two and 5 Pick Three', () => {
  const two = (rules = {}) =>
    position({
      hands: [[id('circle', 2), id('star', 4)], [id('square', 2), id('cross', 3)], [id('star', 5)]],
      discard: [id('circle', 7)],
      draw: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => id('triangle', [1, 2, 3, 4, 5, 7, 8, 10][n - 1]!)),
      rules,
    });
  it('the next player must draw 2 (or defend with a 2: stacking)', () => {
    const s = apply(two(), { type: 'play', card: id('circle', 2) });
    expect(s.pending).toEqual({ kind: 'two', count: 2 });
    expect(legalPlays(s)).toEqual([id('square', 2)]);
    expect(canDraw(s, s.hands[1]!)).toBe(true);
    const taken = apply(s, { type: 'draw' });
    expect(taken.hands[1]).toHaveLength(4);
    expect(taken.pending).toBeNull();
    expect(currentSeatOf(taken).id).toBe('c2');
    expect(taken.log.some((l) => l.t === 'draw' && l.n === 2 && !l.voluntary)).toBe(true);
  });
  it('defending with a 2 adds 2 and passes it on; stacks keep growing', () => {
    const s = apply(apply(two(), { type: 'play', card: id('circle', 2) }), {
      type: 'play',
      card: id('square', 2),
    });
    expect(s.pending).toEqual({ kind: 'two', count: 4 });
    expect(currentSeatOf(s).id).toBe('c2');
    expect(s.last.some((e) => e.type === 'effect' && e.kind === 'defend')).toBe(true);
    const drawn = apply(s, { type: 'draw' });
    expect(drawn.hands[2]).toHaveLength(5);
  });
  it('with stacking off a Pick Two can only be taken', () => {
    const s = apply(two({ stackTwo: false }), { type: 'play', card: id('circle', 2) });
    expect(legalPlays(s)).toEqual([]);
    expect(() => apply(s, { type: 'play', card: id('square', 2) })).toThrow(RangeError);
  });
  it('a 2 cannot defend a Pick Three and a 5 cannot defend a Pick Two', () => {
    const s = position({
      hands: [[id('circle', 5)], [id('square', 2), id('square', 5), id('cross', 3)]],
      discard: [id('circle', 7)],
      pending: null,
      rules: { finishOnSpecial: false },
    });
    // hand of one power card cannot go out (finishOnSpecial off): so use a two-card hand
    const s2 = position({
      hands: [
        [id('circle', 5), id('circle', 3)],
        [id('square', 2), id('square', 5), id('cross', 3)],
      ],
      discard: [id('circle', 7)],
    });
    expect(s).toBeTruthy();
    const p = apply(s2, { type: 'play', card: id('circle', 5) });
    expect(p.pending).toEqual({ kind: 'three', count: 3 });
    expect(legalPlays(p)).toEqual([id('square', 5)]);
    const two2 = position({
      hands: [
        [id('circle', 2), id('circle', 3)],
        [id('square', 5), id('cross', 3)],
      ],
      discard: [id('circle', 7)],
    });
    expect(legalPlays(apply(two2, { type: 'play', card: id('circle', 2) }))).toEqual([]);
  });
  it('with defend-with-5 off a Pick Three can only be taken', () => {
    const s0 = position({
      hands: [
        [id('circle', 5), id('circle', 3)],
        [id('square', 5), id('cross', 3)],
      ],
      discard: [id('circle', 7)],
      rules: { defendFive: false },
    });
    const s = apply(s0, { type: 'play', card: id('circle', 5) });
    expect(legalPlays(s)).toEqual([]);
    expect(apply(s, { type: 'draw' }).hands[1]).toHaveLength(5);
  });
  it('a 5 stacks on a 5 (Pick Three grows to 6)', () => {
    const s0 = position({
      hands: [
        [id('circle', 5), id('circle', 3)],
        [id('square', 5), id('cross', 3)],
        [id('star', 4)],
      ],
      discard: [id('circle', 7)],
    });
    const s = apply(apply(s0, { type: 'play', card: id('circle', 5) }), {
      type: 'play',
      card: id('square', 5),
    });
    expect(s.pending).toEqual({ kind: 'three', count: 6 });
  });
  it('a plain card cannot be played on a pending pick', () => {
    const s = apply(two(), { type: 'play', card: id('circle', 2) });
    expect(() => apply(s, { type: 'play', card: id('cross', 3) })).toThrow(RangeError);
  });
});

describe('Whot on a pending pick (toggle, default off)', () => {
  const mk = (on: boolean) =>
    apply(
      position({
        hands: [[id('circle', 2), id('circle', 3)], [whot(), id('cross', 3)], [id('star', 4)]],
        discard: [id('circle', 7)],
        rules: { whotOnPending: on },
      }),
      { type: 'play', card: id('circle', 2) },
    );
  it('off: the Whot cannot cancel the pick', () => {
    expect(legalPlays(mk(false))).toEqual([]);
  });
  it('on: the Whot cancels the pick and names a shape', () => {
    const s = apply(mk(true), { type: 'play', card: whot(), call: 'cross' });
    expect(s.pending).toBeNull();
    expect(s.called).toBe('cross');
    expect(currentSeatOf(s).id).toBe('c2');
  });
  it('on: the 5 is also cancelled', () => {
    const s0 = position({
      hands: [
        [id('circle', 5), id('circle', 3)],
        [whot(), id('cross', 3)],
      ],
      discard: [id('circle', 7)],
      rules: { whotOnPending: true },
    });
    const p = apply(s0, { type: 'play', card: id('circle', 5) });
    expect(apply(p, { type: 'play', card: whot(), call: 'star' }).pending).toBeNull();
  });
});

describe('8 Suspension', () => {
  it('skips the next player', () => {
    const s0 = position({
      hands: [[id('circle', 8), id('star', 3)], [id('cross', 3)], [id('cross', 5)]],
      discard: [id('circle', 7)],
    });
    const s = apply(s0, { type: 'play', card: id('circle', 8) });
    expect(currentSeatOf(s).id).toBe('c2');
    expect(s.last.some((e) => e.type === 'effect' && e.kind === 'suspend' && e.victim === 1)).toBe(
      true,
    );
  });
  it('with one CPU the human plays again', () => {
    const s0 = position({
      hands: [[id('circle', 8), id('star', 3)], [id('cross', 3)]],
      discard: [id('circle', 7)],
    });
    expect(currentSeatOf(apply(s0, { type: 'play', card: id('circle', 8) })).id).toBe('you');
  });
});

describe('14 General Market', () => {
  const draw = [id('triangle', 1), id('triangle', 2), id('triangle', 3), id('triangle', 4)];
  for (const cpus of CPU_COUNTS) {
    it(`every other player draws 1 and the player plays again (${cpus} CPU${cpus > 1 ? 's' : ''})`, () => {
      const s0 = position({
        hands: [
          [id('circle', 14), id('circle', 3)],
          ...Array.from({ length: cpus }, () => [id('star', 4), id('star', 5)]),
        ],
        discard: [id('circle', 7)],
        draw,
      });
      const s = apply(s0, { type: 'play', card: id('circle', 14) });
      expect(s.hands[0]).toHaveLength(1);
      for (let i = 1; i <= cpus; i++) expect(s.hands[i]).toHaveLength(3);
      expect(s.draw).toHaveLength(draw.length - cpus);
      expect(currentSeatOf(s).id).toBe('you');
      expect(s.last.filter((e) => e.type === 'draw')).toHaveLength(cpus);
    });
  }
  it('with marketAgain off the turn passes', () => {
    const s0 = position({
      hands: [[id('circle', 14), id('circle', 3)], [id('star', 4)]],
      discard: [id('circle', 7)],
      draw,
      rules: { marketAgain: false },
    });
    expect(currentSeatOf(apply(s0, { type: 'play', card: id('circle', 14) })).id).toBe('c1');
  });
  it('reshuffles the discard pile when the market runs dry in the middle of a General Market', () => {
    const s0 = position({
      hands: [[id('circle', 14), id('circle', 3)], [id('star', 4)], [id('star', 5)]],
      discard: [id('triangle', 7), id('triangle', 8), id('circle', 7)],
      draw: [id('cross', 1)],
    });
    const s = apply(s0, { type: 'play', card: id('circle', 14) });
    expect(s.hands[1]).toHaveLength(2);
    expect(s.hands[2]).toHaveLength(2);
    expect(s.last.some((e) => e.type === 'reshuffle')).toBe(true);
  });
});

describe('finishing on a power card', () => {
  for (const card of [
    id('circle', 1),
    id('circle', 8),
    id('circle', 14),
    id('circle', 2),
    id('circle', 5),
  ]) {
    it(`default: going out on a ${cardOf(card).n} wins at once`, () => {
      const s0 = position({
        hands: [[card], [id('square', 3)], [id('star', 4)]],
        discard: [id('circle', 7)],
      });
      const s = apply(s0, { type: 'play', card });
      expect(s.winner).toBe('you');
      expect(s.pending).toBeNull();
    });
    it(`finishOnSpecial off: a lone ${cardOf(card).n} cannot be played, the player draws`, () => {
      const s0 = position({
        hands: [[card], [id('square', 3)]],
        discard: [id('circle', 7)],
        rules: { finishOnSpecial: false },
      });
      expect(legalPlays(s0)).toEqual([]);
      expect(mustDraw(s0)).toBe(true);
      expect(() => apply(s0, { type: 'play', card })).toThrow(RangeError);
    });
  }
  it('finishOnSpecial off: two cards, the plain one goes first and a plain last card wins', () => {
    const s0 = position({
      hands: [[id('circle', 1), id('circle', 3)], [id('square', 3)]],
      discard: [id('circle', 7)],
      rules: { finishOnSpecial: false },
    });
    expect(legalPlays(s0)).toEqual([id('circle', 1), id('circle', 3)]);
    const lone = position({
      hands: [[id('circle', 3)], [id('square', 3)]],
      discard: [id('circle', 7)],
      rules: { finishOnSpecial: false },
    });
    expect(apply(lone, { type: 'play', card: id('circle', 3) }).winner).toBe('you');
  });
});

describe('Last card and Semi-last card', () => {
  const two = (rules = {}, hand = [id('circle', 3), id('circle', 4)]) =>
    position({
      hands: [hand, [id('star', 4), id('star', 5), id('star', 7)]],
      discard: [id('circle', 7)],
      rules,
    });
  it('requires the announcement at one card, at two only with semiLast', () => {
    expect(requiredCall({ ...DEFAULT_RULES }, 1)).toBe('last');
    expect(requiredCall({ ...DEFAULT_RULES }, 2)).toBe('none');
    expect(requiredCall({ ...DEFAULT_RULES, semiLast: true }, 2)).toBe('semi');
    expect(requiredCall({ ...DEFAULT_RULES, lastCard: false }, 1)).toBe('none');
  });
  it('playing down to one card without calling exposes you; calling (with the play) does not', () => {
    const silent = apply(two(), { type: 'play', card: id('circle', 3) });
    expect(exposedSeat(silent, 0)).toBe(true);
    expect(canCatch(silent, 1, 0)).toBe(true);
    const loud = apply(two(), { type: 'play', card: id('circle', 3), announce: true });
    expect(exposedSeat(loud, 0)).toBe(false);
    expect(loud.calls[0]).toBe('last');
    expect(loud.last.some((e) => e.type === 'announce')).toBe(true);
  });
  it('the Last card button works out of turn and may be pressed early at two cards', () => {
    const s = apply(two(), { type: 'play', card: id('circle', 3) });
    const called = announce(s, 0);
    expect(called.calls[0]).toBe('last');
    expect(exposedSeat(called, 0)).toBe(false);
    expect(announce(called, 0)).toBe(called);
    // early: pre-announce at two cards, then play down to one
    const early = announce(two(), 0);
    expect(early.calls[0]).toBe('last');
    expect(exposedSeat(apply(early, { type: 'play', card: id('circle', 3) }), 0)).toBe(false);
  });
  it('cannot be called with three or more cards, or when the rule is off', () => {
    const three = two({}, [id('circle', 3), id('circle', 4), id('circle', 5)]);
    expect(canAnnounce(three, 0)).toBe(false);
    expect(announce(three, 0)).toBe(three);
    expect(canAnnounce(two({ lastCard: false }), 0)).toBe(false);
  });
  it('catching costs 2 cards, once, and cannot be done to yourself or the announced', () => {
    const s = apply(two(), { type: 'play', card: id('circle', 3) });
    expect(canCatch(s, 0, 0)).toBe(false);
    expect(canCatch(s, 1, 1)).toBe(false);
    const caught = catchPlayer(s, 1, 0);
    expect(caught.hands[0]).toHaveLength(3);
    expect(caught.last.map((e) => e.type)).toEqual(['catch', 'draw']);
    expect(exposedSeat(caught, 0)).toBe(false);
    expect(catchPlayer(caught, 1, 0)).toBe(caught);
    expect(catchPlayer(announce(s, 0), 1, 0).hands[0]).toHaveLength(1);
  });
  it('the current CPU can catch with a catch action, which does not end its turn', () => {
    const s = apply(two(), { type: 'play', card: id('circle', 3) });
    const c = apply(s, { type: 'catch', target: 0 });
    expect(c.hands[0]).toHaveLength(3);
    expect(currentSeatOf(c).id).toBe('c1');
    expect(() => apply(c, { type: 'catch', target: 0 })).toThrow(/nothing to catch/);
    expect(() => apply(c, { type: 'catch', target: 1 })).toThrow(RangeError);
    expect(() => apply(c, { type: 'catch', target: 9 })).toThrow(RangeError);
  });
  it('drawing resets the announcement', () => {
    const s = announce(apply(two(), { type: 'play', card: id('circle', 3) }), 0);
    expect(s.calls[0]).toBe('last');
    const big = { ...s, calls: s.calls.slice() };
    const stuck = position({
      hands: [[id('star', 4)], [id('star', 5), id('star', 7)]],
      discard: [id('circle', 7)],
      draw: [id('cross', 1), id('cross', 2)],
    });
    const withCall = { ...stuck, calls: ['last', 'none'] as typeof stuck.calls };
    const after = apply(withCall, { type: 'draw' });
    expect(after.calls[0]).toBe('none');
    expect(big).toBeTruthy();
  });
  it('Semi-last: exposed at two cards until "semi", and at one card needs "last" again', () => {
    const s0 = position({
      hands: [
        [id('circle', 3), id('circle', 4), id('star', 4)],
        [id('star', 3), id('star', 5)],
      ],
      discard: [id('circle', 7)],
      rules: { semiLast: true },
    });
    const s = apply(s0, { type: 'play', card: id('circle', 3) });
    expect(exposedSeat(s, 0)).toBe(true);
    const semi = announce(s, 0);
    expect(semi.calls[0]).toBe('semi');
    expect(exposedSeat(semi, 0)).toBe(false);
    const down = apply(apply(semi, { type: 'play', card: id('star', 3) }), {
      type: 'play',
      card: id('star', 4),
    });
    expect(down.hands[0]).toHaveLength(1);
    expect(exposedSeat(down, 0)).toBe(true);
    expect(announce(down, 0).calls[0]).toBe('last');
    expect(catchPlayer(down, 1, 0).hands[0]).toHaveLength(3);
  });
  it('with Last card off nobody is ever exposed', () => {
    const s = apply(two({ lastCard: false }), { type: 'play', card: id('circle', 3) });
    expect(exposedSeat(s, 0)).toBe(false);
    expect(canCatch(s, 1, 0)).toBe(false);
  });
});

describe('the market runs out', () => {
  it('reshuffles the discard pile and keeps the top card', () => {
    const top = id('circle', 7);
    const s0 = position({
      hands: [[id('star', 4)], [id('star', 5), id('star', 7)]],
      discard: [id('triangle', 2), id('triangle', 3), id('cross', 3), top],
      draw: [],
    });
    const s = apply(s0, { type: 'draw' });
    expect(topCard(s)).toBe(top);
    expect(s.discard).toEqual([top]);
    expect(s.hands[0]).toHaveLength(2);
    expect(s.draw).toHaveLength(2);
    expect(s.last.map((e) => e.type)).toEqual(['reshuffle', 'draw']);
    expect(new Set([...s.draw, ...s.hands[0]!]).size).toBe(4);
  });
  it('is deterministic (same seed, same reshuffle)', () => {
    const mk = () =>
      position({
        hands: [[id('star', 4)], [id('star', 5)]],
        discard: [id('triangle', 2), id('triangle', 3), id('cross', 3), id('circle', 7)],
        draw: [],
      });
    expect(apply(mk(), { type: 'draw' })).toEqual(apply(mk(), { type: 'draw' }));
  });
  it('with nothing to draw at all the player simply passes', () => {
    const s0 = position({
      hands: [[id('star', 4)], [id('star', 5)]],
      discard: [id('circle', 7)],
      draw: [],
    });
    const s = apply(s0, { type: 'draw' });
    expect(s.hands[0]).toHaveLength(1);
    expect(currentSeatOf(s).id).toBe('c1');
  });
  it('count-up variant: the game ends when the market is empty; lowest hand wins', () => {
    const s0 = position({
      hands: [
        [id('star', 4), id('circle', 10)],
        [id('star', 5), id('star', 1)],
        [whot(), id('cross', 10)],
      ],
      discard: [id('circle', 7)],
      draw: [],
      rules: { marketEnds: true },
    });
    const s = apply(
      { ...s0, hands: [[id('triangle', 8)], s0.hands[1]!, s0.hands[2]!] },
      { type: 'draw' },
    );
    expect(s.endedBy).toBe('market');
    expect(s.totals).toEqual([8, 6, 30]);
    expect(s.winner).toBe('c1');
    expect(isOver(s)).toBe(true);
  });
  it('count-up ties go to the shorter hand, then the earlier seat', () => {
    const s0 = position({
      hands: [[id('star', 5)], [id('star', 2), id('star', 3)], [id('cross', 5)]],
      discard: [id('circle', 7)],
      draw: [],
      rules: { marketEnds: true },
      turn: 1,
    });
    const s = apply(
      {
        ...s0,
        hands: [
          [id('triangle', 5)],
          [id('star', 2), id('star', 3), id('cross', 14)],
          [id('cross', 5)],
        ],
      },
      { type: 'draw' },
    );
    expect(s.totals).toEqual([5, 19, 5]);
    expect(s.winner).toBe('you');
  });
  it('count-up also ends a General Market that empties the market', () => {
    const s0 = position({
      hands: [[id('circle', 14), id('circle', 3)], [id('star', 4)], [id('star', 5)]],
      discard: [id('circle', 7)],
      draw: [id('cross', 1)],
      rules: { marketEnds: true },
    });
    const s = apply(s0, { type: 'play', card: id('circle', 14) });
    expect(s.endedBy).toBe('market');
  });
  it('a game that goes on too long ends by count-up', () => {
    const s0 = position({ hands: [[id('star', 4)], [id('star', 5)]], discard: [id('circle', 7)] });
    const long = { ...s0, turns: { ...s0.turns, turn: MAX_TURNS - 1 } };
    const s = apply(long, { type: 'draw' });
    expect(s.endedBy).toBe('cap');
    expect(isOver(s)).toBe(true);
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
    expect(RULE_KEYS).toHaveLength(8);
    expect(DEFAULT_RULES).toMatchObject({
      stackTwo: true,
      defendFive: true,
      whotOnPending: false,
      finishOnSpecial: true,
      lastCard: true,
      semiLast: false,
      marketEnds: false,
    });
  });
  it('every shape appears in SHAPES', () => {
    expect(SHAPES).toEqual(['circle', 'triangle', 'cross', 'square', 'star']);
  });
});
