import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import {
  BALL_R,
  DIVE_TIME,
  GOAL_H,
  GOAL_HALF_W,
  KEEPER_HOME,
  POWER_EDGES,
  ZONES,
  ZONE_CENTER,
  ballPose,
  flightTime,
  impactOf,
  inReach,
  isZone,
  keeperPose,
  makeShot,
  nearestZone,
  poseInto,
  powerZone,
  resolveKick,
  sanitizeInput,
  zoneOf,
  type KeeperPlan,
  type Shot,
  type ShotInput,
  type Zone,
} from './index';

/** a shot with no scatter, for geometry tests */
const exact = (tx: number, ty: number, power = 0.6, curve = 0): Shot => ({
  aimX: tx,
  aimY: ty,
  tx,
  ty,
  power,
  zone: powerZone(power),
  curve,
  flight: flightTime(power),
});

describe('shot input and power zones', () => {
  it('repairs NaN, Infinity and out-of-range values', () => {
    const i = sanitizeInput({ aimX: NaN, aimY: Infinity, power: -3, curve: 9 });
    expect(i).toEqual({ aimX: 0, aimY: 1, power: 0, curve: 1 });
    expect(sanitizeInput({ aimY: 99 }).aimY).toBe(4);
    expect(sanitizeInput(null)).toEqual({ aimX: 0, aimY: 1, power: 0.6, curve: 0 });
    expect(sanitizeInput({ aimX: -100, aimY: -5 }).aimX).toBe(-6);
    expect(sanitizeInput({ aimY: -5 }).aimY).toBe(BALL_R);
  });

  it('maps power to five zones with the documented edges', () => {
    expect(powerZone(0)).toBe(1);
    expect(powerZone(POWER_EDGES[0] - 0.001)).toBe(1);
    expect(powerZone(POWER_EDGES[0])).toBe(2);
    expect(powerZone(0.6)).toBe(3);
    expect(powerZone(0.8)).toBe(4);
    expect(powerZone(0.92)).toBe(5);
    expect(powerZone(1)).toBe(5);
    expect(powerZone(NaN)).toBe(1);
  });

  it('flight time falls as power rises (monotonic), 0.37 to 0.85 s', () => {
    let prev = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const t = flightTime(p);
      expect(t).toBeLessThan(prev);
      prev = t;
    }
    expect(flightTime(0)).toBeCloseTo(0.846, 2);
    expect(flightTime(1)).toBeCloseTo(0.367, 2);
    expect(flightTime(NaN)).toBe(flightTime(0));
  });
});

describe('makeShot', () => {
  const input: ShotInput = { aimX: 2.5, aimY: 1.8, power: 0.6, curve: 0.5 };

  it('is deterministic: same input and seed give the same shot, and always draws seven numbers', () => {
    const a = makeShot(input, createRng(5));
    const b = makeShot(input, createRng(5));
    expect(a).toEqual(b);
    const r1 = createRng(9);
    const r2 = createRng(9);
    makeShot(input, r1);
    makeShot({ aimX: 0, aimY: 0, power: 1, curve: -1 }, r2);
    const r3 = createRng(9);
    for (let i = 0; i < 7; i++) r3.next();
    expect(r1.getState()).toBe(r3.getState());
    expect(r2.getState()).toBe(r3.getState());
  });

  it('scatter grows with a harder hit and with curve, and is smallest at the sweet spot', () => {
    const spread = (power: number, curve: number): number => {
      const rng = createRng(77);
      let sum = 0;
      for (let i = 0; i < 400; i++)
        sum += Math.abs(makeShot({ aimX: 0, aimY: 1, power, curve }, rng).tx);
      return sum / 400;
    };
    expect(spread(0.6, 0)).toBeLessThan(spread(0.1, 0));
    expect(spread(0.6, 0)).toBeLessThan(spread(0.85, 0));
    expect(spread(0.6, 0)).toBeLessThan(spread(0.6, 1));
    expect(spread(0.85, 0)).toBeLessThan(spread(0.97, 0));
  });

  it('an Over hit is lifted towards and above the bar', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) {
      const s = makeShot({ aimX: 0, aimY: 1, power: 1, curve: 0 }, rng);
      expect(s.zone).toBe(5);
      expect(s.ty).toBeGreaterThan(1.3);
    }
  });

  it('never produces NaN for hostile inputs', () => {
    const rng = createRng(1);
    const bad = [NaN, Infinity, -Infinity, 1e9, -1e9, 0, undefined as unknown as number];
    for (const a of bad)
      for (const b of bad) {
        const s = makeShot({ aimX: a, aimY: b, power: a, curve: b }, rng);
        for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
        for (let t = 0; t <= s.flight + 0.1; t += 0.05) {
          const p = ballPose(s, t);
          expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.s)).toBe(true);
        }
      }
  });
});

