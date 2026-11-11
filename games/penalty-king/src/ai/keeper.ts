import { createRng, type Rng } from '@naija/core/rng';
import {
  BALL_START_Y,
  LOFT,
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
  seenWeight = SEEN_WEIGHT,
): Record<Zone, number> {
  const out = { ul: 0.5, u: 0.5, ur: 0.5, dl: 0.5, d: 0.5, dr: 0.5 } as Record<Zone, number>;
  for (const z of ZONES) out[z] += Math.max(0, habit[z] ?? 0);
  for (const k of seen) out[k.zone] += seenWeight;
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

/** the two-look fit divides noise less (it averages the model), so its samples are read more precisely */
const FIT_NOISE = 0.35;
/** a first look that points this far from the middle (metres) is committed to at once */
const OUTER_X = 2.9;
const clampAim = (v: number): number => Math.min(6, Math.max(-6, Number.isFinite(v) ? v : 0));

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
  const nx2 = noise(rng);
  const ny2 = noise(rng);
  if (uStay < p.stay) return { zone: null, startT: 0 };

  if (uRead < p.read && p.look > 0) {
    // first look: a ball already heading for the outer third cannot be reached by a late dive, so commit to that side now
    const first: Pose = poseInto(ctx.shot, p.react, { x: 0, y: 0, s: 0 });
    const s1 = Math.max(first.s, 0.05);
    const ex1 = first.x / s1 + (nx * p.noise) / s1;
    if (Math.abs(ex1) >= OUTER_X) {
      const ey1 = BALL_START_Y + (first.y - BALL_START_Y) / s1 + (ny * p.noise) / s1;
      return { zone: nearestZone(clampAim(ex1), clampAim(ey1)), startT: p.react + p.lag };
    }
    // second look: with two true positions the keeper can tell a curl from a straight ball (the bow is a known sine)
    const t2 = p.react + p.look;
    const a: Pose = poseInto(ctx.shot, p.react, { x: 0, y: 0, s: 0 });
    const b: Pose = poseInto(ctx.shot, t2, { x: 0, y: 0, s: 0 });
    const x1 = a.x + nx * p.noise * FIT_NOISE;
    const x2 = b.x + nx2 * p.noise * FIT_NOISE;
    const S1 = Math.sin(Math.PI * a.s);
    const S2 = Math.sin(Math.PI * b.s);
    const den = a.s * S2 - b.s * S1;
    const tx = Math.abs(den) < 1e-6 ? x2 / Math.max(b.s, 0.05) : (x1 * S2 - x2 * S1) / den;
    const ty =
      BALL_START_Y +
      (b.y + ny2 * p.noise * FIT_NOISE - BALL_START_Y - LOFT * S2) / Math.max(b.s, 0.05);
    return { zone: nearestZone(clampAim(tx), clampAim(ty)), startT: t2 + p.lag };
  }
  if (uRead < p.read) {
    const obs: Pose = poseInto(ctx.shot, p.react, { x: 0, y: 0, s: 0 });
    const s = Math.max(obs.s, 0.05);
    const ex = obs.x / s + (nx * p.noise) / s;
    const ey = BALL_START_Y + (obs.y - BALL_START_Y) / s + (ny * p.noise) / s;
    return { zone: nearestZone(ex, ey), startT: p.react + p.lag };
  }
  const prior = zonePrior(ctx.habit, ctx.seen, p.seenWeight);
  const mix = {} as Record<Zone, number>;
  for (const z of ZONES) mix[z] = (1 - p.bias) / ZONES.length + p.bias * prior[z];
  return { zone: pickWeighted(mix, uZone), startT: p.guessStart };
}
