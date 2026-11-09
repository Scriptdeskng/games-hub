/** Room the play screen leaves for the grid, from the viewport. Must agree with the CSS media query. */
export interface Box {
  w: number;
  h: number;
}

/** CSS: `@media (min-aspect-ratio: 6/5)` puts the word list beside the grid. */
export const isWide = (vw: number, vh: number): boolean => vw >= vh * 1.2;

const HUD_PX = 56;
const PAD_PX = 32;
/** the play screen's left and right padding together */
const SIDE_PX = 16;
const ROW_PX = 34;

export function playBox(vw: number, vh: number, words: number): Box {
  if (isWide(vw, vh)) return { w: Math.floor(vw * 0.56), h: vh - HUD_PX - PAD_PX / 2 - 8 };
  const rows = Math.ceil(words / 3);
  return {
    w: Math.min(vw, 520) - SIDE_PX,
    h: vh - HUD_PX - PAD_PX - (rows * ROW_PX + 34),
  };
}

export const viewportBox = (words: number): Box =>
  playBox(window.innerWidth, window.innerHeight, words);
