import { BALL_R, GOAL_H, GOAL_HALF_W, SPOT_DIST } from '../physics';
import type { AimFrame } from '../input';

/** One scene art (assets/geometry.json, in scene units): where the horizon, goal line, goal and spot sit. */
export interface SceneSpec {
  W: number;
  H: number;
  horizon: number;
  goalLine: number;
  goalW: number;
  spotX: number;
  spotY: number;
  goalH: number;
  goalSpriteScale: number;
  goalSpriteX: number;
  goalSpriteY: number;
}

export const PORTRAIT: SceneSpec = {
  W: 360,
  H: 640,
  horizon: 230,
  goalLine: 316,
  goalW: 180,
  spotX: 180,
  spotY: 510,
  goalH: 60,
  goalSpriteScale: 1,
  goalSpriteX: 60,
  goalSpriteY: 236,
};
export const LANDSCAPE: SceneSpec = {
  W: 640,
  H: 360,
  horizon: 108,
  goalLine: 180,
  goalW: 200,
  spotX: 320,
  spotY: 292,
  goalH: 66.7,
  goalSpriteScale: 1.1,
  goalSpriteX: 186.7,
  goalSpriteY: 91.1,
};

/** The goal sprite is 240 x 96 with its 180-wide opening at x 30..210, y 20..80. */
export const GOAL_SPRITE = { w: 240, h: 96, openX: 30, openBottom: 80 } as const;

/** The scene art is fitted to the screen like `background-size: cover`, but kept low enough that the ball is on screen. */
export interface Layout {
  /** CSS px of the stage */
  w: number;
  h: number;
  landscape: boolean;
  spec: SceneSpec;
  /** scene unit -> CSS px */
  scale: number;
  ox: number;
  oy: number;
  /** camera distance behind the spot, metres (from the perspective of the art) */
  cd: number;
  /** px per metre across the goal plane */
  upm: number;
  /** device pixel ratio, capped at 2 */
  dpr: number;
}

export const MAX_DPR = 2;
const SPOT_MARGIN = 30;
const BOTTOM_PAD = 8;

export function fitScene(w: number, h: number, dprRaw = 1): Layout {
  const W = Number.isFinite(w) && w > 0 ? w : 360;
  const H = Number.isFinite(h) && h > 0 ? h : 640;
  const landscape = W > H;
  const spec = landscape ? LANDSCAPE : PORTRAIT;
  const scale = Math.max(W / spec.W, H / spec.H);
  const ox = (W - spec.W * scale) / 2;
  const oy = Math.max(
    H - spec.H * scale,
    Math.min(0, H - BOTTOM_PAD - (spec.spotY + SPOT_MARGIN) * scale),
  );
  const k = (spec.spotY - spec.horizon) / (spec.goalLine - spec.horizon);
  const upm = spec.goalW / (2 * GOAL_HALF_W);
  const dpr = Math.min(MAX_DPR, Math.max(1, Number.isFinite(dprRaw) ? dprRaw : 1));
  return { w: W, h: H, landscape, spec, scale, ox, oy, cd: SPOT_DIST / (k - 1), upm, dpr };
}

/** A point on screen and how many CSS px one metre is at that depth. */
export interface Pt {
  x: number;
  y: number;
  k: number;
}

/** Perspective factor at progress `s` along the shot (1 at the goal line, 3.26 at the spot in portrait). */
export const depthScale = (l: Layout, s: number): number =>
  (l.cd + SPOT_DIST) / (l.cd + SPOT_DIST * Math.max(-0.4, s));

/**
 * Where a point of the goal-space (x metres across, y metres up, s along the shot) is on screen.
 * Brief: scale(y) = (y - horizon) / (goalLine - horizon), so the ball is 5.4 units across at the
 * goal and 17.6 at the spot.
 */
export function projectInto(l: Layout, x: number, y: number, s: number, out: Pt): Pt {
  const sc = depthScale(l, s);
  const sp = l.spec;
  const gy = sp.horizon + (sp.goalLine - sp.horizon) * sc;
  const k = l.upm * sc;
  out.x = l.ox + (sp.spotX + x * k) * l.scale;
  out.y = l.oy + (gy - y * k) * l.scale;
  out.k = k * l.scale;
  return out;
}

export const ballDiameter = (l: Layout, s: number): number =>
  2 * BALL_R * l.upm * depthScale(l, s) * l.scale;

/** How a swipe maps onto the goal plane for this layout. */
export function aimFrame(l: Layout): AimFrame {
  const sp = l.spec;
  const spotX = l.ox + sp.spotX * l.scale;
  const spotY = l.oy + sp.spotY * l.scale;
  const groundY = l.oy + sp.goalLine * l.scale;
  const upm = l.upm * l.scale;
  const mid = groundY - (sp.goalH * l.scale) / 2;
  const gain = Math.min(3, Math.max(0.8, (spotY - mid) / 140));
  return { spotX, spotY, goalCx: spotX, goalGroundY: groundY, upm, gain };
}

/** The goal opening on screen. */
export function goalBox(l: Layout): {
  cx: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const f = aimFrame(l);
  return {
    cx: f.goalCx,
    left: f.goalCx - GOAL_HALF_W * f.upm,
    right: f.goalCx + GOAL_HALF_W * f.upm,
    top: f.goalGroundY - GOAL_H * f.upm,
    bottom: f.goalGroundY,
  };
}

/** The CSS `background-size` and `-position` that match the canvas, so art and sprites line up. */
export function backgroundOf(l: Layout): { bw: number; bh: number; bx: number; by: number } {
  return { bw: l.spec.W * l.scale, bh: l.spec.H * l.scale, bx: l.ox, by: l.oy };
}
