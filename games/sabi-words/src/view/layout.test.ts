import { describe, expect, it } from 'vitest';
import { fitGrid, fitsBox } from '../rules';
import { isWide, playBox } from './layout';

describe('play layout', () => {
  it('wide screens put the list beside the grid', () => {
    expect(isWide(812, 375)).toBe(true);
    expect(isWide(1280, 800)).toBe(true);
    expect(isWide(360, 640)).toBe(false);
    expect(isWide(768, 1024)).toBe(false);
  });
  it('a 360x640 portrait phone holds 8, 10 and 12 grids at 26 px or more', () => {
    for (const [d, n] of [
      ['easy', 8],
      ['medium', 10],
      ['hard', 12],
    ] as const) {
      const b = playBox(360, 640, { easy: 6, medium: 8, hard: 10 }[d]);
      const f = fitGrid(d, b.w, b.h);
      expect(f.size).toBe(n);
      expect(f.cell).toBeGreaterThanOrEqual(26);
      expect(f.cell * f.size + 28).toBeLessThanOrEqual(b.w);
    }
  });
  it('a short landscape phone steps hard down to 10 but keeps medium', () => {
    const b = playBox(812, 375, 10);
    expect(fitGrid('hard', b.w, b.h).size).toBe(10);
    expect(fitGrid('medium', b.w, b.h).size).toBe(10);
  });
  it('desktop keeps 12 with big cells', () => {
    const b = playBox(1280, 800, 10);
    const f = fitGrid('hard', b.w, b.h);
    expect(f.size).toBe(12);
    expect(f.cell).toBeGreaterThanOrEqual(40);
  });
  it('a 12x12 round rotated to a short landscape phone no longer fits (the round pauses with a notice)', () => {
    const portrait = playBox(375, 812, 10);
    const landscape = playBox(812, 375, 10);
    expect(fitsBox(12, portrait.w, portrait.h)).toBe(true);
    expect(fitsBox(12, landscape.w, landscape.h)).toBe(false);
    expect(fitsBox(10, landscape.w, landscape.h)).toBe(true);
    expect(fitsBox(8, 100, 100)).toBe(true);
  });
});
