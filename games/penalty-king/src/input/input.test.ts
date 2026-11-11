import { describe, expect, it } from 'vitest';
import {
  MAX_SWIPE_MS,
  MIN_SWIPE_PX,
  analyseSwipe,
  createTrack,
  flickSpeed,
  pathBow,
  pushPoint,
  resetTrack,
  swipeToShot,
  TRACK_CAP,
  type AimFrame,
  type SwipeTrack,
} from './swipe';
import { GRID_COLS, MIN_BUTTON_PX, cellSize, moveZone, swipeToZone } from './dive';
import { AIM_START, KEY_X_MAX, KEY_Y_MAX, KEY_Y_MIN, POWER_PERIOD, powerAt, stepAim } from './keys';
import { ZONES } from '../physics';

/** portrait 360x640: spot (180, 510), goal centre x 180, goal ground y 316, 24.6 px per metre */
const F: AimFrame = { spotX: 180, spotY: 510, goalCx: 180, goalGroundY: 316, upm: 24.6, gain: 1.6 };

const swipe = (pts: [number, number, number][]): SwipeTrack => {
  const t = createTrack();
  for (const [x, y, ts] of pts) pushPoint(t, x, y, ts);
  return t;
};
/** a straight swipe from the ball: (dx, dy) over `ms`, in `steps` samples */
const line = (dx: number, dy: number, ms: number, steps = 10, bow = 0): SwipeTrack => {
  const t = createTrack();
  const len = Math.hypot(dx, dy);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const off = bow * len * Math.sin(Math.PI * f); // perpendicular bulge
    pushPoint(
      t,
      180 + dx * f + (-dy / len) * off,
      510 + dy * f + (dx / len) * off,
      (ms * i) / steps,
    );
  }
  return t;
};

