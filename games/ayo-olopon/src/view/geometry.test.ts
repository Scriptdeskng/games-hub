import { describe, expect, it } from 'vitest';
import {
  LAYOUTS,
  fitBoard,
  keyOfPit,
  pickLayout,
  pitOfKey,
  pitPx,
  seedSize,
  seedSpot,
  seedVariant,
  traySeedSize,
} from './geometry';

describe('board layouts (asset brief section 3)', () => {
  it('both boards have 12 pits and 48 tray slots per tray', () => {
    for (const l of [LAYOUTS.landscape, LAYOUTS.portrait]) {
      expect(l.pits).toHaveLength(12);
      expect(l.trays.human.slots).toHaveLength(48);
      expect(l.trays.cpu.slots).toHaveLength(48);
    }
    expect([LAYOUTS.landscape.w, LAYOUTS.landscape.h]).toEqual([1400, 520]);
    expect([LAYOUTS.portrait.w, LAYOUTS.portrait.h]).toEqual([520, 1400]);
  });
  it('landscape: human row at the bottom left to right, CPU row at the top right to left', () => {
    const p = LAYOUTS.landscape.pits;
    for (let i = 0; i < 5; i++) {
      expect(p[i + 1]!.x).toBeGreaterThan(p[i]!.x);
      expect(p[i]!.y).toBeGreaterThan(50);
    }
    for (let i = 6; i < 11; i++) {
      expect(p[i + 1]!.x).toBeLessThan(p[i]!.x);
      expect(p[i]!.y).toBeLessThan(50);
    }
    // pit 6 sits above pit 5, pit 11 above pit 0
    expect(p[6]!.x).toBeCloseTo(p[5]!.x, 0);
    expect(p[11]!.x).toBeCloseTo(p[0]!.x, 0);
  });
  it('portrait: human column on the right going up, CPU column on the left going down', () => {
    const p = LAYOUTS.portrait.pits;
    for (let i = 0; i < 5; i++) {
      expect(p[i + 1]!.y).toBeLessThan(p[i]!.y);
      expect(p[i]!.x).toBeGreaterThan(50);
    }
    for (let i = 6; i < 11; i++) {
      expect(p[i + 1]!.y).toBeGreaterThan(p[i]!.y);
      expect(p[i]!.x).toBeLessThan(50);
    }
  });
  it('sowing i -> i+1 turns counter-clockwise on screen in both layouts', () => {
    // cross product of consecutive steps around the centre is positive in screen coordinates (y down) for a
    // counter-clockwise walk when it is negative; check the sign is the same for every step
    for (const l of [LAYOUTS.landscape, LAYOUTS.portrait]) {
      const c = { x: 50, y: 50 };
      let sign = 0;
      for (let i = 0; i < 12; i++) {
        const a = l.pits[i]!;
        const b = l.pits[(i + 1) % 12]!;
        const cross = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
        if (Math.abs(cross) < 1e-6) continue;
        sign += Math.sign(cross);
      }
      // y points down on screen: a negative cross product is counter-clockwise
      expect(sign).toBeLessThan(0);
    }
  });
  it('trays sit at the ends: CPU left / human right in landscape, CPU top / human bottom in portrait', () => {
    expect(LAYOUTS.landscape.trays.cpu.x).toBeLessThan(LAYOUTS.landscape.trays.human.x);
    expect(LAYOUTS.portrait.trays.cpu.y).toBeLessThan(LAYOUTS.portrait.trays.human.y);
  });
  it('every tray slot lies inside its tray', () => {
    for (const l of [LAYOUTS.landscape, LAYOUTS.portrait]) {
      for (const t of [l.trays.human, l.trays.cpu]) {
        for (const s of t.slots) {
          expect(s.x).toBeGreaterThan(0);
          expect(s.x).toBeLessThan(100);
          expect(s.y).toBeGreaterThan(0);
          expect(s.y).toBeLessThan(100);
        }
      }
    }
    expect(traySeedSize('landscape', 'human')).toBeGreaterThan(5);
    expect(traySeedSize('portrait', 'cpu')).toBeGreaterThan(2);
  });
});

describe('fitting the board', () => {
  it('picks the board that scales larger: portrait on tall phones, landscape on wide screens', () => {
    expect(pickLayout(360, 520)).toBe('portrait');
    expect(pickLayout(375, 700)).toBe('portrait');
    expect(pickLayout(640, 250)).toBe('landscape');
    expect(pickLayout(1280, 600)).toBe('landscape');
    expect(pickLayout(500, 500)).toBe('landscape');
  });
  it('keeps the aspect ratio and fits the box', () => {
    const b = fitBoard('portrait', 360, 520);
    expect(b.h).toBeLessThanOrEqual(520);
    expect(b.w / b.h).toBeCloseTo(520 / 1400, 1);
    const l = fitBoard('landscape', 640, 400);
    expect(l.w).toBeLessThanOrEqual(640);
    expect(l.w / l.h).toBeCloseTo(1400 / 520, 1);
    expect(fitBoard('landscape', 0, 0)).toEqual({ w: 0, h: 0 });
  });
  it('a pit stays a 44 px tap target on a 360x640 phone (portrait) and on a 640x360 phone (landscape)', () => {
    // chrome (HUD, status) takes about 120 px of height
    const p = fitBoard(pickLayout(344, 510), 344, 510);
    expect(pitPx('portrait', p.w)).toBeGreaterThanOrEqual(44);
    const l = fitBoard(pickLayout(624, 240), 624, 240);
    expect(pitPx('landscape', l.w)).toBeGreaterThanOrEqual(44);
  });
});

describe('seeds in a pit', () => {
  it('seed size follows the count table', () => {
    expect([1, 6, 7, 12, 13, 24, 25, 48, 60].map(seedSize)).toEqual([
      30, 30, 26, 26, 20, 20, 15, 15, 15,
    ]);
  });
  it('seeds spread inside the pit bowl and never share a spot', () => {
    for (const n of [1, 4, 12, 30, 48]) {
      const seen = new Set<string>();
      for (let k = 0; k < n; k++) {
        const s = seedSpot(3, k, n);
        // within the carved bowl: distance from the centre <= 0.72 of the radius (in % of the box) plus a seed
        const d = Math.hypot(s.x - 50, s.y - 50);
        expect(d).toBeLessThanOrEqual(36 + 0.001);
        seen.add(`${s.x.toFixed(2)},${s.y.toFixed(2)}`);
      }
      expect(seen.size).toBe(n);
    }
  });
  it('is deterministic', () => {
    expect(seedSpot(2, 3, 9)).toEqual(seedSpot(2, 3, 9));
  });
  it('seed pictures follow (pit * 7 + k) % 6 and are mostly round (seed-a)', () => {
    expect([0, 1, 2, 3, 4, 5].map((k) => seedVariant(0, k))).toEqual([
      'a',
      'a',
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(seedVariant(1, 3)).toBe('c');
  });
  it('number keys 1..6 map to pits 0..5', () => {
    expect([1, 2, 3, 4, 5, 6].map(pitOfKey)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(keyOfPit(5)).toBe(6);
  });
});
