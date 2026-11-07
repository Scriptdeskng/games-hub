import { ARM, HOME, LAST_TRACK, TRACK_SIZE, YARD } from '../rules/config';

/**
 * Board geometry for assets/board/board.svg (15x15 cells, docs/assets/naija-ludo-brief.md section 3).
 * Pure data: cell units, (col, row), 0-based from the top-left. A seed element is exactly one cell
 * big, so `translate(x*100%, y*100%)` puts it on cell (x, y) at any board size.
 */
export interface Cell {
  x: number;
  y: number;
}

const range = (a: number, b: number): number[] => {
  const out: number[] = [];
  const step = a <= b ? 1 : -1;
  for (let i = a; i !== b + step; i += step) out.push(i);
  return out;
};

/** The 52 track cells clockwise, in the brief's order (index 0 = (0,6)). */
export const BOARD_TRACK: readonly Cell[] = [
  ...range(0, 5).map((x) => ({ x, y: 6 })),
  ...range(5, 0).map((y) => ({ x: 6, y })),
  { x: 7, y: 0 },
  ...range(0, 5).map((y) => ({ x: 8, y })),
  ...range(9, 14).map((x) => ({ x, y: 6 })),
  { x: 14, y: 7 },
  ...range(14, 9).map((x) => ({ x, y: 8 })),
  ...range(9, 14).map((y) => ({ x: 8, y })),
  { x: 7, y: 14 },
  ...range(14, 9).map((y) => ({ x: 6, y })),
  ...range(5, 0).map((x) => ({ x, y: 8 })),
  { x: 0, y: 7 },
];

/** Board index of colour slot 0's start square (6,13). Slots follow every 13 squares. */
const SLOT0_START = 40;

/** Track square `idx` (the rules' index: slot 0's start is 0) as a cell. */
export const trackCell = (idx: number): Cell =>
  BOARD_TRACK[(SLOT0_START + idx) % TRACK_SIZE] as Cell;

/** Home column cells per slot, in order of travel (progress 51..55); `HOME` itself is the centre. */
const COLUMNS: readonly (readonly Cell[])[] = [
  range(13, 9).map((y) => ({ x: 7, y })), // slot 0 bottom-left yard: up column 7
  range(1, 5).map((x) => ({ x, y: 7 })), // slot 1 top-left: along row 7
  range(1, 5).map((y) => ({ x: 7, y })), // slot 2 top-right: down column 7
  range(13, 9).map((x) => ({ x, y: 7 })), // slot 3 bottom-right: along row 7
];

/** Yard origins (cell) per slot: BL, TL, TR, BR. */
const YARD_ORIGIN: readonly Cell[] = [
  { x: 0, y: 9 },
  { x: 0, y: 0 },
  { x: 9, y: 0 },
  { x: 9, y: 9 },
];
/** Pit centres inside a yard, in cells from the yard origin (assets: 200/400 units). */
const PITS: readonly Cell[] = [
  { x: 2, y: 2 },
  { x: 4, y: 2 },
  { x: 2, y: 4 },
  { x: 4, y: 4 },
];

/** Centre-triangle direction per slot (which side of the middle 3x3 it points from). */
const HOME_SPOT: readonly Cell[] = [
  { x: 0, y: 1 }, // slot 0: bottom triangle
  { x: -1, y: 0 }, // slot 1: left
  { x: 0, y: -1 }, // slot 2: top
  { x: 1, y: 0 }, // slot 3: right
];

/** Quick mode (2 seeds) uses pits 0 and 3 (the diagonal); classic uses all four. */
export const pitIndex = (seed: number, seeds: number): number =>
  seeds === 2 && seed === 1 ? 3 : seed;

/** Centre of a seed's yard pit, in cell units. */
export function yardCentre(slot: number, seed: number, seeds: number): Cell {
  const o = YARD_ORIGIN[slot] as Cell;
  const p = PITS[pitIndex(seed, seeds)] as Cell;
  return { x: o.x + p.x, y: o.y + p.y };
}

/** Where a seed that is home waits: in its centre triangle, spread along the triangle's base. */
export function homeCentre(slot: number, seed: number, seeds: number): Cell {
  const d = HOME_SPOT[slot] as Cell;
  const spread = (seed - (seeds - 1) / 2) * 0.34;
  return {
    x: 7.5 + d.x * 0.75 + (d.y !== 0 ? spread : 0),
    y: 7.5 + d.y * 0.75 + (d.x !== 0 ? spread : 0),
  };
}

/** Centre of the cell a seed stands on, in cell units. */
export function seedCentre(slot: number, progress: number, seed: number, seeds: number): Cell {
  if (progress === YARD) return yardCentre(slot, seed, seeds);
  if (progress >= HOME) return homeCentre(slot, seed, seeds);
  if (progress > LAST_TRACK) {
    const c = (COLUMNS[slot] as readonly Cell[])[progress - LAST_TRACK - 1] as Cell;
    return { x: c.x + 0.5, y: c.y + 0.5 };
  }
  const c = trackCell((ARM * slot + progress) % TRACK_SIZE);
  return { x: c.x + 0.5, y: c.y + 0.5 };
}

/** Top-left of the one-cell element that centres on `c`. */
export const topLeft = (c: Cell): Cell => ({ x: c.x - 0.5, y: c.y - 0.5 });

/** Key of the shared square a seed stands on ('t12', 'c1-3', 'h1' ...), or null in the yard. */
export function squareKey(slot: number, progress: number): string | null {
  if (progress === YARD) return null;
  if (progress >= HOME) return `h${slot}`;
  if (progress > LAST_TRACK) return `c${slot}-${progress}`;
  return `t${(ARM * slot + progress) % TRACK_SIZE}`;
}
