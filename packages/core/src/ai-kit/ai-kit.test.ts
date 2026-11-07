import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScope, leakCounters } from '../lifecycle';
import { createRng } from '../rng';
import { createBanter, createBubbleView } from './banter';
import { createCpu, withMistakes } from './cpu';
import { THINK_MAX_MS, THINK_MIN_MS, createThinker, thinkDelayMs } from './think';
import { PROFILES, isDifficulty, type Brain, type Persona } from './types';

const persona: Persona = {
  id: 'tari',
  nameKey: 'persona.tari.name',
  avatar: './avatars/tari.svg',
  banter: { start: ['a', 'b'], win: ['w'] },
};

describe('think delay', () => {
  it('is always 0.4 to 1.2 s, seeded, and uses the whole range', () => {
    const rng = createRng(1);
    const xs = Array.from({ length: 400 }, () => thinkDelayMs(rng));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(THINK_MIN_MS);
    expect(Math.max(...xs)).toBeLessThanOrEqual(THINK_MAX_MS);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(500);
    const a = createRng(7);
    const b = createRng(7);
    expect(thinkDelayMs(a)).toBe(thinkDelayMs(b));
  });

  it('honours a persona range and clamps silly ranges and scales', () => {
    const rng = createRng(2);
    const quick = { ...persona, think: [400, 600] as const };
    for (let i = 0; i < 100; i++) {
      const v = thinkDelayMs(rng, quick);
      expect(v).toBeGreaterThanOrEqual(400);
      expect(v).toBeLessThanOrEqual(600);
    }
    const silly = { ...persona, think: [5000, 90] as const };
    for (let i = 0; i < 50; i++) {
      const v = thinkDelayMs(rng, silly, PROFILES.hard);
      expect(v).toBeGreaterThanOrEqual(THINK_MIN_MS);
      expect(v).toBeLessThanOrEqual(THINK_MAX_MS);
    }
  });
});

