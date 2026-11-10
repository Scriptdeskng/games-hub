import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, parseBoard } from './board';
import { makeRules, type Rules } from './config';
import { applyMove, createFromBoard, legalMoves, type GameState } from './engine';
import { emptyProgress, hintPenalty, recordResult, sanitizeProgress, scoreFor } from './progress';

const R8 = makeRules(8);
const rows = (put: Record<string, string>): string[] => {
  const g = Array.from({ length: 8 }, () => Array<string>(8).fill('.'));
  for (const [k, v] of Object.entries(put)) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    g[r]![c] = v;
  }
  return g.map((r) => r.join(' '));
};
/** a finished game: light takes the last dark piece */
const won = (rules: Rules = R8): GameState => {
  const s = createFromBoard({
    board: parseBoard(rows({ '6,1': 'w', '5,2': 'b', '7,0': 'w' })),
    turn: LIGHT,
    rules,
  });
  return applyMove(s, legalMoves(s)[0]!);
};
const lost = (): GameState => {
  const s = createFromBoard({
    board: parseBoard(rows({ '1,2': 'b', '2,1': 'w', '0,7': 'b' })),
    turn: DARK,
    rules: R8,
  });
  return applyMove(s, legalMoves(s)[0]!);
};

describe('score', () => {
  it('a win is worth the pieces taken, kings made, a bonus for what is left and for speed', () => {
    const s = won();
    expect(s.result).toEqual({ winner: LIGHT, reason: 'noPieces' });
    // 1 piece x10, +300, 2 pieces left x5, 1 move: (100-1) x2
    expect(scoreFor(s)).toBe(10 + 300 + 10 + 198);
  });
  it('each hint costs a little and the score never goes below zero', () => {
    const s = won();
    expect(scoreFor(s, 2)).toBe(scoreFor(s) - 2 * hintPenalty);
    expect(scoreFor(s, 1000)).toBe(0);
  });
  it('a loss keeps only what was taken; a draw adds 100', () => {
    const l = lost();
    expect(l.result?.winner).toBe(DARK);
    expect(scoreFor(l)).toBe(0);
    const d = { ...won(), result: { winner: null, reason: 'repetition' } } as GameState;
    expect(scoreFor(d)).toBe(10 + 100);
  });
});

describe('progress', () => {
  it('records wins, bests per size and level, streaks and the biggest capture', () => {
    const s = won();
    const score = scoreFor(s);
    const a = recordResult(emptyProgress(), s, 'hard', score, 1);
    expect(a.newBest).toBe(true);
    expect(a.next).toMatchObject({
      plays: 1,
      wins: 1,
      streak: 1,
      bestStreak: 1,
      bestCapture: 1,
      lastDifficulty: 'hard',
      lastSize: 8,
    });
    expect(a.next.best[8].hard).toBe(score);
    expect(a.next.best[10].hard).toBe(0);
    const b = recordResult(a.next, s, 'hard', score, 0);
    expect(b.newBest).toBe(false);
    const c = recordResult(b.next, lost(), 'hard', 0, 0);
    expect(c.next).toMatchObject({ plays: 3, wins: 2, streak: 0, bestStreak: 2 });
    const d = recordResult(
      c.next,
      { ...s, result: { winner: null, reason: 'cap' } } as GameState,
      'easy',
      50,
      0,
    );
    expect(d.next.draws).toBe(1);
    expect(d.next.streak).toBe(0);
    const dd = recordResult(
      a.next,
      { ...s, result: { winner: null, reason: 'cap' } } as GameState,
      'easy',
      50,
      0,
    );
    expect(dd.next.streak).toBe(1); // a draw keeps the streak
  });
  it('sanitizes anything from storage or the portal', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const dirty = sanitizeProgress({
      best: { 10: { easy: -5, medium: 'a', hard: 99.9 }, 8: null },
      plays: 3,
      games: 1,
      wins: 99,
      draws: 99,
      streak: 2,
      bestStreak: 0,
      bestCapture: 500,
      lastDifficulty: 'nope',
      lastSize: 9,
      toggles: { maxCapture: 'x', cpuStarts: true },
      fastPlay: 'yes',
    });
    expect(dirty.best[10]).toEqual({ easy: 0, medium: 0, hard: 99 });
    expect(dirty).toMatchObject({
      plays: 3,
      games: 3,
      wins: 3,
      draws: 0,
      streak: 2,
      bestStreak: 2,
      bestCapture: 40,
    });
    expect(dirty.lastDifficulty).toBe('medium');
    expect(dirty.lastSize).toBe(10);
    expect(dirty.toggles).toEqual({ maxCapture: true, flyingKingsShort: false, cpuStarts: true });
    expect(dirty.fastPlay).toBe(false);
    const good = sanitizeProgress({ lastDifficulty: 'hard', lastSize: 8, fastPlay: true });
    expect(good).toMatchObject({ lastDifficulty: 'hard', lastSize: 8, fastPlay: true });
  });
  it('survives a JSON round trip', () => {
    // the app counts a game when it starts, so a saved game count is never below the plays
    const p = { ...recordResult(emptyProgress(), won(), 'easy', 123, 1).next, games: 1 };
    expect(sanitizeProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
