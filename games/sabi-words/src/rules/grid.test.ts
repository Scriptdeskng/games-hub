import { describe, expect, it } from 'vitest';
import { containsBlocked, mergeBlocklist, normalizeBlocklist, scanBlocked } from './blocklist';
import { DIFFICULTIES, DIRS, HIT_RADIUS, MIN_CELL_PX, PROFILES } from './config';
import { allLines, dirBetween, lineCells, runCells } from './grid';
import { fitGrid, hitCell } from './selection';
import { validateSabiWordPack } from '../content';
import { PACKS_ON_DISK, toyPack } from './fixtures';

describe('grid geometry', () => {
  it('runCells stays inside the grid in all eight directions', () => {
    for (const d of DIRS) {
      const cells = runCells(8, 3, 3, d.id, 3)!;
      expect(cells).toHaveLength(3);
    }
    expect(runCells(8, 0, 6, 'E', 3)).toBeNull();
    expect(runCells(8, 0, 0, 'NW', 2)).toBeNull();
  });
  it('lineCells accepts rows, columns and diagonals, both ways, and nothing else', () => {
    expect(lineCells(5, 0, 4)).toEqual([0, 1, 2, 3, 4]);
    expect(lineCells(5, 4, 0)).toEqual([4, 3, 2, 1, 0]);
    expect(lineCells(5, 0, 24)).toEqual([0, 6, 12, 18, 24]);
    expect(lineCells(5, 4, 20)).toEqual([4, 8, 12, 16, 20]);
    expect(lineCells(5, 0, 7)).toBeNull();
    expect(lineCells(5, 3, 3)).toBeNull();
    expect(dirBetween(5, 0, 24)).toBe('SE');
    expect(dirBetween(5, 24, 0)).toBe('NW');
    expect(dirBetween(5, 0, 7)).toBeNull();
    expect(dirBetween(5, 2, 2)).toBeNull();
  });
  it('allLines covers every row, column and diagonal exactly', () => {
    const n = 6;
    expect(allLines(n)).toHaveLength(n * 2 + (2 * n - 1) * 2);
  });
});

describe('profiles: difficulty raises the challenge', () => {
  it('size, words, clock, directions and word length all rise', () => {
    const [e, m, h] = DIFFICULTIES.map((d) => PROFILES[d]) as [
      typeof PROFILES.easy,
      typeof PROFILES.easy,
      typeof PROFILES.easy,
    ];
    expect([e.size, m.size, h.size]).toEqual([8, 10, 12]);
    expect([e.words, m.words, h.words]).toEqual([6, 8, 10]);
    expect([e.durationMs, m.durationMs, h.durationMs]).toEqual([180000, 240000, 300000]);
    expect([e.dirs.length, m.dirs.length, h.dirs.length]).toEqual([2, 6, 8]);
    expect(e.maxLen).toBeLessThan(m.maxLen);
    expect(m.maxLen).toBeLessThan(h.maxLen);
    expect(e.dirs).toEqual(['E', 'S']);
    expect(m.dirs).toContain('SE');
    expect(m.dirs).not.toContain('SW');
  });
});

describe('hit testing (0.4 x cell circle)', () => {
  it('centre hits, the cell corner does not, outside is null', () => {
    expect(hitCell(15, 15, 30, 8)).toBe(0);
    expect(hitCell(30 + 15, 15, 30, 8)).toBe(1);
    expect(hitCell(1, 1, 30, 8)).toBeNull();
    expect(hitCell(15 + HIT_RADIUS * 30 - 0.5, 15, 30, 8)).toBe(0);
    expect(hitCell(15 + HIT_RADIUS * 30 + 0.5, 15, 30, 8)).toBeNull();
    expect(hitCell(-5, 10, 30, 8)).toBeNull();
    expect(hitCell(240, 10, 30, 8)).toBeNull();
  });
});

