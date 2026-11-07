import { describe, expect, it } from 'vitest';
import { resolveLanding, squareToCell } from './board';
import { jumpMap } from './layout';
import type { BoardLayout } from './config';

const layout: BoardLayout = {
  size: 10,
  ladders: [{ id: 'up', from: 4, to: 14 }],
  snakes: [{ id: 'down', from: 17, to: 7 }],
};

describe('boustrophedon board', () => {
  it('numbers rows left to right then right to left', () => {
    expect(squareToCell(1)).toEqual({ row: 0, col: 0 });
    expect(squareToCell(10)).toEqual({ row: 0, col: 9 });
    expect(squareToCell(11)).toEqual({ row: 1, col: 9 });
    expect(squareToCell(20)).toEqual({ row: 1, col: 0 });
    expect(squareToCell(21)).toEqual({ row: 2, col: 0 });
    expect(squareToCell(100)).toEqual({ row: 9, col: 0 });
  });

  it('every square maps to a distinct cell and back', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 100; n++) {
      const c = squareToCell(n);
      seen.add(`${c.row},${c.col}`);
    }
    expect(seen.size).toBe(100);
  });

  it('consecutive squares are always neighbours (no teleports along the path)', () => {
    for (let n = 1; n < 100; n++) {
      const a = squareToCell(n);
      const b = squareToCell(n + 1);
      expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
    }
  });

  it('other board sizes', () => {
    expect(squareToCell(6, 5)).toEqual({ row: 1, col: 4 });
  });
});

describe('resolveLanding', () => {
  it('plain move', () => {
    expect(resolveLanding(layout, { exactFinish: true }, 10, 3)).toEqual({
      landed: 13,
      to: 13,
      via: null,
      jumpId: null,
      overshoot: false,
      won: false,
    });
  });

  it('ladder base climbs, snake head slides', () => {
    const up = resolveLanding(layout, { exactFinish: true }, 0, 4);
    expect([up.landed, up.to, up.via, up.jumpId]).toEqual([4, 14, 'ladder', 'up']);
    const down = resolveLanding(layout, { exactFinish: true }, 12, 5);
    expect([down.landed, down.to, down.via, down.jumpId]).toEqual([17, 7, 'snake', 'down']);
  });

  it('landing on a ladder top or a snake tail does nothing special', () => {
    expect(resolveLanding(layout, { exactFinish: true }, 10, 4).via).toBeNull(); // 14: ladder top
    expect(resolveLanding(layout, { exactFinish: true }, 3, 4).via).toBeNull(); // 7: snake tail
  });

  it('exact finish: exact roll wins, overshoot stays', () => {
    const win = resolveLanding(layout, { exactFinish: true }, 97, 3);
    expect(win.won).toBe(true);
    expect(win.to).toBe(100);
    const over = resolveLanding(layout, { exactFinish: true }, 97, 4);
    expect(over).toMatchObject({ overshoot: true, to: 97, landed: 97, won: false });
  });

  it('without exact finish any roll past 100 wins', () => {
    const r = resolveLanding(layout, { exactFinish: false }, 97, 6);
    expect(r).toMatchObject({ overshoot: false, to: 100, won: true });
  });

  it('a ladder that ends on 100 wins', () => {
    const l: BoardLayout = { size: 10, ladders: [{ id: 'x', from: 80, to: 100 }], snakes: [] };
    expect(resolveLanding(l, { exactFinish: true }, 77, 3, jumpMap(l)).won).toBe(true);
  });
});
