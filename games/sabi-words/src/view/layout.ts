/** Room the play screen leaves for the grid, from the viewport. Must agree with style.css. */
export interface Box {
  w: number;
  h: number;
}

/** CSS: `@media (min-aspect-ratio: 6/5)` puts the word list beside the grid. */
export const isWide = (vw: number, vh: number): boolean => vw >= vh * 1.2;

// Portrait stack, top to bottom (px): padding, HUD, gap, BOARD, gap, word slip, gap, note line, padding.
const TOP = 6;
const HUD_PX = 48;
const GAP = 6;
const SLIP_PAD = 24;
const ROW_PX = 30;
const NOTE_GAP = 4;
/** the line where Osas speaks (3 s) and the hint clue stays: never over the word slip */
export const NOTE_PX = 40;
const BOTTOM = 6;
/** the play screen's left and right padding together */
const SIDE_PX = 16;

/** Rows the word slip may need: pills are about half a row wide, so words / 2 is the safe estimate. */
export const slipRows = (words: number): number => Math.ceil(words / 2);

export function playBox(vw: number, vh: number, words: number): Box {
  if (isWide(vw, vh)) return { w: Math.floor(vw * 0.56), h: vh - TOP - HUD_PX - GAP - BOTTOM };
  const slip = slipRows(words) * ROW_PX + SLIP_PAD;
  return {
    w: Math.min(vw, 520) - SIDE_PX,
    h: vh - (TOP + HUD_PX + GAP + GAP + slip + NOTE_GAP + NOTE_PX + BOTTOM),
  };
}

export const viewportBox = (words: number): Box =>
  playBox(window.innerWidth, window.innerHeight, words);
