import { describe, expect, it } from 'vitest';
import { createGame, apply, type GameState } from './engine';
import { emptyProgress, recordResult, sanitizeProgress, scoreFor } from './progress';

const won = (winner: 'you' | 'cpu1', turns = 3): GameState => {
  const s = createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpus: [{ id: 'cpu1', name: 'Tari' }],
    rules: { reroll: false, choiceDice: false },
  });
  const players = s.players.map((p) => ({ ...p, pos: p.id === winner ? 100 : 40 }));
  const taken = s.turns.seats.map((x) => (x.id === winner ? turns - 1 : turns));
  const idx = s.turns.seats.findIndex((x) => x.id === winner);
  return {
    ...s,
    players,
    winner,
    phase: 'over',
    turns: { ...s.turns, index: idx, taken },
    lastMove: {
      playerId: winner,
      turn: turns,
      from: 97,
      roll: 3,
      rolledFrom: null,
      picked: null,
      landed: 100,
      to: 100,
      via: null,
      jumpId: null,
      overshoot: false,
      won: true,
    },
  };
};

describe('progress', () => {
  it('starts empty with default rules', () => {
    const p = emptyProgress();
    expect(p).toMatchObject({
      plays: 0,
      wins: 0,
      streak: 0,
      cpuCount: 1,
      lastDifficulty: 'medium',
    });
    expect(p.rules.exactFinish).toBe(true);
  });

  it('sanitizes garbage from storage', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const p = sanitizeProgress({
      best: { easy: -4, medium: 'x', hard: 12.7 },
      plays: 3,
      wins: 99,
      streak: 2,
      bestStreak: 1,
      fastestWin: 'n',
      lastDifficulty: 'legend',
      cpuCount: 9,
      rules: { exactFinish: false, reroll: 'yes', choiceEvery: 1 },
    });
    expect(p.best).toEqual({ easy: 0, medium: 0, hard: 12 });
    expect(p.wins).toBe(3); // never more wins than plays
    expect(p.bestStreak).toBe(2);
    expect(p.fastestWin).toBe(0);
    expect(p.lastDifficulty).toBe('medium');
    expect(p.cpuCount).toBe(1);
    expect(p.rules).toEqual({ exactFinish: false, reroll: true, choiceDice: true, choiceEvery: 5 });
    expect(
      sanitizeProgress({ lastDifficulty: 'hard', cpuCount: 3, rules: { choiceEvery: 8 } }),
    ).toMatchObject({
      lastDifficulty: 'hard',
      cpuCount: 3,
      rules: { choiceEvery: 8 },
    });
    expect(sanitizeProgress({ rules: { choiceEvery: 99 } }).rules.choiceEvery).toBe(20);
  });

  it('score rewards winning fast and otherwise tracks progress', () => {
    expect(scoreFor(won('you', 20), 'you')).toBe(500 + 80 * 5);
    expect(scoreFor(won('you', 150), 'you')).toBe(500);
    expect(scoreFor(won('cpu1'), 'you')).toBe(200); // human on 40
  });

  it('a new best is only announced for a win, never for a loss', () => {
    const p = emptyProgress();
    const lost = recordResult(p, won('cpu1'), 'hard', 'you');
    expect(scoreFor(won('cpu1'), 'you')).toBeGreaterThan(p.best.hard); // a record-sized score...
    expect(lost.newBest).toBe(false); // ...but no banner for a loss
    expect(lost.next.best.hard).toBe(200);
    expect(recordResult(p, won('you', 30), 'hard', 'you').newBest).toBe(true);
  });

  it('counts started games for the persona rotation, never fewer than plays', () => {
    expect(emptyProgress().games).toBe(0);
    expect(sanitizeProgress({ plays: 4, games: 1 }).games).toBe(4);
    expect(sanitizeProgress({ plays: 1, games: 9 }).games).toBe(9);
    expect(sanitizeProgress({ games: -3 }).games).toBe(0);
  });

  it('records wins, streaks, best score and fastest win', () => {
    let p = emptyProgress();
    let r = recordResult(p, won('you', 30), 'hard', 'you');
    expect(r.newBest).toBe(true);
    p = r.next;
    expect(p).toMatchObject({
      plays: 1,
      wins: 1,
      streak: 1,
      bestStreak: 1,
      fastestWin: 30,
      lastDifficulty: 'hard',
    });
    r = recordResult(p, won('you', 25), 'hard', 'you');
    expect(r.next.fastestWin).toBe(25);
    expect(r.next.streak).toBe(2);
    p = r.next;
    r = recordResult(p, won('cpu1'), 'hard', 'you');
    expect(r.newBest).toBe(false);
    expect(r.next).toMatchObject({ plays: 3, wins: 2, streak: 0, bestStreak: 2, fastestWin: 25 });
    expect(r.next.best.hard).toBe(p.best.hard);
    // a slower win does not replace the fastest
    expect(recordResult(r.next, won('you', 60), 'easy', 'you').next.fastestWin).toBe(25);
    void apply;
  });
});
