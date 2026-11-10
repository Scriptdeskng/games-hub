import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, parseBoard } from '../rules/board';
import { makeRules } from '../rules/config';
import { createFromBoard, legalMoves } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { movable, preview, pressable, startEntry, takeable, tap, targets } from './entry';

const mv = (from: number, path: number[], caps: number[] = []): Move => ({
  from,
  to: path[path.length - 1] as number,
  path,
  caps,
});

describe('move entry', () => {
  const moves = [mv(10, [3]), mv(10, [5]), mv(20, [13]), mv(22, [15])];
  const own = [10, 20, 22, 99];
  it('starts with nothing selected when several pieces can move', () => {
    const e = startEntry(moves, own);
    expect(e.from).toBeNull();
    expect(movable(moves)).toEqual([10, 20, 22]);
    expect(pressable(e)).toEqual([10, 20, 22]);
    expect(targets(e)).toEqual([]);
  });
  it('selects the piece at once when only one piece can move', () => {
    const e = startEntry([mv(10, [3]), mv(10, [5])], own);
    expect(e.from).toBe(10);
    expect(targets(e)).toEqual([3, 5]);
  });
  it('tap piece, then a destination plays the move', () => {
    let r = tap(startEntry(moves, own), 10);
    expect(r.kind).toBe('select');
    if (r.kind !== 'select') return;
    expect(targets(r.entry)).toEqual([3, 5]);
    expect(pressable(r.entry)).toEqual(expect.arrayContaining([10, 20, 22, 3, 5]));
    const play = tap(r.entry, 5);
    expect(play).toEqual({ kind: 'play', move: moves[1] });
    r = tap(r.entry, 20) as typeof r; // switching to another piece
    expect(r.kind).toBe('select');
    expect(r.kind === 'select' && r.entry.from).toBe(20);
  });
  it('tapping the selected piece puts it back', () => {
    const sel = tap(startEntry(moves, own), 10);
    if (sel.kind !== 'select') throw new Error('expected select');
    const back = tap(sel.entry, 10);
    expect(back.kind).toBe('deselect');
    expect(back.kind === 'deselect' && back.entry.from).toBeNull();
  });
  it('a press that cannot be played says why: not yours, blocked, or a capture is compulsory', () => {
    const e = startEntry(moves, own);
    expect(tap(e, 50)).toMatchObject({ kind: 'illegal', reason: 'empty' });
    expect(tap(e, 99)).toMatchObject({ kind: 'illegal', reason: 'blocked' });
    const caps = [mv(10, [20], [15])];
    const c = startEntry([mv(10, [20], [15]), mv(12, [24], [18])], [10, 12, 14]);
    expect(tap(c, 14)).toMatchObject({ kind: 'illegal', reason: 'must' });
    expect(caps).toHaveLength(1);
    const sel = tap(startEntry(moves, own), 10);
    if (sel.kind !== 'select') throw new Error('expected select');
    expect(tap(sel.entry, 77)).toMatchObject({ kind: 'illegal', reason: 'empty' });
    expect(tap(sel.entry, 99)).toMatchObject({ kind: 'illegal', reason: 'blocked' });
  });
  it('when several captures end on one square, the numbered stones tell the paths apart', () => {
    const m1 = mv(1, [20, 30, 40], [10, 25, 35]);
    const m2 = mv(1, [20, 32, 40], [10, 26, 36]);
    const m3 = mv(1, [22, 30, 40], [11, 25, 35]);
    const other = mv(1, [50], [45]);
    const e0 = startEntry([m1, m2, m3, other], [1]);
    expect(e0.from).toBe(1);
    expect(targets(e0)).toEqual([40, 50]);
    expect(takeable(e0).sort((a, b) => a - b)).toEqual([10, 11, 25, 26, 35, 36, 45]);
    // tapping a destination that only one capture reaches plays it
    expect(tap(e0, 50)).toEqual({ kind: 'play', move: other });
    // the shared end square: first stone choice (20 or 22)
    const s1 = tap(e0, 40);
    if (s1.kind !== 'step') throw new Error('expected step');
    expect(s1.entry.at).toBe(0);
    expect(targets(s1.entry)).toEqual([20, 22]);
    // 22 leaves one candidate: it plays
    expect(tap(s1.entry, 22)).toEqual({ kind: 'play', move: m3 });
    // 20 leaves two: the next stone is where they part
    const s2 = tap(s1.entry, 20);
    if (s2.kind !== 'step') throw new Error('expected step');
    expect(s2.entry.at).toBe(1);
    expect(targets(s2.entry)).toEqual([30, 32]);
    expect(tap(s2.entry, 32)).toEqual({ kind: 'play', move: m2 });
    // the selected piece can still be put back, or another piece chosen, in the middle of a choice
    expect(tap(s2.entry, 1).kind).toBe('deselect');
    expect(tap(s2.entry, 60)).toMatchObject({ kind: 'illegal' });
  });
  it('previews the path of a single capture, or of the hovered destination', () => {
    const only = mv(1, [20, 30], [10, 25]);
    const e = startEntry([only], [1]);
    expect(preview(e, null)).toBe(only);
    const two = startEntry([mv(1, [20], [10]), mv(1, [22], [11])], [1]);
    expect(preview(two, null)).toBeNull();
    expect(preview(two, 22)?.to).toBe(22);
    expect(preview(startEntry([mv(1, [2]), mv(3, [4])], [1, 3]), null)).toBeNull();
  });
  it('works on real positions: a forced capture auto-selects its piece and plays on the landing square', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . w . . . .',
      '. . . . b . . .',
      '. . . . . . . .',
      'w . . . . . . .',
    ]);
    const s = createFromBoard({ board: b, turn: LIGHT, rules: makeRules(8) });
    const own = s.board.flatMap((v, i) => (v > 0 ? [i] : []));
    const e = startEntry(legalMoves(s), own);
    expect(e.from).toBe(4 * 8 + 3);
    expect(targets(e)).toEqual([6 * 8 + 5]);
    const r = tap(e, 6 * 8 + 5);
    expect(r.kind).toBe('play');
    expect(DARK).toBe(1);
  });
});
