import { describe, expect, it } from 'vitest';
import {
  cellAt,
  centreOf,
  HIT_SLOP,
  leg,
  metricsFor,
  nextCursor,
  pick,
  FRAME_RATIO,
} from './geometry';

describe('metrics', () => {
  it('a 10x10 cell is 31.6 px at 360 px wide (8 px margin) and an 8x8 cell 39.5 px', () => {
    expect(metricsFor(10, 344).cell).toBeCloseTo(31.6, 1);
    expect(metricsFor(8, 344).cell).toBeCloseTo(39.5, 1);
    expect(metricsFor(10, 340).inset).toBeCloseTo(340 * FRAME_RATIO);
    expect(metricsFor(10, 340).inset).toBeCloseTo(14);
  });
  it('maps squares to centres and points back to cells', () => {
    const m = metricsFor(10, 340);
    const c = centreOf(9 * 10 + 0, m); // bottom-left square
    expect(c.x).toBeCloseTo(m.cell / 2);
    expect(c.y).toBeCloseTo(9.5 * m.cell);
    expect(cellAt(c, m)).toBe(90);
    expect(cellAt({ x: -1, y: 5 }, m)).toBeNull();
    expect(cellAt({ x: 5, y: m.cell * 10 + 1 }, m)).toBeNull();
  });
});

describe('hit-slop', () => {
  const m = metricsFor(10, 344);
  const target = 5 * 10 + 4; // row 5, col 4: dark
  const c = centreOf(target, m);
  it('a press on a target is that target', () => {
    expect(pick(c, [target], m)).toBe(target);
  });
  it('a press within 22 px of a target means the target, even in the next cell', () => {
    // 1 px into the cell to the right: 17 px from the target centre
    expect(pick({ x: c.x + m.cell * 0.5 + 1, y: c.y }, [target], m)).toBe(target);
    // a corner of the target's cell and beyond: 28 px diagonal (about 20 px per axis)
    expect(pick({ x: c.x + 15, y: c.y + 15 }, [target], m)).toBe(target);
  });
  it('a press further than the slop from every target means the cell under it', () => {
    const far = { x: c.x + HIT_SLOP + 4, y: c.y };
    expect(pick(far, [target], m)).toBe(cellAt(far, m));
    expect(pick({ x: -50, y: -50 }, [target], m)).toBeNull();
  });
  it('the nearest of several targets wins', () => {
    const a = 5 * 10 + 4;
    const b = 4 * 10 + 5; // diagonal neighbour
    const p = { x: centreOf(a, m).x + 10, y: centreOf(a, m).y - 10 };
    expect(pick(p, [b, a], m)).toBe(a);
    expect(pick({ x: centreOf(a, m).x + 1, y: centreOf(a, m).y }, [b, a], m)).toBe(a);
  });
  it('with no targets the cell under the press is returned (so the view can explain)', () => {
    expect(pick(c, [], m)).toBe(target);
  });
});

describe('path legs', () => {
  it('runs from centre to centre with the right angle', () => {
    const m = metricsFor(8, 340);
    const g = leg(7 * 8 + 0, 5 * 8 + 2, m);
    expect(g.len).toBeCloseTo(Math.SQRT2 * 2 * m.cell);
    expect(g.deg).toBeCloseTo(-45);
    expect(leg(0 * 8 + 1, 1 * 8 + 2, m).deg).toBeCloseTo(45);
  });
});

describe('keyboard cursor over the dark squares', () => {
  const n = 10;
  const at = (r: number, c: number): number => r * n + c;
  it('left and right jump to the next dark square in the row', () => {
    expect(nextCursor(at(9, 0), 'ArrowRight', n, 0)).toEqual({ i: at(9, 2), prefCol: 2 });
    expect(nextCursor(at(9, 2), 'ArrowLeft', n, 2)).toEqual({ i: at(9, 0), prefCol: 0 });
    expect(nextCursor(at(9, 0), 'ArrowLeft', n, 0).i).toBe(at(9, 0));
    expect(nextCursor(at(0, 9), 'ArrowRight', n, 9).i).toBe(at(0, 9));
  });
  it('up and down land on a dark square nearest the preferred column and never drift', () => {
    let i = at(9, 0);
    let pref = 0;
    const cols: number[] = [];
    for (let k = 0; k < 9; k++) {
      ({ i, prefCol: pref } = nextCursor(i, 'ArrowUp', n, pref));
      cols.push(i % n);
    }
    expect(i).toBeLessThan(n);
    expect(pref).toBe(0);
    expect(cols.every((c) => c <= 1)).toBe(true);
    // every square visited is dark
    expect(((i / n) | 0) + (i % n)).toSatisfy((x: number) => x % 2 === 1);
    expect(nextCursor(at(0, 1), 'ArrowUp', n, 1).i).toBe(at(0, 1));
    expect(nextCursor(at(9, 0), 'ArrowDown', n, 0).i).toBe(at(9, 0));
  });
  it('visits every dark square with the four arrows', () => {
    const seen = new Set<number>();
    const queue = [{ i: at(9, 0), p: 0 }];
    while (queue.length) {
      const cur = queue.pop() as { i: number; p: number };
      if (seen.has(cur.i)) continue;
      seen.add(cur.i);
      for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const) {
        const nx = nextCursor(cur.i, k, n, cur.i % n);
        if (!seen.has(nx.i)) queue.push({ i: nx.i, p: nx.prefCol });
      }
    }
    expect(seen.size).toBe(50);
  });
});