describe('swipe to shot', () => {
  it('a straight swipe up aims at the middle, and further to the side for a slanted one', () => {
    const up = analyseSwipe(line(0, -140, 100), F);
    expect(up.verdict).toBe('ok');
    expect(up.input.aimX).toBeCloseTo(0, 6);
    const right = analyseSwipe(line(40, -140, 100), F).input;
    const left = analyseSwipe(line(-40, -140, 100), F).input;
    expect(right.aimX).toBeGreaterThan(1);
    expect(left.aimX).toBeCloseTo(-right.aimX, 6);
  });

  it('a longer swipe aims higher (more of the way to the bar)', () => {
    const lo = analyseSwipe(line(0, -100, 100), F).input.aimY;
    const hi = analyseSwipe(line(0, -160, 100), F).input.aimY;
    expect(hi).toBeGreaterThan(lo);
  });

  it('faster flicks are harder: power rises monotonically with speed and is clamped to 0.05..1', () => {
    let prev = 0;
    for (const ms of [800, 400, 250, 150, 100, 60, 40, 20]) {
      const p = analyseSwipe(line(0, -140, ms), F).input.power;
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeGreaterThanOrEqual(0.05);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
    expect(analyseSwipe(line(0, -140, 1200), F).input.power).toBe(0.05);
    expect(analyseSwipe(line(0, -140, 5), F).input.power).toBe(1);
    expect(flickSpeed(line(0, -100, 100))).toBeCloseTo(1, 1);
  });

  it('speed counts the flick at the end, not a slow start', () => {
    const t = swipe([
      [180, 510, 0],
      [180, 500, 400],
      [180, 490, 800],
      [180, 440, 840],
      [180, 380, 870],
    ]);
    expect(flickSpeed(t)).toBeGreaterThan(1.5);
  });

  it('a path that bulges left curls right, bulging right curls left, and a straight one is straight', () => {
    // (in `line`, a positive bow bulges to the right of an upward swipe)
    expect(analyseSwipe(line(0, -140, 100, 12, -0.2), F).input.curve).toBeGreaterThan(0.9);
    expect(analyseSwipe(line(0, -140, 100, 12, 0.2), F).input.curve).toBeLessThan(-0.9);
    expect(analyseSwipe(line(0, -140, 100, 12, 0), F).input.curve).toBe(0);
    const mid = analyseSwipe(line(0, -140, 100, 12, -0.12), F).input.curve;
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(analyseSwipe(line(0, -140, 100, 12, -0.5), F).input.curve).toBe(1); // clamped
    expect(pathBow(line(0, -140, 100, 12, -0.1))).toBeCloseTo(0.1, 2);
  });

  it('clamps: absurd swipes still give finite, in-range input', () => {
    const r = analyseSwipe(line(900, -3000, 1), F).input;
    for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true);
    expect(r.power).toBe(1);
    expect(Math.abs(r.curve)).toBeLessThanOrEqual(1);
  });

  it('cancels tiny or accidental swipes (taps, slips, sideways drags, stale holds, empty tracks)', () => {
    expect(analyseSwipe(createTrack(), F).verdict).toBe('empty');
    expect(analyseSwipe(swipe([[10, 10, 0]]), F).verdict).toBe('empty');
    expect(analyseSwipe(line(0, -(MIN_SWIPE_PX - 2), 80), F).verdict).toBe('short');
    expect(analyseSwipe(line(3, -4, 40), F).verdict).toBe('short');
    expect(analyseSwipe(line(120, -10, 100), F).verdict).toBe('sideways');
    expect(analyseSwipe(line(0, 120, 100), F).verdict).toBe('sideways'); // downwards
    expect(analyseSwipe(line(0, -140, MAX_SWIPE_MS + 50), F).verdict).toBe('stale');
    expect(analyseSwipe(line(0, -MIN_SWIPE_PX - 2, 80), F).verdict).toBe('ok');
    expect(swipeToShot(line(0, -140, 100), F)).not.toBeNull();
    for (const t of [createTrack(), line(0, -10, 40), line(150, 0, 100)])
      expect(swipeToShot(t, F)).toBeNull();
  });

  it('a sample that is not a number cancels the swipe, and so does one time stamp for every sample', () => {
    for (const bad of [NaN, Infinity]) {
      const a = line(0, -140, 100);
      a.xs[3] = bad;
      expect(analyseSwipe(a, F).verdict).toBe('empty');
      const b = line(0, -140, 100);
      b.ts[2] = bad;
      expect(analyseSwipe(b, F).verdict).toBe('empty');
      const c = line(0, -140, 100);
      c.ys[5] = bad;
      expect(analyseSwipe(c, F).verdict).toBe('empty');
    }
    expect(
      analyseSwipe(
        swipe([
          [180, 510, 5],
          [180, 400, 5],
          [180, 300, 5],
        ]),
        F,
      ).verdict,
    ).toBe('empty');
    expect(
      swipeToShot(
        swipe([
          [180, 510, 0],
          [180, 300, 0],
        ]),
        F,
      ),
    ).toBeNull();
  });

  it('two samples a frame apart are not an instant kick: power needs a real flick, and a 1 ms swipe is capped by the minimum window', () => {
    const t = swipe([
      [180, 510, 0],
      [180, 360, 1],
    ]);
    expect(flickSpeed(t)).toBeLessThan(10); // 150 px over at least 16 ms, never 150 px over 1 ms
    expect(flickSpeed(t)).toBeCloseTo(150 / 16, 5);
    const slow = analyseSwipe(
      swipe([
        [180, 510, 0],
        [180, 400, 500],
      ]),
      F,
    );
    expect(slow.input.power).toBeLessThan(0.15);
  });

  it('the track buffer never grows: extra points overwrite the last slot and the end stays current', () => {
    const t = createTrack();
    for (let i = 0; i < TRACK_CAP * 3; i++) pushPoint(t, 180, 510 - i, i);
    expect(t.n).toBe(TRACK_CAP);
    expect(t.ys[TRACK_CAP - 1]).toBe(510 - (TRACK_CAP * 3 - 1));
    resetTrack(t);
    expect(t.n).toBe(0);
  });

  it('works in landscape too (frame from another layout)', () => {
    const land: AimFrame = {
      spotX: 406,
      spotY: 330,
      goalCx: 406,
      goalGroundY: 228,
      upm: 34.6,
      gain: 1.4,
    };
    const t = createTrack();
    for (let i = 0; i <= 8; i++) pushPoint(t, 406 + i * 5, 330 - i * 14, i * 12);
    const r = analyseSwipe(t, land);
    expect(r.verdict).toBe('ok');
    expect(r.input.aimX).toBeGreaterThan(0.5);
  });
});

