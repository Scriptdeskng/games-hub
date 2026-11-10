import type { Zone } from '../physics';
import { T, type Frame } from '../play/flow';
import { SHIRT } from './theme';
import type { TeamId } from '../rules/teams';
import { GOAL_SPRITE, depthScale, fitScene, projectInto, type Layout, type Pt } from './geometry';
import { buildSprites, type Art, type Cv, type Sheet, type Sprites } from './sprites';

/** Keeper cells: ready, stand, dive-low-l, dive-high-l, dive-low-r, dive-high-r, dive-centre, save, beaten. */
const K = {
  ready: 0,
  stand: 1,
  lowL: 2,
  highL: 3,
  lowR: 4,
  highR: 5,
  centre: 6,
  save: 7,
  beaten: 8,
} as const;
/** Striker cells: idle, run1, run2, plant, strike, follow, celebrate, dejected, salute. */
const S = {
  idle: 0,
  run1: 1,
  run2: 2,
  plant: 3,
  strike: 4,
  follow: 5,
  celebrate: 6,
  dejected: 7,
} as const;
const DIVE_CELL: Readonly<Record<Zone, number>> = {
  ul: K.highL,
  dl: K.lowL,
  ur: K.highR,
  dr: K.lowR,
  u: K.centre,
  d: K.ready,
};

/** The striker's run-up: from back left to beside the ball (metres across, progress along the shot). */
const RUN_FROM = { x: -2.5, s: -0.07 };
const RUN_TO = { x: -0.6, s: -0.01 };

export interface DrawInfo {
  /** the teams on side 0 (you) and 1 (CPU) */
  teams: readonly [TeamId, TeamId];
}

export interface Renderer {
  readonly layout: Layout;
  resize(w: number, h: number, dpr: number): void;
  setArt(art: Art): void;
  /** where a goal-space point is on screen right now (CSS px) */
  pointAt(x: number, y: number, s: number, out: Pt): Pt;
  invalidate(): void;
  draw(frame: Frame, info: DrawInfo): void;
  destroy(): void;
}

const keeperCellOf = (f: Frame): number => {
  const z = f.keeperZone;
  const done = f.phase === 'result' || f.phase === 'done';
  if (done && f.record) {
    if (f.record.outcome === 'saved' && (z === 'u' || z === 'd')) return K.save;
    if (f.record.outcome === 'goal' && (z === null || z === 'u' || z === 'd')) return K.beaten;
  }
  if (z && f.keeper.p > 0) return DIVE_CELL[z];
  return f.phase === 'intro' || f.phase === 'ready' ? K.stand : K.ready;
};

const strikerCellOf = (f: Frame): number => {
  if (f.phase === 'result' || f.phase === 'done')
    return f.record?.outcome === 'goal' ? S.celebrate : S.dejected;
  if (f.phase === 'flight') return f.t < 0.15 ? S.strike : S.follow;
  if (f.phase === 'runup') {
    const u = f.phaseT / T.runup;
    return u > 0.82 ? S.plant : Math.floor(f.phaseT * 9) % 2 ? S.run2 : S.run1;
  }
  return S.idle;
};

