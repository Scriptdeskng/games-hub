/** Slot positions on the 360 x 420 bracket art (assets/geometry.json "bracket"; a test keeps the two in step). */
export const BRACKET = {
  w: 360,
  h: 420,
  slotW: 82,
  slotH: 34,
  cols: [4, 106, 208],
  rows: [
    [51, 97, 143, 189, 235, 281, 327, 373],
    [74, 166, 258, 350],
    [120, 304],
  ],
  /** the winner well: where the trophy goes */
  well: { x: 304, y: 178, w: 52, h: 68 },
} as const;

/** x and y (art units) of slot `index` in round `round` (0 quarter-final, 1 semi-final, 2 final). */
export const slotPos = (round: 0 | 1 | 2, index: number): { x: number; y: number } => ({
  x: BRACKET.cols[round] as number,
  y: (BRACKET.rows[round] as readonly number[])[index] as number,
});
