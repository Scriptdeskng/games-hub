import { describe, expect, it } from 'vitest';
import { apply, currentSeatOf, legalPlays } from './engine';
import { canDraw } from './legal';
import { id, position, whot } from './testkit';

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
    const s2 = position({
      hands: [
        [id('circle', 5), id('circle', 3)],
        [id('square', 2), id('square', 5), id('cross', 3)],
      ],
      discard: [id('circle', 7)],
    });
    expect(legalPlays(s2)).toEqual([id('circle', 5), id('circle', 3)]);
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