describe('thinker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits through the scope and can be cancelled or destroyed', () => {
    const scope = createScope();
    const th = createThinker(scope);
    const fn = vi.fn();
    th.after(500, fn);
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    const cancelled = vi.fn();
    th.after(500, cancelled)();
    const destroyed = vi.fn();
    th.after(500, destroyed);
    expect(leakCounters().timers).toBe(1);
    scope.destroy();
    vi.advanceTimersByTime(1000);
    expect(cancelled).not.toHaveBeenCalled();
    expect(destroyed).not.toHaveBeenCalled();
    expect(leakCounters().timers).toBe(0);
  });

  it('runs at once when instant (test autoplay)', () => {
    const th = createThinker(createScope(), () => true);
    const fn = vi.fn();
    th.after(900, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('cpu opponent', () => {
  const brains = {
    easy: { decide: (_: number, rng) => rng.int(0, 9) } satisfies Brain<number, number>,
    medium: { decide: (n: number) => n + 1 } satisfies Brain<number, number>,
    hard: { decide: (n: number) => n + 2 } satisfies Brain<number, number>,
  };

  it('uses the brain of its difficulty, with its own seeded rng', () => {
    const mk = (difficulty: 'easy' | 'medium' | 'hard', seed = 3) =>
      createCpu({ id: 'c', persona, difficulty, brains, seed });
    expect(mk('medium').decide(10)).toBe(11);
    expect(mk('hard').decide(10)).toBe(12);
    const a = mk('easy');
    const b = mk('easy');
    expect([a.decide(0), a.decide(0), a.thinkMs()]).toEqual([
      b.decide(0),
      b.decide(0),
      b.thinkMs(),
    ]);
    expect(a.profile).toBe(PROFILES.easy);
    expect(a.persona.id).toBe('tari');
    expect(a.getRngState()).toBe(b.getRngState());
  });

  it('profiles get stronger with difficulty', () => {
    expect(PROFILES.easy.skill).toBeLessThan(PROFILES.medium.skill);
    expect(PROFILES.medium.skill).toBeLessThan(PROFILES.hard.skill);
    expect(PROFILES.easy.mistakeRate).toBeGreaterThan(PROFILES.medium.mistakeRate);
    expect(PROFILES.medium.mistakeRate).toBeGreaterThan(PROFILES.hard.mistakeRate);
    expect(isDifficulty('hard')).toBe(true);
    expect(isDifficulty('legend')).toBe(false);
  });

  it('withMistakes follows the mistake rate', () => {
    const rng = createRng(4);
    let wrong = 0;
    for (let i = 0; i < 1000; i++)
      wrong += withMistakes(
        rng,
        0.3,
        () => 0,
        () => 1,
      );
    expect(wrong / 1000).toBeGreaterThan(0.24);
    expect(wrong / 1000).toBeLessThan(0.36);
    expect(
      withMistakes(
        rng,
        0,
        () => 'best',
        () => 'random',
      ),
    ).toBe('best');
    expect(
      withMistakes(
        rng,
        1,
        () => 'best',
        () => 'random',
      ),
    ).toBe('random');
  });
});

describe('banter', () => {
  const t = (k: string): string => `[${k}]`;

  it('shows a seeded line from the persona, with cooldown and per-game cap', () => {
    let now = 0;
    const shown: string[] = [];
    const b = createBanter({
      t,
      rng: createRng(1),
      show: (l) => shown.push(l.text),
      now: () => now,
      cooldownMs: 1000,
      max: 3,
    });
    expect(b.say(persona, 'start')).toBe(true);
    expect(shown[0]).toMatch(/^\[(a|b)\]$/);
    expect(b.say(persona, 'win')).toBe(false); // cooling down
    now = 1500;
    expect(b.say(persona, 'win')).toBe(true);
    expect(b.say(persona, 'idle')).toBe(false); // persona has no idle lines
    now = 3000;
    expect(b.say(persona, 'start', { force: true })).toBe(true);
    now = 9000;
    expect(b.say(persona, 'start')).toBe(false); // cap of 3 reached
    expect(b.count).toBe(3);
  });

  it('chance gates optional events', () => {
    let now = 0;
    const p = { ...persona, banter: { good: ['x'] } };
    const never = createBanter({
      t,
      rng: createRng(1),
      show: () => undefined,
      now: () => (now += 5000),
      chance: { good: 0 },
    });
    expect(never.say(p, 'good')).toBe(false);
    const always = createBanter({
      t,
      rng: createRng(1),
      show: () => undefined,
      now: () => (now += 5000),
      chance: { good: 1 },
    });
    expect(always.say(p, 'good')).toBe(true);
    // default chance for optional events is below 1: some of many fire, some do not
    const some = createBanter({
      t,
      rng: createRng(9),
      max: 1000,
      show: () => undefined,
      now: () => (now += 5000),
    });
    const fired = Array.from({ length: 200 }, () => some.say(p, 'good')).filter(Boolean).length;
    expect(fired).toBeGreaterThan(40);
    expect(fired).toBeLessThan(150);
  });
});

describe('bubble view', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows one bubble at a time, fades and removes it, and cleans up', () => {
    const scope = createScope();
    const v = createBubbleView(scope, { name: () => 'Tari', ms: 1000 });
    expect(v.el.getAttribute('role')).toBe('status');
    v.show({ persona, event: 'start', text: 'Omo, easy' });
    expect(v.el.textContent).toContain('Tari: Omo, easy');
    expect(v.el.querySelector('img')?.getAttribute('src')).toBe('./avatars/tari.svg');
    v.show({ persona, event: 'start', text: 'Second' });
    expect(v.el.querySelectorAll('.ng-banter')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(v.el.querySelector('.ng-banter')?.classList.contains('is-out')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(v.el.querySelector('.ng-banter')).toBeNull();
    v.show({ persona, event: 'start', text: 'Third' });
    v.clear();
    expect(v.el.childElementCount).toBe(0);
    v.show({ persona, event: 'start', text: 'Fourth' });
    scope.destroy();
    expect(leakCounters().timers).toBe(0);
    expect(v.el.childElementCount).toBe(0);
  });

  it('defaults the name to the persona id', () => {
    const scope = createScope();
    const v = createBubbleView(scope);
    v.show({ persona, event: 'start', text: 'hi' });
    expect(v.el.textContent).toContain('tari: hi');
    scope.destroy();
  });
});