describe('fitGrid', () => {
  it('portrait 360 keeps 8, 10 and 12 with cells of at least 26 px', () => {
    expect(fitGrid('easy', 344, 460)).toEqual({ size: 8, cell: 39 });
    expect(fitGrid('medium', 344, 460).size).toBe(10);
    const h = fitGrid('hard', 344, 460);
    expect(h.size).toBe(12);
    expect(h.cell).toBeGreaterThanOrEqual(MIN_CELL_PX);
  });
  it('steps a 12x12 down to 10 (then 8) when its cell would be under 26 px', () => {
    expect(fitGrid('hard', 344, 300).size).toBe(10);
    expect(fitGrid('hard', 344, 250).size).toBe(8);
    expect(fitGrid('hard', 100, 100).size).toBe(8);
    expect(fitGrid('hard', 100, 100).cell).toBeGreaterThanOrEqual(16);
  });
  it('caps big screens at 44 px cells', () => {
    expect(fitGrid('easy', 1200, 900).cell).toBe(44);
  });
});

describe('blocklist helpers', () => {
  it('normalizes and merges with the built-in list in both directions', () => {
    expect(normalizeBlocklist(['abc', 'a-b', 'XY', 'Abc'])).toEqual(['ABC']);
    expect(normalizeBlocklist(undefined)).toEqual([]);
    const b = mergeBlocklist(['QQQW']);
    expect(containsBlocked('XXWQQQ', b)).toBe(true);
    expect(containsBlocked('XQQQWX', b)).toBe(true);
    expect(containsBlocked('XXFUCKXX', b)).toBe(true);
    expect(containsBlocked('XXKCUFXX', b)).toBe(true);
    expect(containsBlocked('LAGOS', b)).toBe(false);
  });
  it('scanBlocked sees rows, columns and both diagonals', () => {
    const b = mergeBlocklist(['QQQ']);
    const g = (cells: Record<number, string>): string =>
      Array.from({ length: 25 }, (_, i) => cells[i] ?? 'A').join('');
    expect(scanBlocked(g({ 5: 'Q', 6: 'Q', 7: 'Q' }), 5, b)).toHaveLength(1);
    expect(scanBlocked(g({ 1: 'Q', 6: 'Q', 11: 'Q' }), 5, b)).toHaveLength(1);
    expect(scanBlocked(g({ 0: 'Q', 6: 'Q', 12: 'Q' }), 5, b)).toHaveLength(1);
    expect(scanBlocked(g({ 4: 'Q', 8: 'Q', 12: 'Q' }), 5, b)).toHaveLength(1);
    expect(scanBlocked(g({}), 5, b)).toEqual([]);
  });
});

describe('pack validation', () => {
  it('accepts every shipped pack', () => {
    for (const p of PACKS_ON_DISK) expect(validateSabiWordPack(p).ok, p.id).toBe(true);
  });
  it('rejects malformed packs', () => {
    expect(validateSabiWordPack(null).ok).toBe(false);
    expect(validateSabiWordPack({ version: 1 }).ok).toBe(false);
    expect(validateSabiWordPack(toyPack(['LAGOS'])).ok).toBe(false);
    const words = Array.from(
      { length: 12 },
      (_, i) => 'ABCDEFGHIJKL'.slice(0, 3) + 'XYZ'.repeat(1) + i,
    );
    expect(validateSabiWordPack(toyPack(words)).ok).toBe(false);
    const ok = [
      'LAGOS',
      'ABUJA',
      'KANO',
      'ENUGU',
      'OYO',
      'EDO',
      'OSUN',
      'ONDO',
      'BENUE',
      'YOBE',
      'ABIA',
      'IMO',
    ];
    expect(validateSabiWordPack(toyPack(ok)).ok).toBe(true);
    expect(validateSabiWordPack(toyPack([...ok.slice(0, 11), 'TOOLONGWORDXYZ'])).ok).toBe(false);
    expect(validateSabiWordPack(toyPack([...ok.slice(0, 11), 'AB'])).ok).toBe(false);
    expect(validateSabiWordPack(toyPack(ok, ['LAGOS'])).ok).toBe(false);
  });
});
