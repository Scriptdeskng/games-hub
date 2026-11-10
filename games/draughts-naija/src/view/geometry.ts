/**
 * Board geometry in pixels (pure: no DOM). The board art is a square; the playing grid is inset by
 * the frame (14 of 340 units, `assets/draughts-art.css`). Coordinates here are relative to the
 * GRID (the same box `.dn-lines` covers), unless a name says `board`.
 */
export const FRAME_RATIO = 14 / 340;

export interface Metrics {
  n: number;
  /** side of the whole board, px */
  board: number;
  /** distance from the board edge to the grid, px */
  inset: number;
  /** side of one cell, px */
  cell: number;
}

export const metricsFor = (n: number, boardPx: number): Metrics => {
  const inset = boardPx * FRAME_RATIO;
  return { n, board: boardPx, inset, cell: (boardPx - 2 * inset) / n };
};

export interface Point {
  x: number;
  y: number;
}

/** Centre of square `i` in grid pixels. */
export const centreOf = (i: number, m: Metrics): Point => ({
  x: ((i % m.n) + 0.5) * m.cell,
  y: (Math.floor(i / m.n) + 0.5) * m.cell,
});

/** The cell under a grid point, or null outside the grid. */
export function cellAt(p: Point, m: Metrics): number | null {
  const c = Math.floor(p.x / m.cell);
  const r = Math.floor(p.y / m.cell);
  return c < 0 || r < 0 || c >= m.n || r >= m.n ? null : r * m.n + c;
}

/** Hit-slop: a finger covers more than a 31 px cell, so a tap is matched to nearby squares. */
export const HIT_SLOP = 22;

/**
 * The square a press at `p` means. `targets` are the squares that can be pressed right now (movable
 * pieces, destinations). A press that lands on a target is that target. Otherwise the NEAREST target
 * whose centre is within `slop` px wins. With no target near, the press means the cell under it
 * (so the view can still say "that piece cannot move"), or null outside the grid.
 */
export function pick(
  p: Point,
  targets: readonly number[],
  m: Metrics,
  slop = HIT_SLOP,
): number | null {
  const under = cellAt(p, m);
  if (under !== null && targets.includes(under)) return under;
  let best: number | null = null;
  let bestD = slop;
  for (const t of targets) {
    const c = centreOf(t, m);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best ?? under;
}

/** A path leg from square `a` to square `b`: start (grid px), length and angle in degrees. */
export function leg(
  a: number,
  b: number,
  m: Metrics,
): { x: number; y: number; len: number; deg: number } {
  const p = centreOf(a, m);
  const q = centreOf(b, m);
  return {
    x: p.x,
    y: p.y,
    len: Math.hypot(q.x - p.x, q.y - p.y),
    deg: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI,
  };
}

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

/**
 * Keyboard cursor over the dark squares. Left and right move along the row to the next dark square
 * (two columns); up and down move one row and land on the dark square nearest to `prefCol`, the
 * column the cursor was last steered to horizontally, so "up, up, up" climbs a straight line on
 * screen instead of drifting. Returns the new square and the preferred column to carry forward.
 */
export function nextCursor(
  i: number,
  key: ArrowKey,
  n: number,
  prefCol: number,
): { i: number; prefCol: number } {
  const r = Math.floor(i / n);
  const c = i % n;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const c2 = c + (key === 'ArrowRight' ? 2 : -2);
    return c2 < 0 || c2 >= n ? { i, prefCol } : { i: r * n + c2, prefCol: c2 };
  }
  const r2 = r + (key === 'ArrowDown' ? 1 : -1);
  if (r2 < 0 || r2 >= n) return { i, prefCol };
  const dark = (col: number): boolean => col >= 0 && col < n && ((r2 + col) & 1) === 1;
  const c2 = dark(prefCol) ? prefCol : dark(prefCol + 1) ? prefCol + 1 : prefCol - 1;
  return { i: r2 * n + c2, prefCol };
}
