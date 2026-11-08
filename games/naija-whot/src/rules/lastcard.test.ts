import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './config';
import {
  apply,
  announce,
  canAnnounce,
  canCatch,
  catchPlayer,
  currentSeatOf,
  exposedSeat,
} from './engine';
import { requiredCall } from './legal';
import { id, position } from './testkit';

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
    const called = announce(apply(two(), { type: 'play', card: id('circle', 3) }), 0);
    expect(called.calls[0]).toBe('last');
    const stuck = position({
      hands: [[id('star', 4)], [id('star', 5), id('star', 7)]],
      discard: [id('circle', 7)],
      draw: [id('cross', 1), id('cross', 2)],
    });
    const withCall = { ...stuck, calls: ['last', 'none'] as typeof stuck.calls };
    const after = apply(withCall, { type: 'draw' });
    expect(after.calls[0]).toBe('none');
    expect(after.hands[0]).toHaveLength(2);
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