export function createRenderer(cv: HTMLCanvasElement): Renderer {
  const ctx = cv.getContext('2d');
  let layout = fitScene(360, 640, 1);
  let art: Art | null = null;
  let sprites: Sprites | null = null;
  let dirty = true;
  const p = { x: 0, y: 0, k: 0 } as Pt;
  const q = { x: 0, y: 0, k: 0 } as Pt;

  const rebuild = (): void => {
    cv.width = Math.round(layout.w * layout.dpr);
    cv.height = Math.round(layout.h * layout.dpr);
    sprites = art ? buildSprites(art, layout) : null;
    dirty = true;
  };

  const blit = (c: Cv | null, x: number, y: number, w: number, h: number): void => {
    if (c && ctx) ctx.drawImage(c, x, y, w, h);
  };

  /** One figure: a cell of its sheet (bottom centre on the anchor), or a plain coloured shape if the sheet failed. `rel` scales a cached cell; `pxPerM` is device px per metre at this depth. */
  const drawFigure = (
    sh: Sheet | null,
    cell: number,
    ax: number,
    ay: number,
    rel: number,
    pxPerM: number,
    fallback: string,
    hM: number,
  ): void => {
    if (!ctx) return;
    const d = layout.dpr;
    if (sh) {
      const n = sh.cell;
      const size = n * rel;
      ctx.drawImage(
        sh.cv,
        (cell % 3) * n,
        Math.floor(cell / 3) * n,
        n,
        n,
        ax * d - size / 2,
        ay * d - size * (120 / 128),
        size,
        size,
      );
      return;
    }
    const h = hM * pxPerM;
    const w = h * 0.28;
    ctx.fillStyle = fallback;
    ctx.fillRect(ax * d - w / 2, ay * d - h, w, h);
    ctx.beginPath();
    ctx.arc(ax * d, ay * d - h - w * 0.35, w * 0.45, 0, Math.PI * 2);
    ctx.fill();
  };

  const r: Renderer = {
    get layout() {
      return layout;
    },
    resize(w, h, dpr) {
      layout = fitScene(w, h, dpr);
      rebuild();
    },
    setArt(a) {
      art = a;
      rebuild();
    },
    pointAt: (x, y, s, out) => projectInto(layout, x, y, s, out),
    invalidate() {
      dirty = true;
    },
    draw(f, info) {
      if (!ctx) return;
      const moving = f.phase !== 'ready' && f.phase !== 'intro';
      if (!dirty && !moving) return;
      dirty = false;
      const l = layout;
      const d = l.dpr;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const sp = l.spec;
      const gs = sp.goalSpriteScale * l.scale * d;
      const gx = (l.ox + sp.goalSpriteX * l.scale) * d;
      const gy = (l.oy + sp.goalSpriteY * l.scale) * d;
      blit(sprites?.goalBack ?? null, gx, gy, GOAL_SPRITE.w * gs, GOAL_SPRITE.h * gs);

      // keeper (in the goal plane)
      const keeperSheet = f.striker === 0 ? sprites?.keeperCpu : sprites?.keeperYou;
      projectInto(l, f.keeper.x * 0.72, 0, 1, p);
      const kLift = Math.max(0, f.keeper.y - 1) * 0.35 * p.k;
      drawFigure(
        keeperSheet ?? null,
        keeperCellOf(f),
        p.x,
        p.y - kLift,
        1,
        p.k * d,
        '#27a3c9',
        1.9,
      );

      // ball and its shadow
      const b = f.ball;
      projectInto(l, b.x, b.y, b.s, p);
      projectInto(l, b.x, 0, b.s, q);
      const diam = 0.22 * p.k;
      if (sprites?.shadow && ctx) {
        const w = diam * 1.5 * d;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sprites.shadow, q.x * d - w / 2, q.y * d - w * 0.15, w, w * 0.375);
        ctx.globalAlpha = 1;
      }
      const balls = sprites?.ball;
      if (balls && balls.length) {
        const want = diam * d;
        let best = balls[0]!;
        for (const e of balls) if (Math.abs(e.d - want) < Math.abs(best.d - want)) best = e;
        ctx.drawImage(best.cv, p.x * d - best.d / 2, p.y * d - best.d / 2, best.d, best.d);
      } else {
        ctx.fillStyle = '#fff3da';
        ctx.strokeStyle = '#0b1f14';
        ctx.lineWidth = Math.max(1, d);
        ctx.beginPath();
        ctx.arc(p.x * d, p.y * d, Math.max(2, (diam * d) / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // striker (back view, on the run-up line)
      const run =
        f.phase === 'runup'
          ? Math.min(1, f.phaseT / T.runup)
          : f.phase === 'ready' || f.phase === 'intro'
            ? 0
            : 1;
      const e = run * run * (3 - 2 * run);
      const sx = RUN_FROM.x + (RUN_TO.x - RUN_FROM.x) * e;
      const ss = RUN_FROM.s + (RUN_TO.s - RUN_FROM.s) * e;
      projectInto(l, sx, 0, ss, p);
      const strikerSheet = f.striker === 0 ? sprites?.strikerYou : sprites?.strikerCpu;
      const team = f.striker === 0 ? info.teams[0] : info.teams[1];
      const rel = depthScale(l, ss) / depthScale(l, 0);
      drawFigure(strikerSheet ?? null, strikerCellOf(f), p.x, p.y, rel, p.k * d, SHIRT[team], 1.8);

      blit(sprites?.goalFront ?? null, gx, gy, GOAL_SPRITE.w * gs, GOAL_SPRITE.h * gs);
    },
    destroy() {
      art = null;
      sprites = null;
    },
  };
  return r;
}