describe('ball flight', () => {
  it('starts on the spot, ends at the target, and progress never leaves 0..1', () => {
    const s = exact(2, 1.5, 0.5, 0.7);
    const start = ballPose(s, 0);
    expect(start).toMatchObject({ s: 0 });
    expect(start.x).toBeCloseTo(0, 9);
    expect(start.y).toBeCloseTo(BALL_R, 9);
    const end = ballPose(s, s.flight);
    expect(end.x).toBeCloseTo(2, 9);
    expect(end.y).toBeCloseTo(1.5, 9);
    expect(ballPose(s, -5).s).toBe(0);
    expect(ballPose(s, 99).s).toBe(1);
    expect(ballPose(s, NaN).s).toBe(0);
  });

  it('is repeatable and writes into the out object without allocating a new one', () => {
    const s = exact(-1, 1, 0.4);
    const out = { x: 0, y: 0, s: 0 };
    const again = poseInto(s, 0.3, out);
    expect(again).toBe(out);
    expect(ballPose(s, 0.3)).toEqual(ballPose(s, 0.3));
  });

  it('a curve bows away from the aim line mid-flight and returns to it; right and left mirror', () => {
    const right = exact(0, 1, 0.6, 1);
    const left = exact(0, 1, 0.6, -1);
    const mid = right.flight / 2;
    expect(ballPose(right, mid).x).toBeLessThan(-0.8); // a right curve starts left of the line
    expect(ballPose(left, mid).x).toBeGreaterThan(0.8);
    expect(ballPose(right, mid).x).toBeCloseTo(-ballPose(left, mid).x, 9);
    expect(ballPose(right, right.flight).x).toBeCloseTo(0, 9);
    expect(ballPose(exact(0, 1, 0.6, 0), mid).x).toBeCloseTo(0, 9);
  });

  it('bow grows with the curve amount (monotonic)', () => {
    let prev = 0;
    for (let c = 0; c <= 1.001; c += 0.25) {
      const s = exact(0, 1, 0.6, c);
      const off = Math.abs(ballPose(s, s.flight / 2).x);
      expect(off).toBeGreaterThanOrEqual(prev);
      prev = off;
    }
  });

  it('ball height rises monotonically towards a high target and stays above the ground', () => {
    const s = exact(0, 2.2, 0.6);
    let prev = 0;
    for (let t = 0; t <= s.flight; t += s.flight / 20) {
      const y = ballPose(s, t).y;
      expect(y).toBeGreaterThanOrEqual(BALL_R - 1e-9);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
  });
});

describe('impact geometry: goal, post, bar, wide, over', () => {
  it('classifies the goal plane', () => {
    expect(impactOf(0, 1)).toBe('in');
    expect(impactOf(3.4, 0.5)).toBe('in');
    expect(impactOf(GOAL_HALF_W, 1)).toBe('post');
    expect(impactOf(-GOAL_HALF_W + 0.05, 1)).toBe('post');
    expect(impactOf(3.5, 1)).toBe('post');
    expect(impactOf(3.9, 1)).toBe('wide');
    expect(impactOf(-3.9, 1)).toBe('wide');
    expect(impactOf(0, GOAL_H)).toBe('bar');
    expect(impactOf(0, 2.3)).toBe('bar');
    expect(impactOf(0, 2.7)).toBe('over');
    expect(impactOf(NaN, 1)).toBe('wide');
    expect(impactOf(0, NaN)).toBe('wide');
  });

  it('wood is a no-goal for every power and curve, and cannot be saved', () => {
    for (const p of [0.1, 0.6, 0.9]) {
      expect(resolveKick(exact(GOAL_HALF_W, 1, p), { zone: 'dr', startT: 0 }).outcome).toBe('post');
      expect(resolveKick(exact(0, GOAL_H, p), { zone: 'u', startT: -0.3 }).outcome).toBe('post');
    }
    expect(resolveKick(exact(4.5, 1), { zone: null, startT: 0 })).toMatchObject({
      outcome: 'miss',
      impact: 'wide',
    });
    expect(resolveKick(exact(0, 3), { zone: 'u', startT: 0 })).toMatchObject({
      outcome: 'miss',
      impact: 'over',
    });
  });
});

describe('keeper save-zone geometry', () => {
  const early = (zone: Zone | null): KeeperPlan => ({ zone, startT: -0.2 });

  it('zones: six, with centres inside the goal, and zoneOf maps thirds and halves', () => {
    expect(ZONES).toHaveLength(6);
    for (const z of ZONES) {
      expect(isZone(z)).toBe(true);
      const c = ZONE_CENTER[z];
      expect(Math.abs(c.x)).toBeLessThan(GOAL_HALF_W);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(GOAL_H);
      expect(zoneOf(c.x, c.y)).toBe(z);
      expect(nearestZone(c.x, c.y)).toBe(z);
    }
    expect(isZone('xx')).toBe(false);
    expect(zoneOf(-3, 2)).toBe('ul');
    expect(zoneOf(3, 0.3)).toBe('dr');
    expect(zoneOf(0, 0.3)).toBe('d');
  });

  it('a keeper who dives early to a zone saves a shot at that zone centre, and only there', () => {
    for (const z of ZONES) {
      const c = ZONE_CENTER[z];
      expect(resolveKick(exact(c.x, c.y, 0.6), early(z)).outcome, `${z} saves its own centre`).toBe(
        'saved',
      );
      for (const other of ZONES) {
        if (other === z) continue;
        const o = ZONE_CENTER[other];
        const far = Math.hypot(o.x - c.x, (o.y - c.y) * 1.5) > 2.6;
        if (far)
          expect(resolveKick(exact(o.x, o.y, 0.6), early(z)).outcome, `${z} v ${other}`).toBe(
            'goal',
          );
      }
    }
  });

  it('a perfect corner beats a keeper who guessed the right zone; a stay-at-home keeper saves the chest', () => {
    expect(resolveKick(exact(3.45, 2.2, 0.6), early('ur')).outcome).toBe('goal');
    expect(resolveKick(exact(-3.45, 0.2, 0.6), early('dl')).outcome).toBe('goal');
    expect(resolveKick(exact(0.3, 1.0, 0.6), { zone: null, startT: 0 }).outcome).toBe('saved');
    expect(resolveKick(exact(2.5, 1.0, 0.6), { zone: null, startT: 0 }).outcome).toBe('goal');
  });

  it('timing matters: a late dive reaches less, and a very late one does not move', () => {
    const shot = exact(2.9, 1.8, 0.8);
    const ok = resolveKick(shot, { zone: 'ur', startT: -0.1 }).outcome;
    const late = resolveKick(shot, { zone: 'ur', startT: 0.3 }).outcome;
    expect(ok).toBe('saved');
    expect(late).toBe('goal');
    const never = keeperPose({ zone: 'ur', startT: 5 }, shot.flight);
    expect(never).toMatchObject({ x: KEEPER_HOME.x, y: KEEPER_HOME.y, p: 0 });
  });

  it('dive progress is monotonic, bounded, and ends exactly on the zone centre', () => {
    for (const z of ZONES) {
      const plan: KeeperPlan = { zone: z, startT: 0.1 };
      let prev = -1;
      for (let t = -0.1; t <= 1; t += 0.02) {
        const p = keeperPose(plan, t);
        expect(p.p).toBeGreaterThanOrEqual(prev);
        prev = p.p;
        expect(Number.isFinite(p.x + p.y)).toBe(true);
      }
      const end = keeperPose(plan, 0.1 + DIVE_TIME[z] + 0.01);
      expect(end.x).toBeCloseTo(ZONE_CENTER[z].x, 9);
      expect(end.y).toBeCloseTo(ZONE_CENTER[z].y, 9);
    }
  });

  it('a hostile plan leaves the keeper at home', () => {
    expect(keeperPose({ zone: 'zz' as Zone, startT: 0 }, 0.3)).toMatchObject({ x: 0, y: 1 });
    expect(keeperPose({ zone: 'u', startT: NaN }, 0.3)).toMatchObject({ x: 0, y: 1 });
    expect(keeperPose({ zone: 'u', startT: 0 }, NaN)).toMatchObject({ x: 0, y: 1 });
  });

  it('reach is an ellipse: wider for a centre keeper than a diving one', () => {
    const k = { x: 0, y: 1 };
    expect(inReach(k, 'u', 1.1, 1)).toBe(true);
    expect(inReach(k, 'ul', 1.1, 1)).toBe(false);
    expect(inReach(k, null, 0, 1.9)).toBe(true);
    expect(inReach(k, null, 0, 2.2)).toBe(false);
  });
});
