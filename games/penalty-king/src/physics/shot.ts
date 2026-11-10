import type { Rng } from '@naija/core/rng';
import {
  BALL_START_Y,
  BOW_MAX,
  CURVE_SCATTER,
  LOFT,
  MAX_AIM_X,
  MAX_AIM_Y,
  OVER_LIFT,
  OVER_LIFT_RANGE,
  POWER_EDGES,
  SCATTER_X,
  SCATTER_Y_RATIO,
  SPEED_MIN,
  SPEED_RANGE,
  SPOT_DIST,
  BALL_R,
  type PowerZone,
} from './constants';

/** What the striker asks for: an aim point on the goal plane (metres), a power 0..1 and a curve -1 (left) .. 1 (right). */
export interface ShotInput {
  aimX: number;
  aimY: number;
  power: number;
  curve: number;
}

/** What the ball will really do after the strike (scatter added). Immutable and serialisable. */
export interface Shot {
  aimX: number;
  aimY: number;
  /** where it crosses the goal plane */
  tx: number;
  ty: number;
  power: number;
  zone: PowerZone;
  curve: number;
  /** seconds from the strike to the goal plane */
  flight: number;
}

/** A point on the ball's path: metres across, metres up, and how far along (0 spot, 1 goal line). */
export interface Pose {
  x: number;
  y: number;
  s: number;
}

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Repair a shot input: NaN, Infinity and out-of-range values never reach the physics. */
export function sanitizeInput(i: Partial<ShotInput> | null | undefined): ShotInput {
  return {
    aimX: clamp(num(i?.aimX, 0), -MAX_AIM_X, MAX_AIM_X),
    aimY: clamp(num(i?.aimY, 1), BALL_R, MAX_AIM_Y),
    power: clamp(num(i?.power, 0.6), 0, 1),
    curve: clamp(num(i?.curve, 0), -1, 1),
  };
}

export function powerZone(power: number): PowerZone {
  const p = num(power, 0);
  let z = 1;
  for (const e of POWER_EDGES) if (p >= e) z++;
  return z as PowerZone;
}

export const flightTime = (power: number): number =>
  SPOT_DIST / (SPEED_MIN + SPEED_RANGE * clamp(num(power, 0), 0, 1));

/** Roughly normal, sigma 1, from three uniform draws. */
const gauss = (rng: Rng): number => (rng.next() + rng.next() + rng.next() - 1.5) * 2;

/**
 * Turn the striker's input into the real shot. Always draws exactly seven numbers from `rng`, so a
 * replay stays in step however the shot turned out. A harder hit scatters more, a curve scatters
 * more, and an Over hit is lifted towards the bar.
 */
export function makeShot(input: Partial<ShotInput>, rng: Rng): Shot {
  const i = sanitizeInput(input);
  const zone = powerZone(i.power);
  const k = (SCATTER_X[zone - 1] ?? 0.3) * (1 + CURVE_SCATTER * Math.abs(i.curve));
  const gx = gauss(rng);
  const gy = gauss(rng);
  const lift = rng.next();
  const tx = i.aimX + gx * k;
  let ty = i.aimY + gy * k * SCATTER_Y_RATIO;
  if (zone === 5) ty += OVER_LIFT + lift * OVER_LIFT_RANGE;
  return {
    aimX: i.aimX,
    aimY: i.aimY,
    tx: clamp(tx, -MAX_AIM_X - 1, MAX_AIM_X + 1),
    ty: clamp(ty, BALL_START_Y, MAX_AIM_Y + 2),
    power: i.power,
    zone,
    curve: i.curve,
    flight: flightTime(i.power),
  };
}

/** The ball's position `t` seconds after the strike, written into `out` (no allocation in the render loop). */
export function poseInto(shot: Shot, t: number, out: Pose): Pose {
  const s = clamp(num(t, 0) / shot.flight, 0, 1);
  const arc = Math.sin(Math.PI * s);
  out.s = s;
  out.x = shot.tx * s - shot.curve * BOW_MAX * arc;
  out.y = BALL_START_Y + (shot.ty - BALL_START_Y) * s + LOFT * Math.min(1, shot.ty) * arc;
  return out;
}

export const ballPose = (shot: Shot, t: number): Pose => poseInto(shot, t, { x: 0, y: 0, s: 0 });
