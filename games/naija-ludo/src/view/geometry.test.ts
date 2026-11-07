import { describe, expect, it } from 'vitest';
import { ARM, HOME, LAST_TRACK, TRACK_SIZE, YARD } from '../rules/config';
import { isSafeSquare } from '../rules/board';
import {
  BOARD_TRACK,
  homeCentre,
  seedCentre,
  squareKey,
  topLeft,
  trackCell,
  yardCentre,
  type Cell,
} from './geometry';

const key = (c: Cell): string => `${c.x},${c.y}`;
const near = (a: Cell, b: Cell): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 2;

describe('board geometry (matches the asset brief)', () => {
  it('has 52 distinct track cells forming a closed loop of neighbouring cells', () => {
    expect(BOARD_TRACK).toHaveLength(TRACK_SIZE);
    expect(new Set(BOARD_TRACK.map(key)).size).toBe(TRACK_SIZE);
    for (let i = 0; i < TRACK_SIZE; i++) {
      const a = BOARD_TRACK[i] as Cell;
      const b = BOARD_TRACK[(i + 1) % TRACK_SIZE] as Cell;
      expect(near(a, b), `${key(a)} -> ${key(b)}`).toBe(true);
      // every step is a side move, except the four corners of the cross which cut diagonally
      const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      expect(d === 1 || d === 2).toBe(true);
    }
    expect(key(BOARD_TRACK[0] as Cell)).toBe('0,6');
    expect(key(BOARD_TRACK[51] as Cell)).toBe('0,7');
  });

  it('every track cell lies in the cross, never in a yard or the centre', () => {
    for (const c of BOARD_TRACK) {
      const inCross =
        (c.x >= 6 && c.x <= 8) !== (c.y >= 6 && c.y <= 8) ||
        (c.x >= 6 && c.x <= 8 && c.y >= 6 && c.y <= 8);
      expect(inCross).toBe(true);
      expect(c.x >= 6 && c.x <= 8 && c.y >= 6 && c.y <= 8, `${key(c)} is in the centre`).toBe(
        false,
      );
    }
  });

  it('start squares are where the brief says: seat 0 (6,13), 1 (1,6), 2 (8,1), 3 (13,8)', () => {
    expect([0, 1, 2, 3].map((s) => key(trackCell(ARM * s)))).toEqual([
      '6,13',
      '1,6',
      '8,1',
      '13,8',
    ]);
  });

  it('star squares (8 after each start) are (2,8) (6,2) (12,6) (8,12) and all 8 safe squares are drawn there', () => {
    const stars = [0, 1, 2, 3].map((s) => key(trackCell(ARM * s + 8)));
    expect(stars).toEqual(['2,8', '6,2', '12,6', '8,12']);
    const safeCells = [...Array(TRACK_SIZE).keys()]
      .filter(isSafeSquare)
      .map((i) => key(trackCell(i)));
    expect(safeCells.sort()).toEqual(
      ['6,13', '1,6', '8,1', '13,8', '2,8', '6,2', '12,6', '8,12'].sort(),
    );
  });

  it('after 50 steps each colour stands at the cell before its home column and then enters it', () => {
    // seat 0 (7,14) -> column up col 7 ; seat 1 (0,7) -> row 7 ; seat 2 (7,0) -> col 7 down ; seat 3 (14,7) -> row 7 left
    const exits = [0, 1, 2, 3].map((s) => seedCentre(s, LAST_TRACK, 0, 4));
    expect(exits.map((c) => `${c.x - 0.5},${c.y - 0.5}`)).toEqual(['7,14', '0,7', '7,0', '14,7']);
    const first = [0, 1, 2, 3].map((s) => seedCentre(s, LAST_TRACK + 1, 0, 4));
    expect(first.map((c) => `${c.x - 0.5},${c.y - 0.5}`)).toEqual(['7,13', '1,7', '7,1', '13,7']);
    const last = [0, 1, 2, 3].map((s) => seedCentre(s, HOME - 1, 0, 4));
    expect(last.map((c) => `${c.x - 0.5},${c.y - 0.5}`)).toEqual(['7,9', '5,7', '7,5', '9,7']);
  });

  it('yard pits sit inside the yards, quick mode uses the diagonal pits', () => {
    expect(yardCentre(0, 0, 4)).toEqual({ x: 2, y: 11 });
    expect(yardCentre(1, 3, 4)).toEqual({ x: 4, y: 4 });
    expect(yardCentre(2, 0, 4)).toEqual({ x: 11, y: 2 });
    expect(yardCentre(3, 3, 4)).toEqual({ x: 13, y: 13 });
    expect(yardCentre(0, 0, 2)).toEqual({ x: 2, y: 11 });
    expect(yardCentre(0, 1, 2)).toEqual({ x: 4, y: 13 });
    expect(seedCentre(1, YARD, 2, 4)).toEqual(yardCentre(1, 2, 4));
  });

  it('home seeds wait inside their own centre triangle, apart from each other', () => {
    for (let s = 0; s < 4; s++) {
      const spots = [0, 1, 2, 3].map((i) => homeCentre(s, i, 4));
      expect(new Set(spots.map(key)).size).toBe(4);
      for (const c of spots) {
        expect(c.x).toBeGreaterThan(6);
        expect(c.x).toBeLessThan(9);
        expect(c.y).toBeGreaterThan(6);
        expect(c.y).toBeLessThan(9);
      }
    }
    expect(seedCentre(0, HOME, 0, 4)).toEqual(homeCentre(0, 0, 4));
  });

  it('squareKey groups seeds standing on the same square and ignores the yard', () => {
    expect(squareKey(0, YARD)).toBeNull();
    expect(squareKey(0, 13)).toBe(squareKey(1, 0));
    expect(squareKey(0, 13)).toBe('t13');
    expect(squareKey(2, 51)).toBe('c2-51');
    expect(squareKey(2, HOME)).toBe('h2');
    expect(topLeft({ x: 3.5, y: 4.5 })).toEqual({ x: 3, y: 4 });
  });
});
