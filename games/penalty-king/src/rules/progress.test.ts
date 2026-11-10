import { describe, expect, it } from 'vitest';
import { applyKick, createShootout, type KickRecord, type Shootout } from './shootout';
import {
  HABIT_DECAY,
  emptyHabit,
  emptyProgress,
  matchScore,
  noteShot,
  recordCup,
  recordResult,
  sanitizeProgress,
  starsFor,
} from './progress';
import type { KickOutcome } from '../physics';

const rec = (
  outcome: KickOutcome,
  power: 1 | 2 | 3 | 4 | 5 = 3,
  zone: KickRecord['zone'] = 'ul',
): KickRecord => ({
  side: 0,
  outcome,
  impact: 'in',
  zone,
  power,
  curve: 0,
  dive: null,
});
const play = (outs: [KickOutcome, (1 | 2 | 3 | 4 | 5)?, KickRecord['zone']?][]): Shootout =>
  outs.reduce(
    (s, [o, p, z]) => applyKick(s, rec(o, p ?? 3, z)),
    createShootout({ seed: 1, teams: ['lanterns', 'sparks'], first: 0 }),
  );

describe('progress', () => {
  it('starts empty and sanitises garbage from storage or the portal', () => {
    expect(emptyProgress().plays).toBe(0);
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const dirty = sanitizeProgress({
      plays: 3,
      wins: 99,
      goals: -5,
      saves: NaN,
      cups: 2,
      cupsWon: 9,
      bestRun: 77,
      streak: 2,
      bestStreak: 1,
      best: { easy: 100, medium: 'x', hard: Infinity },
      lastDifficulty: 'nope',
      lastMode: 'practice',
      habit: { ul: 50, u: -1, ur: 'a' },
    });
    expect(dirty).toMatchObject({
      plays: 3,
      wins: 3,
      goals: 0,
      saves: 0,
      cupsWon: 2,
      bestRun: 3,
      bestStreak: 2,
      lastDifficulty: 'medium',
      lastMode: 'practice',
    });
    expect(dirty.best).toEqual({ easy: 100, medium: 0, hard: 0 });
    expect(dirty.habit).toMatchObject({ ul: 20, u: 0, ur: 0 });
  });

  it('keeps the last difficulty and mode when they are valid', () => {
    expect(sanitizeProgress({ lastDifficulty: 'hard', lastMode: 'quick' })).toMatchObject({
      lastDifficulty: 'hard',
      lastMode: 'quick',
    });
  });
});

describe('score and stars', () => {
  it('scores goals, saves, sweet goals and the win bonus, scaled by level', () => {
    // A G(sweet), B saved, A G(sweet), B saved, A G(sweet), B saved -> 3-0 early win with 3 saves
    const s = play([['goal'], ['saved'], ['goal'], ['saved'], ['goal'], ['saved']]);
    expect(s.winner).toBe(0);
    const raw = 3 * 100 + 3 * 80 + 3 * 25 + 300;
    expect(matchScore(s, 'easy')).toBe(raw);
    expect(matchScore(s, 'medium')).toBe(Math.round(raw * 1.25));
    expect(matchScore(s, 'hard')).toBe(Math.round(raw * 1.5));
    expect(starsFor(s)).toBe(3);
  });

  it('a loss earns the goals and saves but no bonus and no stars', () => {
    const s = play([['miss'], ['goal'], ['miss'], ['goal'], ['miss'], ['goal']]);
    expect(s.winner).toBe(1);
    expect(matchScore(s, 'easy')).toBe(0);
    expect(starsFor(s)).toBe(0);
  });

  it('stars: one for a win, one more for conceding two or fewer, one more for two sweet goals', () => {
    const lowPower = play([
      ['goal', 4],
      ['goal'],
      ['goal', 4],
      ['goal'],
      ['goal', 4],
      ['goal'],
      ['goal', 4],
      ['saved'],
      ['goal', 4],
      ['saved'],
    ]);
    expect(lowPower.winner === 0 || lowPower.winner === 1).toBe(true);
    const win = play([['goal', 2], ['saved'], ['goal', 2], ['saved'], ['goal', 2], ['saved']]);
    expect(starsFor(win)).toBe(2); // won, conceded none, but no sweet goals
  });
});

describe('recordResult', () => {
  it('counts the match, goals, saves, the streak and the best score, and learns the habit', () => {
    const s = play([
      ['goal', 3, 'ur'],
      ['saved'],
      ['goal', 3, 'ur'],
      ['saved'],
      ['goal', 3, 'ur'],
      ['saved'],
    ]);
    const r = recordResult(emptyProgress(), s, 'hard', 'quick');
    expect(r.next).toMatchObject({
      plays: 1,
      wins: 1,
      goals: 3,
      conceded: 0,
      saves: 3,
      sweet: 3,
      streak: 1,
      bestStreak: 1,
      lastDifficulty: 'hard',
      lastMode: 'quick',
    });
    expect(r.newBest).toBe(true);
    expect(r.score).toBe(r.next.best.hard);
    expect(r.next.habit.ur).toBeGreaterThan(2);
    expect(r.next.habit.ul).toBe(0);
    const again = recordResult(r.next, s, 'hard', 'quick');
    expect(again.newBest).toBe(false);
    expect(again.next).toMatchObject({ plays: 2, streak: 2 });
  });

  it('a loss resets the streak and keeps the best', () => {
    const win = play([['goal'], ['saved'], ['goal'], ['saved'], ['goal'], ['saved']]);
    const loss = play([['miss'], ['goal'], ['miss'], ['goal'], ['miss'], ['goal']]);
    let p = recordResult(emptyProgress(), win, 'easy', 'cup').next;
    p = recordResult(p, loss, 'easy', 'cup').next;
    expect(p).toMatchObject({ plays: 2, wins: 1, streak: 0, bestStreak: 1 });
    expect(p.best.easy).toBeGreaterThan(0);
  });

  it('habit is bounded however much is played', () => {
    let h = emptyHabit();
    for (let i = 0; i < 5000; i++) h = noteShot(h, 'ul');
    expect(h.ul).toBeLessThan(1 / (1 - HABIT_DECAY) + 0.01);
    expect(noteShot(emptyHabit(), 'zz' as never)).toEqual(emptyHabit());
  });

  it('records a cup run', () => {
    const p = recordCup(emptyProgress(), 2, false);
    expect(p).toMatchObject({ cups: 1, cupsWon: 0, bestRun: 2 });
    expect(recordCup(p, 3, true)).toMatchObject({ cups: 2, cupsWon: 1, bestRun: 3 });
    expect(recordCup(p, 9, false).bestRun).toBe(3);
  });
});
