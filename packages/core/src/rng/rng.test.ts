import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng, randomSeed, seedFromString } from './index';

describe('rng', () => {
  it('same seed gives the same sequence; different seeds differ', () => {
    const a = createRng(7);
    const b = createRng(7);
    const c = createRng(8);
    const sa = Array.from({ length: 5 }, () => a.next());
    expect(sa).toEqual(Array.from({ length: 5 }, () => b.next()));
    expect(sa).not.toEqual(Array.from({ length: 5 }, () => c.next()));
  });
  it('next is in [0,1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int is inclusive and range is half-open', () => {
    const r = createRng(2);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (let i = 0; i < 100; i++) {
      const v = r.range(5, 7);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(7);
    }
  });
  it('state can be saved and restored', () => {
    const r = createRng(3);
    r.next();
    const s = r.getState();
    const expected = [r.next(), r.next()];
    r.setState(s);
    expect([r.next(), r.next()]).toEqual(expected);
  });
  it('shuffle keeps all items, is deterministic, and does not mutate', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng(4).shuffle(items);
    expect(a).toEqual(createRng(4).shuffle(items));
    expect([...a].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('pick and chance behave', () => {
    const r = createRng(5);
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  });
  it('seedFromString is stable', () => {
    expect(seedFromString('2026-11-07')).toBe(seedFromString('2026-11-07'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });
});

describe('randomSeed', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('is a 31-bit integer that does not follow the clock', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(seeds.size).toBeGreaterThan(45);
    for (const s of seeds) {
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0x7fffffff);
    }
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const a = randomSeed();
    const b = randomSeed();
    vi.useRealTimers();
    expect(a).not.toBe(b);
  });
  it('reads crypto.getRandomValues when it exists', () => {
    const getRandomValues = vi.fn((a: Uint32Array) => {
      a[0] = 0xffffffff;
      return a;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    expect(randomSeed()).toBe(0x7fffffff);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });
  it('falls back to Math.random without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(randomSeed()).toBe(0x40000000);
    vi.restoreAllMocks();
  });
});
