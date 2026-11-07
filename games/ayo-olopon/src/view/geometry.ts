import raw from '../../assets/board/layout.json';
import { PITS } from '../rules/config';

/**
 * The board geometry contract of the asset brief (section 3), read from assets/board/layout.json.
 * All numbers here are percentages of the board box or board SVG units. Pure functions: no DOM.
 */
export type LayoutName = 'landscape' | 'portrait';
export type Who = 'human' | 'cpu';

export interface PitSpot {
  /** pit centre, percent of the board box */
  x: number;
  y: number;
  /** count chip centre, percent of the board box */
  chipX: number;
  chipY: number;
}

export interface TraySpot {
  /** tray rectangle, percent of the board box */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the 48 seed slots, percent of the TRAY box (centres) */
  slots: { x: number; y: number }[];
}

export interface Layout {
  name: LayoutName;
  file: string;
  /** board SVG size in units */
  w: number;
  h: number;
  /** pit diameter and state-overlay size, percent of the board width */
  pitD: number;
  overlay: number;
  pits: PitSpot[];
  trays: Record<Who, TraySpot>;
}

interface RawPit {
  xPct: string;
  yPct: string;
  chip: { xPct: string; yPct: string };
}
interface RawTray {
  x: number;
  y: number;
  w: number;
  h: number;
  xPct: string;
  yPct: string;
  wPct: string;
  hPct: string;
  slots: string[][];
}
interface RawLayout {
  file: string;
  viewBox: number[];
  pitDiameterPct: string;
  overlaySizePct: string;
  pits: RawPit[];
  trays: { human: RawTray; opponent: RawTray };
}

const tray = (t: RawTray): TraySpot => ({
  x: Number(t.xPct),
  y: Number(t.yPct),
  w: Number(t.wPct),
  h: Number(t.hPct),
  slots: t.slots.map(([sx, sy]) => ({
    x: ((Number(sx) - t.x) / t.w) * 100,
    y: ((Number(sy) - t.y) / t.h) * 100,
  })),
});

const build = (name: LayoutName, r: RawLayout): Layout => ({
  name,
  file: r.file,
  w: r.viewBox[0] as number,
  h: r.viewBox[1] as number,
  pitD: Number(r.pitDiameterPct),
  overlay: Number(r.overlaySizePct),
  pits: r.pits.map((p) => ({
    x: Number(p.xPct),
    y: Number(p.yPct),
    chipX: Number(p.chip.xPct),
    chipY: Number(p.chip.yPct),
  })),
  trays: { human: tray(r.trays.human), cpu: tray(r.trays.opponent) },
});

export const LAYOUTS: Readonly<Record<LayoutName, Layout>> = {
  landscape: build('landscape', raw.landscape as unknown as RawLayout),
  portrait: build('portrait', raw.portrait as unknown as RawLayout),
};

/** pit radius in board units */
export const PIT_RADIUS = raw.pitRadius;
const GOLDEN = 2.39996;
const RADIUS_FRAC = raw.seedLayout.radiusFrac;
/** seed size in board units by pit count: [up to this many seeds, size] */
const SIZES: readonly (readonly [number, number])[] = raw.seedLayout.sizeByCount as [
  number,
  number,
][];

/** Which board fits better: whichever scales larger inside w x h (a tie goes to landscape). */
export function pickLayout(w: number, h: number): LayoutName {
  const scale = (l: Layout): number => Math.min(w / l.w, h / l.h);
  return scale(LAYOUTS.portrait) > scale(LAYOUTS.landscape) ? 'portrait' : 'landscape';
}

/** Largest board of this layout that fits w x h, in CSS pixels. */
export function fitBoard(name: LayoutName, w: number, h: number): { w: number; h: number } {
  const l = LAYOUTS[name];
  const s = Math.max(0, Math.min(w / l.w, h / l.h));
  return { w: Math.floor(l.w * s), h: Math.floor(l.h * s) };
}

/** Pixel size of one pit tap target on a board `boardW` px wide. */
export const pitPx = (name: LayoutName, boardW: number): number =>
  (boardW * LAYOUTS[name].pitD) / 100;

/** Seed size in board units for a pit holding `n` seeds. */
export const seedSize = (n: number): number => {
  for (const [upTo, size] of SIZES) if (n <= upTo) return size;
  return (SIZES[SIZES.length - 1] as readonly [number, number])[1];
};

/** The small deterministic wobble of seed k in a pit (radians): seeds never sit in a perfect spiral. */
const jitter = (pit: number, k: number): number => (((pit * 131 + k * 37) % 17) - 8) * 0.02;

/**
 * Where seed `k` of `n` lies in a pit, as percent of the pit box (the box is one pit diameter wide:
 * 132 board units), centre-based. `size` is the seed width in percent of the same box.
 */
export function seedSpot(
  pit: number,
  k: number,
  n: number,
): { x: number; y: number; size: number } {
  const r = PIT_RADIUS * RADIUS_FRAC * Math.sqrt((k + 0.5) / n);
  const a = k * GOLDEN + jitter(pit, k);
  const box = PIT_RADIUS * 2;
  return {
    x: 50 + ((r * Math.cos(a)) / box) * 100,
    y: 50 + ((r * Math.sin(a)) / box) * 100,
    size: (seedSize(n) / box) * 100,
  };
}

/** Cosmetic seed picture: (pit * 7 + k) % 6 -> 0,1,2 seed-a; 3 seed-b; 4 seed-c; 5 seed-d. */
export const seedVariant = (pit: number, k: number): 'a' | 'b' | 'c' | 'd' => {
  const v = (pit * 7 + k) % 6;
  return v <= 2 ? 'a' : v === 3 ? 'b' : v === 4 ? 'c' : 'd';
};

/** Seed size in a tray, as percent of the tray width. */
export const traySeedSize = (name: LayoutName, who: Who): number => {
  const l = LAYOUTS[name];
  const unitsW = (l.trays[who].w / 100) * l.w;
  return (raw.landscape.trays.human.seedSize / unitsW) * 100;
};

/** Which pit a 1-based number key picks, and back (pits are numbered in sowing order). */
export const pitOfKey = (n: number): number => n - 1;
export const keyOfPit = (pit: number): number => pit + 1;

export const HUMAN_PITS: readonly number[] = [0, 1, 2, 3, 4, 5];
export const ALL_PITS: readonly number[] = Array.from({ length: PITS }, (_, i) => i);
