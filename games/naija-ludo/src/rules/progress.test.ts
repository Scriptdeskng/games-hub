import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, HOME } from './config';
import { createGame, type GameState } from './engine';
import { emptyProgress, recordResult, sanitizeProgress, scoreFor } from './progress';

const game = (seeds: number[], winner: string | null = null, quick = false): GameState => {
  const s = createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpus: [{ id: 'c', name: 'C' }],
    rules: { quick },
  });
  return {
    ...s,
    players: s.players.map((p, i) => (i === 0 ? { ...p, seeds } : p)),
    winner,
    phase: winner ? 'over' : 'roll',
    turns: { ...s.turns, taken: [30, 28] },
  };
};

describe('sanitizeProgress', () => {
  it('starts empty, with auto-move on and one CPU', () => {
    const p = emptyProgress();
    expect(p.autoMove).toBe(true);
    expect(p.fastPlay).toBe(false);
    expect(p.cpuCount).toBe(1);
    expect(p.rules).toEqual(DEFAULT_RULES);
  });
  it('repairs junk from storage or the portal', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const p = sanitizeProgress({
      best: { easy: 5, medium: -3, hard: 'x' },
      plays: 4,
      games: 1,
      wins: 99,
      streak: 2,
      bestStreak: 1,
      bestCaptures: 7.9,
      lastDifficulty: 'nope',
      cpuCount: 2, // 2 is not an offered count
      rules: { stacks: 'block', exactHome: 'maybe' },
      autoMove: false,
      fastPlay: true,
    });
    expect(p.best).toEqual({ easy: 5, medium: 0, hard: 0 });
    expect(p.games).toBe(4);
    expect(p.wins).toBe(4);
    expect(p.bestStreak).toBe(2);
    expect(p.bestCaptures).toBe(7);
    expect(p.lastDifficulty).toBe('medium');
    expect(p.cpuCount).toBe(1);
    expect(p.rules.stacks).toBe('block');
    expect(p.rules.exactHome).toBe(true);
    expect(p.autoMove).toBe(false);
    expect(p.fastPlay).toBe(true);
    expect(sanitizeProgress({ cpuCount: 3, lastDifficulty: 'hard' })).toMatchObject({
      cpuCount: 3,
      lastDifficulty: 'hard',
    });
  });
});

describe('score and results', () => {
  it('scores progress of every seed, plus a bonus for a fast win', () => {
    const lost = game([10, -1, -1, -1]);
    expect(scoreFor(lost, 'you')).toBe((10 + 1) * 2);
    const won = game([HOME, HOME, HOME, HOME], 'you');
    const slow = { ...won, turns: { ...won.turns, taken: [400, 10] } };
    expect(scoreFor(won, 'you')).toBeGreaterThan(scoreFor(slow, 'you'));
    expect(scoreFor(won, 'you')).toBeGreaterThan(scoreFor(lost, 'you'));
    expect(scoreFor(won, 'c')).toBe(0);
  });

  it('a win records the best, the streak and the captures; a loss resets the streak', () => {
    const won = game([HOME, HOME, HOME, HOME], 'you');
    const a = recordResult(emptyProgress(), won, 'hard', 'you', 5);
    expect(a.newBest).toBe(true);
    expect(a.next).toMatchObject({ plays: 1, wins: 1, streak: 1, bestStreak: 1, bestCaptures: 5 });
    expect(a.next.best.hard).toBeGreaterThan(0);
    const again = recordResult(a.next, won, 'hard', 'you', 2);
    expect(again.newBest).toBe(false);
    expect(again.next).toMatchObject({ streak: 2, bestCaptures: 5 });
    const lost = game([20, 3, -1, -1], 'c');
    const b = recordResult(again.next, lost, 'hard', 'you', 0);
    expect(b.newBest).toBe(false); // a loss never earns the banner
    expect(b.next).toMatchObject({ streak: 0, bestStreak: 2, wins: 2, plays: 3 });
  });

  it('quick mode wins score by the same rule', () => {
    const won = game([HOME, 3], 'you', true);
    expect(scoreFor(won, 'you')).toBeGreaterThan(300);
  });
});
