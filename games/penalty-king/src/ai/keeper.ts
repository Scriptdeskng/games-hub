import { createRng, type Rng } from '@naija/core/rng';
import {
  BALL_START_Y,
  ZONES,
  nearestZone,
  poseInto,
  type KeeperPlan,
  type Pose,
  type Shot,
  type Zone,
} from '../physics';
import type { Difficulty } from '../rules/config';
import type { KickRecord } from '../rules/shootout';
import { KEEPER } from './profiles';

export interface KeeperCtx {
  difficulty: Difficulty;
  /** the shot that was struck: the keeper only sees it through `poseInto(shot, react)` */
  shot: Shot;
  /** the human's saved habit (decayed zone counts), may be empty */
  habit: Readonly<Record<Zone, number>>;
  /** the human's kicks so far in this match (newest last) */
  seen: readonly KickRecord[];
}

/** Weight of one kick seen in this match against the saved habit. */
const SEEN_WEIGHT = 1.5;

/** The keeper's belief about where the next shot goes: the habit plus this match's kicks, smoothed. */
export function zonePrior(
  habit: Readonly<Record<Zone, number>>,
  seen: readonly KickRecord[],
): Record<Zone, number> {
  const out = { ul: 0.5, u: 0.5, ur: 0.5, dl: 0.5, d: 0.5, dr: 0.5 } as Record<Zone, number>;
  for (const z of ZONES) out[z] += Math.max(0, habit[z] ?? 0);
  for (const k of seen) out[k.zone] += SEEN_WEIGHT;
  let sum = 0;
  for (const z of ZONES) sum += out[z];
  for (const z of ZONES) out[z] /= sum;
  return out;
}

const pickWeighted = (w: Readonly<Record<Zone, number>>, u: number): Zone => {
  let acc = 0;
  for (const z of ZONES) {
    acc += w[z];
    if (u < acc) return z;
  }
  return 'u';
};

/** Same decision for the same state: its own seeded RNG is derived from the shootout seed and the kick number. */
export const aiRng = (seed: number, kick: number, salt: number): Rng =>
  createRng((seed ^ Math.imul(kick + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0);

const noise = (rng: Rng): number => (rng.next() + rng.next() + rng.next() - 1.5) * 2;

/**
 * Decide the keeper's dive. Always draws the same number of values from `rng` (so a replay stays in step).
 * Fairness: the only things it uses are the human's history and the ball's pose at its reaction time.
 */
export function decideKeeper(ctx: KeeperCtx, rng: Rng): KeeperPlan {
  const p = KEEPER[ctx.difficulty];
  const uRead = rng.next();
  const uStay = rng.next();
  const uZone = rng.next();
  const nx = noise(rng);
  const ny = noise(rng);
  if (uStay < p.stay) return { zone: null, startT: 0 };

  if (uRead < p.read) {
    const obs: Pose = poseInto(ctx.shot, p.react, { x: 0, y: 0, s: 0 });
    const s = Math.max(obs.s, 0.05);
    const ex = obs.x / s + (nx * p.noise) / s;
    const ey = BALL_START_Y + (obs.y - BALL_START_Y) / s + (ny * p.noise) / s;
    return { zone: nearestZone(ex, ey), startT: p.react + p.lag };
  }
  const prior = zonePrior(ctx.habit, ctx.seen);
  const mix = {} as Record<Zone, number>;
  for (const z of ZONES) mix[z] = (1 - p.bias) / ZONES.length + p.bias * prior[z];
  return { zone: pickWeighted(mix, uZone), startT: p.guessStart };
}
