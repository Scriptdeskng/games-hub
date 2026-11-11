import type { Rng } from '@naija/core/rng';
import { BALL_R, ZONES, ZONE_CENTER, type ShotInput, type Zone } from '../physics';
import type { Difficulty } from '../rules/config';
import type { KickRecord } from '../rules/shootout';
import { STRIKER } from './profiles';

export interface StrikerCtx {
  difficulty: Difficulty;
  /** this striker's own kicks so far (newest last), used to vary placement */
  own: readonly KickRecord[];
}

/** Where a zone is aimed for a profile (metres). */
export function aimPoint(d: Difficulty, zone: Zone): { x: number; y: number } {
  const p = STRIKER[d];
  const c = ZONE_CENTER[zone];
  const x = c.x === 0 ? 0 : Math.sign(c.x) * p.sideX;
  const y = zone === 'u' || zone === 'ul' || zone === 'ur' ? p.highY : p.lowY;
  return { x, y };
}

/** The weight of each zone after the anti-repeat penalty: a zone just used is much less likely. */
export function zoneWeights(ctx: StrikerCtx): Record<Zone, number> {
  const p = STRIKER[ctx.difficulty];
  const w = { ...p.weights } as Record<Zone, number>;
  const recent = ctx.own.slice(-3).reverse(); // newest first
  recent.forEach((k, i) => {
    w[k.zone] *= Math.pow(p.repeatPenalty, i === 0 ? 1 : i === 1 ? 0.5 : 0.25);
  });
  return w;
}

const noise = (rng: Rng): number => (rng.next() + rng.next() + rng.next() - 1.5) * 2;

/** Decide a CPU shot. Always draws the same number of values from `rng`. */
export function decideStriker(ctx: StrikerCtx, rng: Rng): ShotInput {
  const p = STRIKER[ctx.difficulty];
  const w = zoneWeights(ctx);
  let total = 0;
  for (const z of ZONES) total += w[z];
  const uZone = rng.next() * total;
  const uPower = rng.next();
  const uCurve = rng.next();
  const uSide = rng.next();
  const jx = noise(rng);
  const jy = noise(rng);
  let acc = 0;
  let zone: Zone = 'u';
  for (const z of ZONES) {
    acc += w[z];
    if (uZone < acc) {
      zone = z;
      break;
    }
  }
  const a = aimPoint(ctx.difficulty, zone);
  const curve = uCurve < p.curve ? (uSide < 0.5 ? -0.6 : 0.6) : 0;
  return {
    aimX: a.x + jx * p.jitter,
    // never below the ball's radius: a shot is aimed at the ball's centre height, not under the grass
    aimY: Math.max(BALL_R, a.y + jy * p.jitter * 0.7),
    power: p.powerLo + uPower * (p.powerHi - p.powerLo),
    curve,
  };
}