describe('dive swipes and buttons', () => {
  it('maps swipe directions to the six zones, and taps to nothing', () => {
    expect(swipeToZone(-60, -60)).toBe('ul');
    expect(swipeToZone(0, -60)).toBe('u');
    expect(swipeToZone(60, -60)).toBe('ur');
    expect(swipeToZone(-60, 5)).toBe('dl');
    expect(swipeToZone(-60, 60)).toBe('dl');
    expect(swipeToZone(0, 60)).toBe('d');
    expect(swipeToZone(60, 60)).toBe('dr');
    expect(swipeToZone(60, 0)).toBe('dr');
    expect(swipeToZone(3, -4)).toBeNull();
    expect(swipeToZone(NaN, 10)).toBeNull();
    expect(swipeToZone(0, 0)).toBeNull();
  });

  it('every zone is reachable by some swipe', () => {
    const seen = new Set<string>();
    for (let a = 0; a < 360; a += 5)
      seen.add(
        swipeToZone(Math.cos((a * Math.PI) / 180) * 60, Math.sin((a * Math.PI) / 180) * 60)!,
      );
    expect([...seen].sort()).toEqual([...ZONES].sort());
  });

  it('the keyboard cursor moves on the grid and stops at the edges', () => {
    expect(moveZone('u', 'ArrowLeft')).toBe('ul');
    expect(moveZone('ul', 'ArrowLeft')).toBe('ul');
    expect(moveZone('ul', 'ArrowRight')).toBe('u');
    expect(moveZone('ur', 'ArrowRight')).toBe('ur');
    expect(moveZone('ul', 'ArrowDown')).toBe('dl');
    expect(moveZone('dr', 'ArrowUp')).toBe('ur');
    expect(moveZone('d', 'Enter')).toBe('d');
    expect(moveZone('zz' as never, 'ArrowUp')).toBe('u');
  });

  it('buttons are at least 44 px on every supported width from 310 px up', () => {
    expect(GRID_COLS).toBe(3);
    for (const w of [310, 322, 360]) {
      const c = cellSize(w);
      expect(c.w).toBeGreaterThanOrEqual(MIN_BUTTON_PX);
      expect(c.h).toBeGreaterThanOrEqual(MIN_BUTTON_PX);
    }
  });
});

describe('keyboard aiming', () => {
  it('arrows move the aim point and stay inside limits', () => {
    let c = AIM_START;
    c = stepAim(c, 'ArrowRight');
    expect(c.x).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) c = stepAim(c, 'ArrowRight');
    expect(c.x).toBe(KEY_X_MAX);
    for (let i = 0; i < 30; i++) c = stepAim(c, 'ArrowUp');
    expect(c.y).toBe(KEY_Y_MAX);
    for (let i = 0; i < 30; i++) c = stepAim(c, 'ArrowDown');
    expect(c.y).toBe(KEY_Y_MIN);
    for (let i = 0; i < 30; i++) c = stepAim(c, 'ArrowLeft');
    expect(c.x).toBe(-KEY_X_MAX);
  });

  it('z and x curl the ball left and right, clamped to one', () => {
    let c = AIM_START;
    c = stepAim(stepAim(stepAim(c, 'x'), 'x'), 'x');
    expect(c.curve).toBe(1);
    c = stepAim(stepAim(stepAim(stepAim(stepAim(c, 'z'), 'z'), 'z'), 'z'), ',');
    expect(c.curve).toBe(-1);
    expect(stepAim(c, 'q')).toBe(c);
  });

  it('the power meter is a triangle wave in 0..1 and never NaN', () => {
    expect(powerAt(0)).toBe(0);
    expect(powerAt(POWER_PERIOD / 2)).toBeCloseTo(1, 9);
    expect(powerAt(POWER_PERIOD)).toBeCloseTo(0, 9);
    expect(powerAt(POWER_PERIOD * 3.25)).toBeCloseTo(0.5, 9);
    expect(powerAt(NaN)).toBe(0);
    expect(powerAt(-4)).toBe(0);
    for (let t = 0; t < 10; t += 0.07) expect(powerAt(t)).toBeGreaterThanOrEqual(0);
  });
});
