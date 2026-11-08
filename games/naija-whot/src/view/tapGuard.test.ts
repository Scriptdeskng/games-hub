import { describe, expect, it } from 'vitest';
import { DRAW_AFTER_CARD_MS, createTapGuard } from './tapGuard';

describe('tap guard', () => {
  it('refuses a market draw right after a card tap, allows it later', () => {
    let t = 1000;
    const g = createTapGuard(() => t);
    expect(g.drawAllowed()).toBe(true);
    g.cardTapped();
    t += 50;
    expect(g.drawAllowed()).toBe(false);
    t += DRAW_AFTER_CARD_MS;
    expect(g.drawAllowed()).toBe(true);
  });
  it('runs a second tap during an in-flight action zero times', async () => {
    const g = createTapGuard(() => 0);
    let runs = 0;
    let release!: () => void;
    const first = g.once(
      () =>
        new Promise<void>((r) => {
          runs++;
          release = r;
        }),
    );
    expect(g.busy).toBe(true);
    await g.once(async () => {
      runs++;
    });
    expect(runs).toBe(1);
    release();
    await first;
    expect(g.busy).toBe(false);
    await g.once(async () => {
      runs++;
    });
    expect(runs).toBe(2);
  });
  it('frees the guard when the action throws', async () => {
    const g = createTapGuard(() => 0);
    await expect(g.once(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(g.busy).toBe(false);
  });
});
