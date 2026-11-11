import type { ShotInput } from '../physics';

/**
 * A fixed-size buffer of pointer samples (no allocation while the finger moves). Times are in ms.
 * `push` ignores samples past the capacity but always keeps the newest as the last point.
 */
export interface SwipeTrack {
  n: number;
  xs: Float64Array;
  ys: Float64Array;
  ts: Float64Array;
}

export const TRACK_CAP = 96;
export const createTrack = (cap = TRACK_CAP): SwipeTrack => ({
  n: 0,
  xs: new Float64Array(cap),
  ys: new Float64Array(cap),
  ts: new Float64Array(cap),
});
export const resetTrack = (t: SwipeTrack): void => {
  t.n = 0;
};
export function pushPoint(t: SwipeTrack, x: number, y: number, ts: number): void {
  const cap = t.xs.length;
  const i = t.n < cap ? t.n++ : cap - 1; // a full buffer keeps overwriting the last slot: the end point stays current
  t.xs[i] = x;
  t.ys[i] = y;
  t.ts[i] = ts;
}

/** Where the picture is on screen (CSS px), from view/geometry.ts: how a swipe maps onto the goal plane. */
export interface AimFrame {
  /** the ball's spot on screen */
  spotX: number;
  spotY: number;
  /** the goal's centre line x and its ground y, on screen */
  goalCx: number;
  goalGroundY: number;
  /** px per metre at the goal plane */
  upm: number;
  /** a swipe vector is multiplied by this to reach the goal (so a short thumb swipe is enough) */
  gain: number;
}

/** Shorter than this (CSS px) is a tap or a slip of the thumb: cancelled. */
export const MIN_SWIPE_PX = 36;
/** the swipe must go up the screen by at least this much, and mostly up (not sideways) */
export const MIN_UP_PX = 24;
export const MIN_UP_RATIO = 0.26;
/** a swipe held longer than this is stale: cancelled */
export const MAX_SWIPE_MS = 2500;
/** flick speed (px per ms) mapped to power 0.05 .. 1 */
export const V_MIN = 0.3;
export const V_MAX = 3.2;
/** speed is measured over the last part of the swipe, so the flick at the end counts */
export const SPEED_WINDOW_MS = 120;
/** the shortest time a flick is measured over: two samples a frame apart cannot read as an instant, full-power kick */
export const MIN_DT_MS = 16;
export const CURVE_DEAD = 0.04;
export const CURVE_FULL = 0.2;

export type SwipeVerdict = 'ok' | 'short' | 'sideways' | 'stale' | 'empty';

export interface SwipeResult {
  verdict: SwipeVerdict;
  input: ShotInput;
  /** straight-line length in px */
  length: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Speed of the last SPEED_WINDOW_MS of the path, px per ms (path length, so a curl does not lose speed). */
export function flickSpeed(t: SwipeTrack): number {
  const last = t.n - 1;
  let i = last;
  while (i > 0 && t.ts[last]! - t.ts[i - 1]! <= SPEED_WINDOW_MS) i--;
  let d = 0;
  for (let k = i; k < last; k++) d += Math.hypot(t.xs[k + 1]! - t.xs[k]!, t.ys[k + 1]! - t.ys[k]!);
  const dt = Math.max(MIN_DT_MS, t.ts[last]! - t.ts[i]!);
  return d / dt;
}

/** Signed bow of the path away from the chord, as a fraction of the chord. Positive: it bulges to the left of the travel direction. */
export function pathBow(t: SwipeTrack): number {
  const last = t.n - 1;
  const cx = t.xs[last]! - t.xs[0]!;
  const cy = t.ys[last]! - t.ys[0]!;
  const len = Math.hypot(cx, cy);
  if (len < 1e-6) return 0;
  let best = 0;
  for (let i = 1; i < last; i++) {
    const cross = ((t.xs[i]! - t.xs[0]!) * cy - (t.ys[i]! - t.ys[0]!) * cx) / len;
    if (Math.abs(cross) > Math.abs(best)) best = cross;
  }
  return best / len;
}

/**
 * Turn a finished (or running) swipe into a shot. The end of the swipe, scaled by `frame.gain`, is
 * the aim point on the goal plane; the speed of the last 120 ms is the power; a path that bulges
 * left (away from the straight line) starts the ball to the left and curls it right, and the
 * other way round. Tiny, sideways and stale swipes are cancelled (`verdict` says why).
 */
export function analyseSwipe(t: SwipeTrack, f: AimFrame): SwipeResult {
  const neutral: ShotInput = { aimX: 0, aimY: 1, power: 0.5, curve: 0 };
  if (t.n < 2) return { verdict: 'empty', input: neutral, length: 0 };
  const last = t.n - 1;
  // a sample that is not a number, or a swipe whose samples share one time stamp, is not a real gesture
  for (let i = 0; i <= last; i++)
    if (!Number.isFinite(t.xs[i]!) || !Number.isFinite(t.ys[i]!) || !Number.isFinite(t.ts[i]!))
      return { verdict: 'empty', input: neutral, length: 0 };
  if (!(t.ts[last]! > t.ts[0]!)) return { verdict: 'empty', input: neutral, length: 0 };
  const dx = t.xs[last]! - t.xs[0]!;
  const dy = t.ys[last]! - t.ys[0]!;
  const length = Math.hypot(dx, dy);
  const bow = pathBow(t);
  const mag = clamp((Math.abs(bow) - CURVE_DEAD) / (CURVE_FULL - CURVE_DEAD), 0, 1);
  const input: ShotInput = {
    aimX: (f.spotX + dx * f.gain - f.goalCx) / f.upm,
    aimY: (f.goalGroundY - (f.spotY + dy * f.gain)) / f.upm,
    power: clamp((flickSpeed(t) - V_MIN) / (V_MAX - V_MIN), 0.05, 1),
    // bulge left (cross > 0 for an upward chord) = a right curl
    curve: Math.sign(bow) * mag,
  };
  if (length < MIN_SWIPE_PX) return { verdict: 'short', input, length };
  if (dy > -MIN_UP_PX || -dy < MIN_UP_RATIO * length) return { verdict: 'sideways', input, length };
  if (t.ts[last]! - t.ts[0]! > MAX_SWIPE_MS) return { verdict: 'stale', input, length };
  return { verdict: 'ok', input, length };
}

/** The shot of a good swipe, or null when it was cancelled. */
export function swipeToShot(t: SwipeTrack, f: AimFrame): ShotInput | null {
  const r = analyseSwipe(t, f);
  return r.verdict === 'ok' ? r.input : null;
}
