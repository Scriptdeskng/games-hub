import { startRows, type Size } from './config';

/**
 * Board model: a flat array of `size * size` cells, index = row * size + col, row 0 on top.
 * Only dark squares ((row + col) odd) ever hold a piece.
 * Cell values: 0 empty, 1 light man, 2 light king, -1 dark man, -2 dark king.
 */
export type Side = 0 | 1;
export const LIGHT: Side = 0;
export const DARK: Side = 1;
export const other = (s: Side): Side => (s === LIGHT ? DARK : LIGHT);

export const LIGHT_MAN = 1;
export const LIGHT_KING = 2;
export const DARK_MAN = -1;
export const DARK_KING = -2;

export type Cells = ArrayLike<number>;

export const rowOf = (i: number, n: number): number => Math.floor(i / n);
export const colOf = (i: number, n: number): number => i % n;
export const isDarkSquare = (r: number, c: number): boolean => ((r + c) & 1) === 1;
export const isDarkIndex = (i: number, n: number): boolean =>
  isDarkSquare(rowOf(i, n), colOf(i, n));

/** The side a piece belongs to (the cell must not be empty). */
export const sideOf = (v: number): Side => (v > 0 ? LIGHT : DARK);
export const isKing = (v: number): boolean => v === LIGHT_KING || v === DARK_KING;
export const kingOf = (side: Side): number => (side === LIGHT ? LIGHT_KING : DARK_KING);
/** The row where a man of `side` is crowned. */
export const crownRow = (side: Side, n: number): number => (side === LIGHT ? 0 : n - 1);
/** Row direction a man of `side` advances in (light goes up the screen). */
export const forward = (side: Side): number => (side === LIGHT ? -1 : 1);

export function initialBoard(size: Size): number[] {
  const board = new Array<number>(size * size).fill(0);
  const rows = startRows(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isDarkSquare(r, c)) continue;
      if (r < rows) board[r * size + c] = DARK_MAN;
      else if (r >= size - rows) board[r * size + c] = LIGHT_MAN;
    }
  }
  return board;
}

export interface Counts {
  /** men and kings per side: [light, dark] */
  men: [number, number];
  kings: [number, number];
}

export function countPieces(board: Cells): Counts {
  const men: [number, number] = [0, 0];
  const kings: [number, number] = [0, 0];
  for (let i = 0; i < board.length; i++) {
    const v = board[i] as number;
    if (v === 0) continue;
    (isKing(v) ? kings : men)[sideOf(v)]++;
  }
  return { men, kings };
}

/** Column letter + row number from the bottom, e.g. "a1" is the bottom-left square. */
export const squareName = (i: number, n: number): string =>
  `${String.fromCharCode(97 + colOf(i, n))}${n - rowOf(i, n)}`;

/** One character per dark square: a compact, serialisable position key (side to move included). */
export function positionKey(board: Cells, turn: Side): string {
  let s = turn === LIGHT ? 'l' : 'd';
  for (let i = 0; i < board.length; i++) {
    const v = board[i] as number;
    s += v === 0 ? '.' : v === 1 ? 'w' : v === 2 ? 'W' : v === -1 ? 'b' : 'B';
  }
  return s;
}

/**
 * Parse a test or puzzle diagram: one string per row (row 0 first), `.` empty, `w` `W` light man and
 * king, `b` `B` dark man and king. Spaces are ignored, so `". w . w"` works.
 */
export function parseBoard(rows: readonly string[]): number[] {
  const n = rows.length;
  const board = new Array<number>(n * n).fill(0);
  rows.forEach((line, r) => {
    const cells = line.replace(/\s+/g, '');
    if (cells.length !== n) throw new Error(`row ${r}: expected ${n} cells, got ${cells.length}`);
    for (let c = 0; c < n; c++) {
      const v = { '.': 0, w: 1, W: 2, b: -1, B: -2 }[cells[c] as string];
      if (v === undefined) throw new Error(`row ${r}: bad cell "${cells[c]}"`);
      if (v !== 0 && !isDarkSquare(r, c))
        throw new Error(`row ${r} col ${c}: piece on a light square`);
      board[r * n + c] = v;
    }
  });
  return board;
}
