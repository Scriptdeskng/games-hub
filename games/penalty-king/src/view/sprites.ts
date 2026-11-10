import { GOAL_SPRITE, depthScale, type Layout } from './geometry';
import type { TeamId } from '../rules/teams';

export type Cv = HTMLCanvasElement;
export type KeeperSkin = 'dark' | 'mid' | 'light';

/** Art the canvas loads by name (literal paths, so the build checks that they ship; assets/ship.json). */
export const URLS = {
  goalBack: './assets/goal/goal-back.svg',
  goalFront: './assets/goal/goal-front.svg',
  goalWood: './assets/goal/goal-front-wood.svg',
  ball: './assets/ball/ball.svg',
  shadow: './assets/ball/ball-shadow.svg',
} as const;
export const KEEPER_URLS: Readonly<Record<KeeperSkin, string>> = {
  dark: './assets/keeper/keeper-dark.svg',
  mid: './assets/keeper/keeper-mid.svg',
  light: './assets/keeper/keeper-light.svg',
};
export const strikerUrl = (team: TeamId): string => `./assets/striker/striker-${team}.svg`;

/** One decoded image, or null if it failed to load: the game then draws a plain shape instead (it never stops). */
export type Img = HTMLImageElement | null;

export function loadImage(url: string): Promise<Img> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The decoded art for one match. Kept across resizes; only the pixel caches below are rebuilt. */
export interface Art {
  goalBack: Img;
  goalFront: Img;
  ball: Img;
  shadow: Img;
  /** the keeper in the goal when you strike, and the one when you keep */
  keeperCpu: Img;
  keeperYou: Img;
  strikerYou: Img;
  strikerCpu: Img;
}

export async function loadArt(o: {
  wood: boolean;
  cpuKeeper: KeeperSkin;
  youKeeper: KeeperSkin;
  you: TeamId;
  cpu: TeamId;
}): Promise<Art> {
  const [goalBack, goalFront, ball, shadow, keeperCpu, keeperYou, strikerYou, strikerCpu] =
    await Promise.all([
      loadImage(URLS.goalBack),
      loadImage(o.wood ? URLS.goalWood : URLS.goalFront),
      loadImage(URLS.ball),
      loadImage(URLS.shadow),
      loadImage(KEEPER_URLS[o.cpuKeeper]),
      loadImage(KEEPER_URLS[o.youKeeper]),
      loadImage(strikerUrl(o.you)),
      loadImage(strikerUrl(o.cpu)),
    ]);
  return { goalBack, goalFront, ball, shadow, keeperCpu, keeperYou, strikerYou, strikerCpu };
}

/** A 3 x 3 sheet drawn once at the target cell size. */
export interface Sheet {
  cv: Cv;
  /** device px of one cell */
  cell: number;
}

/** Pixel caches for one layout. Rebuilt on resize; never touched per frame. */
export interface Sprites {
  goalBack: Cv | null;
  goalFront: Cv | null;
  shadow: Cv | null;
  /** the ball at a few diameters (device px), smallest first: a frame blits the nearest, with no scaling */
  ball: { d: number; cv: Cv }[];
  keeperCpu: Sheet | null;
  keeperYou: Sheet | null;
  strikerYou: Sheet | null;
  strikerCpu: Sheet | null;
}

const MAX_CELL = 256;
const BALL_STEPS = 7;
/** figure heights: about 100 of the 128 px of a cell is the 1.9 m keeper / 1.8 m striker */
export const KEEPER_PX_PER_M = 53.5;
export const STRIKER_PX_PER_M = 55.6;

const canvas = (w: number, h: number): Cv | null => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c.getContext('2d') ? c : null;
};

function raster(img: Img, w: number, h: number): Cv | null {
  if (!img) return null;
  const c = canvas(w, h);
  c?.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function sheet(img: Img, cell: number): Sheet | null {
  const c = raster(img, cell * 3, cell * 3);
  return c ? { cv: c, cell: Math.round(cell) } : null;
}

export function ballDiameters(l: Layout): number[] {
  const lo = 0.22 * l.upm * depthScale(l, 1.3) * l.scale * l.dpr;
  const hi = 0.22 * l.upm * depthScale(l, 0) * l.scale * l.dpr;
  return Array.from({ length: BALL_STEPS }, (_, i) =>
    Math.max(4, Math.round(lo * Math.pow(hi / lo, i / (BALL_STEPS - 1)))),
  );
}

/** Draw every sprite once at the size this layout needs (device pixels). */
export function buildSprites(art: Art, l: Layout): Sprites {
  const px = l.scale * l.dpr;
  const gs = l.spec.goalSpriteScale * px;
  const keeperCell = Math.min(MAX_CELL, 128 * (l.upm / KEEPER_PX_PER_M) * px);
  const strikerCell = Math.min(
    MAX_CELL,
    128 * ((l.upm * depthScale(l, 0)) / STRIKER_PX_PER_M) * px,
  );
  return {
    goalBack: raster(art.goalBack, GOAL_SPRITE.w * gs, GOAL_SPRITE.h * gs),
    goalFront: raster(art.goalFront, GOAL_SPRITE.w * gs, GOAL_SPRITE.h * gs),
    shadow: raster(art.shadow, 64, 24),
    ball: ballDiameters(l).flatMap((d) => {
      const cv = raster(art.ball, d, d);
      return cv ? [{ d, cv }] : [];
    }),
    keeperCpu: sheet(art.keeperCpu, keeperCell),
    keeperYou: sheet(art.keeperYou, keeperCell),
    strikerYou: sheet(art.strikerYou, strikerCell),
    strikerCpu: sheet(art.strikerCpu, strikerCell),
  };
}
