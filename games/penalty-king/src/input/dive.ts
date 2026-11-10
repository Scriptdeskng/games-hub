import { ZONES, type Zone } from '../physics';

/** The dive grid is 3 columns by 2 rows, in this order (row by row). */
export const GRID_COLS = 3;
export const GRID_ROWS = 2;
/** every dive button is at least this big (CSS px) */
export const MIN_BUTTON_PX = 44;
export const MIN_DIVE_SWIPE_PX = 28;

/** A swipe inside the dive grid: left / middle / right by angle, up or down by direction. Tiny swipes (taps) return null. */
export function swipeToZone(dx: number, dy: number): Zone | null {
  const len = Math.hypot(dx, dy);
  if (!(len >= MIN_DIVE_SWIPE_PX)) return null;
  const ax = dx / len;
  const ay = dy / len;
  const col = ax < -0.38 ? 0 : ax > 0.38 ? 2 : 1;
  const row = ay < -0.3 ? 0 : 1; // swiping up dives high; sideways and down dive low
  return ZONES[row * GRID_COLS + col] as Zone;
}

export type Arrow = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

/** Move the keyboard cursor on the 3 x 2 grid (it stops at the edges). */
export function moveZone(z: Zone, key: string): Zone {
  let i = ZONES.indexOf(z);
  if (i < 0) i = 1;
  let col = i % GRID_COLS;
  let row = Math.floor(i / GRID_COLS);
  if (key === 'ArrowLeft') col = Math.max(0, col - 1);
  else if (key === 'ArrowRight') col = Math.min(GRID_COLS - 1, col + 1);
  else if (key === 'ArrowUp') row = 0;
  else if (key === 'ArrowDown') row = GRID_ROWS - 1;
  return ZONES[row * GRID_COLS + col] as Zone;
}

/** The size in px of one dive cell for a grid `width` wide with the 3:1 aspect of the art (100 x ~50 at 310 px). */
export const cellSize = (width: number): { w: number; h: number } => ({
  w: width / GRID_COLS,
  h: width / 3 / GRID_ROWS,
});
