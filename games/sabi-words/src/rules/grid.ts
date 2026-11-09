import { DIRS, type DirId } from './config';

/** Geometry of a square grid stored as one string, row-major (cell = r * n + c). */
export const dirOf = (id: DirId): (typeof DIRS)[number] =>
  DIRS.find((d) => d.id === id) as (typeof DIRS)[number];

export const cellIndex = (n: number, r: number, c: number): number => r * n + c;
export const rowOf = (n: number, i: number): number => Math.floor(i / n);
export const colOf = (n: number, i: number): number => i % n;

/** Cells of a straight run of `len` letters from (r, c) in a direction, or null if it leaves the grid. */
export function runCells(
  n: number,
  r: number,
  c: number,
  dir: DirId,
  len: number,
): number[] | null {
  const d = dirOf(dir);
  const er = r + d.dr * (len - 1);
  const ec = c + d.dc * (len - 1);
  if (r < 0 || c < 0 || r >= n || c >= n || er < 0 || ec < 0 || er >= n || ec >= n) return null;
  const out: number[] = [];
  for (let k = 0; k < len; k++) out.push(cellIndex(n, r + d.dr * k, c + d.dc * k));
  return out;
}

/**
 * The cells of the straight line between two cells (inclusive), or null when they are the same
 * cell or not on one row, column or diagonal. A player's swipe is judged by this.
 */
export function lineCells(n: number, from: number, to: number): number[] | null {
  if (from === to) return null;
  const r0 = rowOf(n, from);
  const c0 = colOf(n, from);
  const dr = rowOf(n, to) - r0;
  const dc = colOf(n, to) - c0;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const out: number[] = [];
  for (let k = 0; k <= steps; k++) out.push(cellIndex(n, r0 + sr * k, c0 + sc * k));
  return out;
}

/** Direction id of a line given by two cells, or null if they are not in line. */
export function dirBetween(n: number, from: number, to: number): DirId | null {
  if (from === to) return null;
  const dr = Math.sign(rowOf(n, to) - rowOf(n, from));
  const dc = Math.sign(colOf(n, to) - colOf(n, from));
  if (lineCells(n, from, to) === null) return null;
  return (DIRS.find((d) => d.dr === dr && d.dc === dc) as (typeof DIRS)[number]).id;
}

/** Every line of the grid as a list of cells: rows, columns, both diagonal families. */
export function allLines(n: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < n; r++) lines.push(runCells(n, r, 0, 'E', n) as number[]);
  for (let c = 0; c < n; c++) lines.push(runCells(n, 0, c, 'S', n) as number[]);
  for (let c = 0; c < n; c++) lines.push(runCells(n, 0, c, 'SE', n - c) as number[]);
  for (let r = 1; r < n; r++) lines.push(runCells(n, r, 0, 'SE', n - r) as number[]);
  for (let c = 0; c < n; c++) lines.push(runCells(n, n - 1, c, 'NE', n - c) as number[]);
  for (let r = n - 2; r >= 0; r--) lines.push(runCells(n, r, 0, 'NE', r + 1) as number[]);
  return lines;
}

export const reverse = (s: string): string => [...s].reverse().join('');
