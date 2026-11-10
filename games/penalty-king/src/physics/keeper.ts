import {
  GOAL_H,
  GOAL_HALF_W,
  KEEPER_HOME,
  REACH_CENTRE_X,
  REACH_SIDE_X,
  REACH_Y,
} from './constants';

/** The six dive zones of the 3 x 2 grid: up-left, up, up-right, down-left, down, down-right. */
export const ZONES = ['ul', 'u', 'ur', 'dl', 'd', 'dr'] as const;
export type Zone = (typeof ZONES)[number];

/** Where the keeper's hands end up for each zone (metres on the goal plane). */
export const ZONE_CENTER: Readonly<Record<Zone, { x: number; y: number }>> = {
  ul: { x: -2.2, y: 1.8 },
  u: { x: 0, y: 1.85 },
  ur: { x: 2.2, y: 1.8 },
  dl: { x: -2.2, y: 0.55 },
  d: { x: 0, y: 0.55 },
  dr: { x: 2.2, y: 0.55 },
};

/** Seconds a dive takes to reach its zone. */
export const DIVE_TIME: Readonly<Record<Zone, number>> = {
  ul: 0.46,
  u: 0.34,
  ur: 0.46,
  dl: 0.4,
  d: 0.3,
  dr: 0.4,
};

/** A keeper's decision: `zone` null means he stays put; `startT` is seconds after the strike (negative: before it). */
export interface KeeperPlan {
  zone: Zone | null;
  startT: number;
}

export interface KeeperPose {
  x: number;
  y: number;
  /** dive progress 0..1 (0 not started, 1 arrived) */
  p: number;
}

const easeOut = (p: number): number => 1 - Math.pow(1 - p, 2.2);

export const isZone = (z: unknown): z is Zone => ZONES.includes(z as Zone);

/** Where the keeper's hands are `t` seconds after the strike. Written into `out`. */
export function keeperPoseInto(plan: KeeperPlan, t: number, out: KeeperPose): KeeperPose {
  const z = plan.zone;
  if (!z || !isZone(z) || !Number.isFinite(plan.startT) || !Number.isFinite(t)) {
    out.x = KEEPER_HOME.x;
    out.y = KEEPER_HOME.y;
    out.p = 0;
    return out;
  }
  const raw = (t - plan.startT) / DIVE_TIME[z];
  const p = Math.min(1, Math.max(0, raw));
  const e = easeOut(p);
  const c = ZONE_CENTER[z];
  out.x = KEEPER_HOME.x + (c.x - KEEPER_HOME.x) * e;
  out.y = KEEPER_HOME.y + (c.y - KEEPER_HOME.y) * e;
  out.p = p;
  return out;
}

export const keeperPose = (plan: KeeperPlan, t: number): KeeperPose =>
  keeperPoseInto(plan, t, { x: 0, y: 0, p: 0 });

/** Is the point (x, y) inside the keeper's reach when his hands are at `k`? An ellipse, wider for a centre keeper. */
export function inReach(
  k: { x: number; y: number },
  zone: Zone | null,
  x: number,
  y: number,
): boolean {
  const rx = zone === null || zone === 'u' || zone === 'd' ? REACH_CENTRE_X : REACH_SIDE_X;
  const dx = (x - k.x) / rx;
  const dy = (y - k.y) / REACH_Y;
  return dx * dx + dy * dy <= 1;
}

/** The dive zone nearest to a point on the goal plane (used by the AI and by the stats). */
export function zoneOf(x: number, y: number): Zone {
  const col = x < -GOAL_HALF_W / 3 ? 'l' : x > GOAL_HALF_W / 3 ? 'r' : 'c';
  const up = y >= GOAL_H / 2;
  if (col === 'c') return up ? 'u' : 'd';
  return `${up ? 'u' : 'd'}${col}` as Zone;
}

/** The zone whose centre is nearest to (x, y) by distance (not by thirds). */
export function nearestZone(x: number, y: number): Zone {
  let best: Zone = 'u';
  let bd = Infinity;
  for (const z of ZONES) {
    const c = ZONE_CENTER[z];
    const d = (c.x - x) ** 2 + ((c.y - y) * 1.6) ** 2;
    if (d < bd) {
      bd = d;
      best = z;
    }
  }
  return best;
}
