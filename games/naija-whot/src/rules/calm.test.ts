import { describe, expect, it } from 'vitest';
import { CALM_TURN, MAX_TURNS } from './config';
import { apply, currentSeatOf, legalPlays } from './engine';
import { id, position } from './testkit';

/** a position `turn` turns into the game, the player holding `card` and a plain card */
const at = (turn: number, card: number, rules = {}) =>
  position({
    hands: [
      [card, id('circle', 3)],
      [id('star', 4), id('star', 5)],
      [id('square', 3), id('square', 10)],
    ],
    discard: [id('circle', 7)],
    draw: [id('triangle', 1), id('triangle', 2), id('triangle', 3), id('triangle', 4)],
    turn,
    rules,
  });
const play = (s: ReturnType<typeof at>, card: number) => apply(s, { type: 'play', card });
const withTurn = (s: ReturnType<typeof at>, turn: number) => ({
  ...s,
  turns: { ...s.turns, turn },
});

describe('calm late game (calmLate, default on)', () => {
  it('is a documented rule that starts well before the safety net', () => {
    // the Rules screen help (en and pcm) says 240: keep them together
    expect(CALM_TURN).toBe(240);
    expect(CALM_TURN).toBeLessThan(MAX_TURNS / 2);
  });
  it.each([
    ['2', id('circle', 2)],
    ['5', id('circle', 5)],
  ])('a %s played in the calm game is just a card: no pick penalty', (_n, card) => {
    const s = play(withTurn(at(0, card), CALM_TURN), card);
    expect(s.pending).toBeNull();
    expect(currentSeatOf(s).id).toBe('c1');
    expect(s.last.some((e) => e.type === 'effect')).toBe(false);
  });
  it('a 14 in the calm game: nobody draws and the turn passes', () => {
    const card = id('circle', 14);
    const s = play(withTurn(at(0, card), CALM_TURN), card);
    expect(s.hands.map((h) => h.length)).toEqual([1, 2, 2]);
    expect(currentSeatOf(s).id).toBe('c1');
    expect(s.last.some((e) => e.type === 'effect')).toBe(false);
  });
  it('before CALM_TURN the powers work as normal', () => {
    const two = play(withTurn(at(0, id('circle', 2)), CALM_TURN - 2), id('circle', 2));
    expect(two.pending).toEqual({ kind: 'two', count: 2 });
    const market = play(withTurn(at(0, id('circle', 14)), CALM_TURN - 2), id('circle', 14));
    expect(market.hands.map((h) => h.length)).toEqual([1, 3, 3]);
    expect(currentSeatOf(market).id).toBe('you');
  });
  it('turned off, the powers work at any length of game', () => {
    const s = play(
      withTurn(at(0, id('circle', 2), { calmLate: false }), CALM_TURN + 50),
      id('circle', 2),
    );
    expect(s.pending).toEqual({ kind: 'two', count: 2 });
  });
  it('1, 8 and Whot keep their powers in the calm game', () => {
    const hold = play(withTurn(at(0, id('circle', 1)), CALM_TURN), id('circle', 1));
    expect(currentSeatOf(hold).id).toBe('you');
    const suspend = play(withTurn(at(0, id('circle', 8)), CALM_TURN), id('circle', 8));
    expect(currentSeatOf(suspend).id).toBe('c2');
  });
  it('a penalty that is already running still plays out (and can be defended)', () => {
    const s0 = withTurn(at(0, id('circle', 2)), CALM_TURN - 1);
    const hit = play(s0, id('circle', 2)); // turn CALM_TURN - 1 -> CALM_TURN: calm begins
    expect(hit.pending).toEqual({ kind: 'two', count: 2 });
    const stacked = {
      ...hit,
      hands: [hit.hands[0]!, [id('square', 2), id('star', 5)], hit.hands[2]!],
    };
    expect(legalPlays(stacked)).toEqual([id('square', 2)]);
    expect(play(stacked, id('square', 2)).pending).toEqual({ kind: 'two', count: 4 });
  });
  it('announces the calm game once, when the turn count crosses CALM_TURN', () => {
    const card = id('circle', 3);
    const crossing = play(withTurn(at(0, card), CALM_TURN - 1), card);
    expect(crossing.last.some((e) => e.type === 'calm')).toBe(true);
    const after = apply(crossing, { type: 'draw' });
    expect(after.last.some((e) => e.type === 'calm')).toBe(false);
    const off = play(withTurn(at(0, card, { calmLate: false }), CALM_TURN - 1), card);
    expect(off.last.some((e) => e.type === 'calm')).toBe(false);
  });
});
