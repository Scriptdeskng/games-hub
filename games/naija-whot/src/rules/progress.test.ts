import { describe, expect, it } from 'vitest';
import { apply } from './engine';
import { emptyProgress, recordResult, sanitizeProgress, scoreFor } from './progress';
import { id, position } from './testkit';

const won = () =>
  apply(
    position({
      hands: [[id('circle', 3)], [id('star', 1), id('star', 2)]],
      discard: [id('circle', 7)],
    }),
    {
      type: 'play',
      card: id('circle', 3),
    },
  );
const lost = () =>
  position({
    hands: [[id('circle', 3), id('star', 3)], [id('star', 1)]],
    discard: [id('circle', 7)],
  });

describe('progress', () => {
  it('starts empty and repairs garbage', () => {
    expect(emptyProgress().rules.stackTwo).toBe(true);
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    const p = sanitizeProgress({
      best: { easy: -3, medium: 'x', hard: 40.7 },
      plays: 4,
      games: 1,
      wins: 99,
      streak: 2,
      bestStreak: 0,
      bestCatches: 3,
      lastDifficulty: 'hard',
      cpuCount: 2,
      rules: { stackTwo: false },
      autoDraw: false,
      fastPlay: true,
    });
    expect(p).toMatchObject({
      plays: 4,
      games: 4,
      wins: 4,
      bestStreak: 2,
      cpuCount: 2,
      autoDraw: false,
      fastPlay: true,
    });
    expect(p.best).toEqual({ easy: 0, medium: 0, hard: 40 });
    expect(p.rules.stackTwo).toBe(false);
    expect(sanitizeProgress({ cpuCount: 7, lastDifficulty: 'insane' })).toMatchObject({
      cpuCount: 1,
      lastDifficulty: 'medium',
    });
  });
  it('scores a win above a loss and rewards cards left in CPU hands', () => {
    expect(scoreFor(won(), 'you')).toBeGreaterThan(300);
    expect(scoreFor(lost(), 'you')).toBe(30);
    expect(scoreFor(won(), 'you')).toBeGreaterThan(scoreFor(lost(), 'you'));
  });
  it('records wins, streaks, bests and catches', () => {
    const a = recordResult(emptyProgress(), won(), 'hard', 'you', 2);
    expect(a.newBest).toBe(true);
    expect(a.next).toMatchObject({
      plays: 1,
      wins: 1,
      streak: 1,
      bestStreak: 1,
      bestCatches: 2,
      lastDifficulty: 'hard',
    });
    const b = recordResult(a.next, { ...lost(), winner: 'c1' }, 'hard', 'you', 0);
    expect(b.newBest).toBe(false);
    expect(b.next).toMatchObject({ plays: 2, wins: 1, streak: 0, bestStreak: 1, bestCatches: 2 });
    expect(b.next.best.hard).toBe(a.next.best.hard);
  });
});
