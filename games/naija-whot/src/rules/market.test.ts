import { describe, expect, it } from 'vitest';
import { MAX_TURNS } from './config';
import { apply, currentSeatOf, isOver, topCard } from './engine';
import { id, position, whot } from './testkit';

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
