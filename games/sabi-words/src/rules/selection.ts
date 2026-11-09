import { HIT_RADIUS, MAX_CELL_PX, MIN_CELL_PX, PROFILES, type Difficulty } from './config';

/**
 * Which cell is the pointer on? Only a point within HIT_RADIUS x cell of a tile centre counts:
 * the corners of a cell, where a diagonal swipe passes between two tiles, hit nothing. `x` and `y`
 * are relative to the grid's top-left corner; every cell is `cell` px square.
 */
export function hitCell(x: number, y: number, cell: number, n: number): number | null {
  const c = Math.floor(x / cell);
  const r = Math.floor(y / cell);
  if (r < 0 || c < 0 || r >= n || c >= n) return null;
  const dx = x - (c + 0.5) * cell;
  const dy = y - (r + 0.5) * cell;
  return dx * dx + dy * dy <= (HIT_RADIUS * cell) ** 2 ? r * n + c : null;
}

export interface Fit {
  size: number;
  cell: number;
}

/** px around the grid inside the board frame (14 on each side). */
export const FRAME_PX = 28;

/**
 * The grid size and cell width that fit a box. Starts at the level's own size and steps down by two
 * (12 -> 10 -> 8) while the cell would be under MIN_CELL_PX, so a letter never gets tiny; never
 * below 8 (every level's words fit an 8x8). Cells are capped at MAX_CELL_PX.
 */
export function fitGrid(difficulty: Difficulty, boxW: number, boxH: number): Fit {
  let size = PROFILES[difficulty].size;
  while (size > 8 && rawCell(size, boxW, boxH) < MIN_CELL_PX) size -= 2;
  return { size, cell: cellFor(size, boxW, boxH) };
}

/** Does an n x n grid get cells of at least MIN_CELL_PX in this box? (false after a rotation to a tight screen) */
export const fitsBox = (n: number, boxW: number, boxH: number): boolean =>
  n <= 8 || rawCell(n, boxW, boxH) >= MIN_CELL_PX;

const rawCell = (n: number, boxW: number, boxH: number): number =>
  Math.floor(Math.min((boxW - FRAME_PX) / n, (boxH - FRAME_PX) / n, MAX_CELL_PX));

/** Cell width for an already chosen grid size (after a resize or rotation): 16 to 44 px. */
export const cellFor = (n: number, boxW: number, boxH: number): number =>
  Math.max(16, rawCell(n, boxW, boxH) || 16);
