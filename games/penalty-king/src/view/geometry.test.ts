import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LANDSCAPE,
  PORTRAIT,
  aimFrame,
  backgroundOf,
  ballDiameter,
  depthScale,
  fitScene,
  goalBox,
  projectInto,
  type SceneSpec,
} from './geometry';

const g = JSON.parse(readFileSync(join(__dirname, '../../assets/geometry.json'), 'utf8')) as Record<
  'portrait' | 'landscape',
  {
    W: number;
    H: number;
    horizon: number;
    goalLine: number;
    goalW: number;
    spot: [number, number];
    goalH: number;
    goalSpriteScale: number;
    goalSpriteOrigin: [number, number];
  }
> & { ball: { sizeAtGoal: number } };

const same = (spec: SceneSpec, j: (typeof g)['portrait']): void => {
  expect(spec).toEqual({
    W: j.W,
    H: j.H,
    horizon: j.horizon,
    goalLine: j.goalLine,
    goalW: j.goalW,
    spotX: j.spot[0],
    spotY: j.spot[1],
    goalH: j.goalH,
    goalSpriteScale: j.goalSpriteScale,
    goalSpriteX: j.goalSpriteOrigin[0],
    goalSpriteY: j.goalSpriteOrigin[1],
  });
};

describe('scene geometry', () => {
  it('matches assets/geometry.json for both scenes', () => {
    same(PORTRAIT, g.portrait);
    same(LANDSCAPE, g.landscape);
  });

  it('picks the art by orientation (a square is portrait, like the CSS media query)', () => {
    expect(fitScene(360, 640).landscape).toBe(false);
    expect(fitScene(640, 360).landscape).toBe(true);
    expect(fitScene(500, 500).landscape).toBe(false);
    expect(fitScene(1280, 800).landscape).toBe(true);
  });

  it('the art always covers the screen and the ball spot stays on screen (portrait, landscape, desktop)', () => {
    for (const [w, h] of [
      [360, 640],
      [375, 812],
      [320, 480],
      [412, 915],
      [812, 375],
      [640, 360],
      [1280, 800],
      [1920, 1080],
      [900, 900],
    ] as const) {
      const l = fitScene(w, h);
      expect(l.ox).toBeLessThanOrEqual(0.001);
      expect(l.ox + l.spec.W * l.scale).toBeGreaterThanOrEqual(w - 0.001);
      expect(l.oy).toBeLessThanOrEqual(0.001);
      expect(l.oy + l.spec.H * l.scale).toBeGreaterThanOrEqual(h - 0.001);
      const spot = projectInto(l, 0, 0, 0, { x: 0, y: 0, k: 0 });
      expect(spot.y, `${w}x${h}`).toBeLessThanOrEqual(h);
      const goal = goalBox(l);
      expect(goal.left).toBeGreaterThanOrEqual(0);
      expect(goal.right).toBeLessThanOrEqual(w);
    }
  });

  it('is tolerant of nonsense sizes and caps the pixel ratio at 2', () => {
    expect(fitScene(0, -1).w).toBe(360);
    expect(fitScene(NaN, NaN).h).toBe(640);
    expect(fitScene(360, 640, 3).dpr).toBe(2);
    expect(fitScene(360, 640, 0.5).dpr).toBe(1);
    expect(fitScene(360, 640, NaN).dpr).toBe(1);
  });
});

describe('perspective (brief: a 5.4 unit ball at the goal grows to about 17.6 at the spot)', () => {
  it('ball diameter at the goal and at the spot, in scene units', () => {
    for (const [w, h] of [
      [360, 640],
      [640, 360],
    ] as const) {
      const l = fitScene(w, h);
      // 0.22 m ball x units per metre: 5.4 for the 180-unit goal (portrait), 6.0 for the 200-unit goal (landscape)
      expect(ballDiameter(l, 1) / l.scale).toBeCloseTo(l.landscape ? 6.0 : g.ball.sizeAtGoal, 1);
      if (!l.landscape) expect(ballDiameter(l, 0) / l.scale).toBeCloseTo(17.6, 0);
    }
  });

  it('depth scale is 1 at the goal line, falls behind it and grows towards the camera', () => {
    const l = fitScene(360, 640);
    expect(depthScale(l, 1)).toBeCloseTo(1, 9);
    expect(depthScale(l, 0)).toBeCloseTo((510 - 230) / (316 - 230), 6);
    expect(depthScale(l, 1.2)).toBeLessThan(1);
    expect(depthScale(l, -0.1)).toBeGreaterThan(depthScale(l, 0));
    expect(Number.isFinite(depthScale(l, -50))).toBe(true);
  });

  it('projects the spot to the art spot and a goal-plane point to the goal line', () => {
    const l = fitScene(360, 640);
    const p = { x: 0, y: 0, k: 0 };
    projectInto(l, 0, 0, 0, p);
    expect(p.x).toBeCloseTo(180, 6);
    expect(p.y).toBeCloseTo(510, 6);
    projectInto(l, 3.66, 0, 1, p);
    expect(p.x).toBeCloseTo(270, 1);
    expect(p.y).toBeCloseTo(316, 6);
    projectInto(l, 0, 2.44, 1, p);
    expect(p.y).toBeCloseTo(256, 0);
  });

  it('a ball on its way to the goal rises up the screen and shrinks (monotonic)', () => {
    const l = fitScene(375, 812);
    const p = { x: 0, y: 0, k: 0 };
    let py = Infinity;
    let pk = Infinity;
    for (let s = 0; s <= 1.2; s += 0.05) {
      projectInto(l, 0, 0.11, s, p);
      expect(p.y).toBeLessThan(py);
      expect(p.k).toBeLessThan(pk);
      py = p.y;
      pk = p.k;
    }
  });
});

describe('swipe frame and background', () => {
  it('the aim frame is centred on the goal with the gain that reaches the goal middle from the spot', () => {
    const l = fitScene(360, 640);
    const f = aimFrame(l);
    expect(f.goalCx).toBe(f.spotX);
    expect(f.upm).toBeCloseTo(24.59, 1);
    expect(f.gain * 140).toBeCloseTo(f.spotY - (f.goalGroundY - 30), 0);
    for (const [w, h] of [
      [360, 640],
      [812, 375],
      [1280, 800],
      [320, 480],
    ] as const) {
      const a = aimFrame(fitScene(w, h));
      expect(a.gain).toBeGreaterThanOrEqual(0.8);
      expect(a.gain).toBeLessThanOrEqual(3);
    }
  });

  it('the CSS background rectangle is the art rectangle', () => {
    const l = fitScene(375, 812);
    expect(backgroundOf(l)).toEqual({ bw: 360 * l.scale, bh: 640 * l.scale, bx: l.ox, by: l.oy });
  });
});
