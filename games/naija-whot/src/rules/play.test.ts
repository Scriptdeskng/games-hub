import { describe, expect, it } from 'vitest';
import { CPU_COUNTS } from './config';
import {
  apply,
  announce,
  currentSeatOf,
  handOf,
  isOver,
  legalPlays,
  mustDraw,
  topCard,
  turnsOf,
} from './engine';
import { cardOf } from './cards';
import { legalActions } from './legal';
import { id, position, whot } from './testkit';

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
