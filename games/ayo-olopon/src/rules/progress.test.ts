import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './config';
import { createGame, type GameState } from './engine';
import { emptyProgress, recordResult, sanitizeProgress, scoreFor } from './progress';

const finished = (store: [number, number], winner: string | null, plies = 40): GameState => ({
  ...createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpu: { id: 'cpu', name: 'CPU' },
    first: 0,
  }),
  store,
  winner,
  draw: winner === null,
  plies,
  end: { reason: 'score', swept: [0, 0] },
});

describe('sanitizeProgress', () => {
  it('starts empty: default rules, normal speed', () => {
    const p = emptyProgress();
    expect(p.rules).toEqual(DEFAULT_RULES);
    expect(p.fastPlay).toBe(false);
    expect(p.lastDifficulty).toBe('medium');
  });
  it('repairs junk from storage or the portal', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const p = sanitizeProgress({
      best: { easy: 5, medium: -3, hard: 'x' },
      plays: 4,
      games: 1,
      wins: 99,
      draws: 99,
      streak: 2,
      bestStreak: 1,
      bestCapture: 700,
      lastDifficulty: 'nope',
      rules: { capture: 'threeOnly', mustFeed: 'maybe' },
      fastPlay: true,
    });
    expect(p.best).toEqual({ easy: 5, medium: 0, hard: 0 });
    expect(p.games).toBe(4);
    expect(p.wins).toBe(4);
    expect(p.draws).toBe(0);
    expect(p.bestStreak).toBe(2);
    expect(p.bestCapture).toBe(48);
    expect(p.lastDifficulty).toBe('medium');
    expect(p.rules.capture).toBe('threeOnly');
    expect(p.rules.mustFeed).toBe(true);
    expect(p.fastPlay).toBe(true);
  });
  it('keeps good values and a valid difficulty', () => {
    const p = sanitizeProgress({
      lastDifficulty: 'hard',
      plays: 3,
      wins: 2,
      draws: 1,
      bestCapture: 9,
    });
    expect([p.lastDifficulty, p.plays, p.wins, p.draws, p.bestCapture]).toEqual([
      'hard',
      3,
      2,
      1,
      9,
    ]);
  });
});

describe('score', () => {
  it('10 points per seed, plus a win bonus that rewards a shorter game', () => {
    expect(scoreFor(finished([20, 30], null), 'you')).toBe(200);
    expect(scoreFor(finished([20, 30], 'cpu'), 'you')).toBe(200);
    const quick = scoreFor(finished([25, 10], 'you', 40), 'you');
    const slow = scoreFor(finished([25, 10], 'you', 120), 'you');
    expect(quick).toBe(250 + 200 + 160 * 5);
    expect(quick).toBeGreaterThan(slow);
    expect(scoreFor(finished([25, 10], 'you', 400), 'you')).toBe(250 + 200);
  });
  it('scores the CPU seat too (the human is not always seat 0)', () => {
    const s = finished([10, 26], 'cpu');
    expect(scoreFor(s, 'cpu')).toBe(260 + 200 + 160 * 5);
  });
});

describe('recordResult', () => {
  it('counts a win, a streak and a best score per difficulty', () => {
    const win = finished([26, 10], 'you');
    const a = recordResult(emptyProgress(), win, 'hard', 'you', 7);
    expect(a.newBest).toBe(true);
    expect([a.next.plays, a.next.wins, a.next.streak, a.next.bestCapture]).toEqual([1, 1, 1, 7]);
    expect(a.next.best.hard).toBe(scoreFor(win, 'you'));
    expect(a.next.lastDifficulty).toBe('hard');
    const b = recordResult(a.next, win, 'hard', 'you', 3);
    expect(b.newBest).toBe(false);
    expect([b.next.streak, b.next.bestStreak, b.next.bestCapture]).toEqual([2, 2, 7]);
  });
  it('a loss ends the streak, a draw keeps it and is counted', () => {
    const lost = recordResult(
      { ...emptyProgress(), streak: 3, bestStreak: 3 },
      finished([10, 26], 'cpu'),
      'easy',
      'you',
      0,
    );
    expect([lost.next.streak, lost.next.bestStreak, lost.next.wins, lost.newBest]).toEqual([
      0,
      3,
      0,
      false,
    ]);
    const draw = recordResult(
      { ...emptyProgress(), streak: 2 },
      finished([24, 24], null),
      'easy',
      'you',
      2,
    );
    expect([draw.next.streak, draw.next.draws, draw.next.plays, draw.next.wins]).toEqual([
      2, 1, 1, 0,
    ]);
  });
});
