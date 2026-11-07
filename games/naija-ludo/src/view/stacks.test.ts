import { describe, expect, it } from 'vitest';
import { layoutStacks, type SeedRef } from './stacks';

const seed = (key: string, slot: number, progress: number): SeedRef => ({ key, slot, progress });

describe('stack layout', () => {
  it('a lone seed sits in the middle at full size with no badge', () => {
    const p = layoutStacks([seed('a', 0, 5)]).get('a');
    expect(p).toEqual({ dx: 0, dy: 0, scale: 1, badge: 0 });
  });

  it('seeds in the yard or home never stack', () => {
    const m = layoutStacks([
      seed('a', 0, -1),
      seed('b', 0, -1),
      seed('c', 0, 56),
      seed('d', 0, 56),
    ]);
    for (const k of ['a', 'b', 'c', 'd'])
      expect(m.get(k)).toEqual({ dx: 0, dy: 0, scale: 1, badge: 0 });
  });

  it('a same-colour stack fans out and the top seed carries the count', () => {
    const m = layoutStacks([seed('a', 0, 5), seed('b', 0, 5), seed('c', 0, 5)]);
    expect(m.get('a')!.badge).toBe(0);
    expect(m.get('b')!.badge).toBe(0);
    expect(m.get('c')!.badge).toBe(3);
    expect(m.get('a')!.dx).toBeLessThan(m.get('c')!.dx);
    expect(m.get('a')!.dy).toBeGreaterThan(m.get('c')!.dy);
    expect(m.get('a')!.scale).toBe(1);
  });

  it('different colours on one square take their own quadrants at a smaller scale', () => {
    // progress 13 of slot 0 and progress 0 of slot 1 are the same square (slot 1 start)
    const m = layoutStacks([seed('a', 0, 13), seed('b', 1, 0), seed('c', 1, 0)]);
    const a = m.get('a')!;
    const b = m.get('b')!;
    expect(a.scale).toBeLessThan(1);
    expect([a.dx, a.dy]).not.toEqual([b.dx, b.dy]);
    expect(m.get('c')!.badge).toBe(2);
    expect(a.badge).toBe(0);
    for (const p of m.values()) {
      expect(Math.abs(p.dx)).toBeLessThan(0.4);
      expect(Math.abs(p.dy)).toBeLessThan(0.4);
    }
  });

  it('badges cap at 4 (the art has 2, 3 and 4)', () => {
    const m = layoutStacks([0, 1, 2, 3, 4].map((i) => seed(`s${i}`, 0, 7)));
    expect(m.get('s4')!.badge).toBe(4);
  });
});
