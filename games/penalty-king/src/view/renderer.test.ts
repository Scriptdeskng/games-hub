import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFlow } from '../play/flow';
import { createRenderer } from './renderer';

const EMPTY = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 };

/** a recording 2D context: enough surface for the renderer's fallback shapes and blits */
const fakeCtx = () => {
  const calls: Record<string, number> = {};
  const ctx = new Proxy(
    {},
    {
      get: (_t, p: string) => {
        if (p === 'canvas') return null;
        return (..._a: unknown[]) => {
          calls[p] = (calls[p] ?? 0) + 1;
        };
      },
      set: () => true,
    },
  );
  return { ctx, calls };
};

describe('renderer', () => {
  let cv: HTMLCanvasElement;
  let rec: ReturnType<typeof fakeCtx>;
  beforeEach(() => {
    rec = fakeCtx();
    cv = document.createElement('canvas');
    cv.getContext = (() => rec.ctx) as never;
  });
  const flow = (first: 0 | 1 = 0) =>
    createFlow({
      mode: 'quick',
      difficulty: 'medium',
      seed: 3,
      teams: ['lanterns', 'sparks'],
      habit: EMPTY,
      first,
      emit: () => undefined,
    });

  it('sizes the canvas in device pixels (pixel ratio capped at 2) and keeps the layout', () => {
    const r = createRenderer(cv);
    r.resize(360, 640, 3);
    expect(cv.width).toBe(720);
    expect(cv.height).toBe(1280);
    expect(r.layout.dpr).toBe(2);
    r.resize(812, 375, 1);
    expect(r.layout.landscape).toBe(true);
    expect(cv.width).toBe(812);
  });

  it('draws plain shapes when no art has loaded (a failed download never leaves the field empty)', () => {
    const r = createRenderer(cv);
    r.resize(360, 640, 1);
    const f = flow();
    f.update(1.2);
    f.update(0.016);
    r.invalidate();
    r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
    expect(rec.calls.clearRect).toBe(1);
    expect(rec.calls.fillRect).toBeGreaterThanOrEqual(2); // keeper and striker
    expect(rec.calls.arc).toBeGreaterThanOrEqual(3); // heads and the ball
  });

  it('skips the frame when nothing moves (ready, not invalidated) and always draws while the ball is moving', () => {
    const r = createRenderer(cv);
    r.resize(360, 640, 1);
    const f = flow();
    f.update(1.2); // intro -> ready
    r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
    const n = rec.calls.clearRect ?? 0;
    r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
    expect(rec.calls.clearRect ?? 0).toBe(n);
    r.invalidate();
    r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
    expect(rec.calls.clearRect).toBe(n + 1);
    f.shoot({ aimX: 2, aimY: 1.5, power: 0.6, curve: 0 });
    for (let i = 0; i < 60; i++) {
      f.update(1 / 60);
      r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
    }
    expect(rec.calls.clearRect!).toBeGreaterThan(n + 50);
  });

  it('draws every phase for both strikers without throwing, and the ball stays on a finite spot', () => {
    const r = createRenderer(cv);
    for (const [w, h] of [
      [360, 640],
      [812, 375],
      [1280, 800],
    ] as const) {
      r.resize(w, h, 2);
      for (const first of [0, 1] as const) {
        const f = flow(first);
        for (let i = 0; i < 60 * 20; i++) {
          if (f.canShoot()) f.shoot({ aimX: 3, aimY: 2, power: 0.6, curve: 0.5 });
          if (f.canDive()) f.dive('ul');
          f.update(1 / 30);
          r.draw(f.frame, { teams: ['lanterns', 'sparks'] });
          const p = r.pointAt(f.frame.ball.x, f.frame.ball.y, f.frame.ball.s, { x: 0, y: 0, k: 0 });
          expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.k)).toBe(true);
        }
      }
    }
  });

  it('copes with a canvas that has no 2D context at all', () => {
    cv.getContext = (() => null) as never;
    const r = createRenderer(cv);
    r.resize(360, 640, 1);
    expect(() => r.draw(flow().frame, { teams: ['lanterns', 'sparks'] })).not.toThrow();
    r.destroy();
    vi.restoreAllMocks();
  });
});
