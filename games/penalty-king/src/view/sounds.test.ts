import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScope } from '@naija/core/lifecycle';
import { penaltySfx } from '../audio/sfx';
import { makeCore } from '../test-utils';
import { createSounds } from './sounds';

describe('sound director', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const { core } = makeCore();
    const played: { name: string; pitch?: number }[] = [];
    vi.spyOn(core.audio, 'playSfx').mockImplementation(
      (name, o) => void played.push({ name, pitch: o?.pitch }),
    );
    const scope = createScope();
    return { s: createSounds(core, scope), played, scope };
  };

  it('plays every cue of penaltySfx by name somewhere (nothing is silent)', () => {
    const { s, played, scope } = setup();
    s.roundStart();
    s.runup();
    s.strike();
    s.dive();
    s.aimTick(10);
    s.aimLock();
    s.powerTick(1);
    for (const o of ['goal', 'saved', 'post', 'miss'] as const)
      for (const human of [true, false]) s.result(o, human);
    s.sudden();
    s.bracketAdvance();
    s.shootoutWin();
    s.shootoutLose();
    vi.advanceTimersByTime(500);
    const names = new Set(played.map((p) => p.name));
    for (const cue of Object.keys(penaltySfx)) expect(names.has(cue), cue).toBe(true);
    scope.destroy();
  });

  it('aimTick plays at most 8 times a second', () => {
    const { s, played } = setup();
    for (let t = 0; t < 1; t += 0.01) s.aimTick(t);
    expect(played.filter((p) => p.name === 'aimTick').length).toBeLessThanOrEqual(8);
    expect(played.filter((p) => p.name === 'aimTick').length).toBeGreaterThan(5);
  });

  it('powerTick climbs 4 percent a tick and stops at +40 percent', () => {
    const { s, played } = setup();
    for (let n = 1; n <= 20; n++) s.powerTick(n);
    const pitches = played.map((p) => p.pitch as number);
    expect(pitches[0]).toBeCloseTo(1.04, 9);
    expect(pitches[4]).toBeCloseTo(1.2, 9);
    expect(Math.max(...pitches)).toBeCloseTo(1.4, 9);
    for (let i = 1; i < pitches.length; i++)
      expect(pitches[i]!).toBeGreaterThanOrEqual(pitches[i - 1]!);
  });

  it('crowdGoal follows netIn after about 150 ms; crowdGroan follows a miss, a post or a CPU goal', () => {
    const { s, played } = setup();
    s.result('goal', true);
    expect(played.map((p) => p.name)).toEqual(['netIn']);
    vi.advanceTimersByTime(160);
    expect(played.map((p) => p.name)).toEqual(['netIn', 'crowdGoal']);
    played.length = 0;
    s.result('goal', false);
    vi.advanceTimersByTime(160);
    expect(played.map((p) => p.name)).toEqual(['netIn', 'crowdGroan']);
    played.length = 0;
    s.result('miss', true);
    s.result('post', true);
    vi.advanceTimersByTime(300);
    expect(played.map((p) => p.name)).toEqual(['crowdGroan', 'postHit', 'crowdGroan']);
  });

  it('pending crowd cues are cancelled when the scope is destroyed', () => {
    const { s, played, scope } = setup();
    s.result('goal', true);
    scope.destroy();
    vi.advanceTimersByTime(500);
    expect(played.map((p) => p.name)).toEqual(['netIn']);
  });
});
