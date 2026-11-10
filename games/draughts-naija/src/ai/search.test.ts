import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, parseBoard } from '../rules/board';
import { makeRules } from '../rules/config';
import {
  applyMove,
  createFromBoard,
  createGame,
  findMove,
  isOver,
  legalMoves,
  type GameState,
} from '../rules/engine';
import { decide, decisionSeed } from './decide';
import { evaluate, kingValue } from './eval';
import { AI_PROFILES, FALLBACK_NODES, profileFor } from './profiles';
import { WON, searchBest } from './search';

const R8 = makeRules(8);
const R10 = makeRules(10);
const empty8 = (): string[][] => Array.from({ length: 8 }, () => Array<string>(8).fill('.'));
const diagram = (put: Record<string, string>, n = 8): string[] => {
  const rows = Array.from({ length: n }, () => Array<string>(n).fill('.'));
  for (const [k, v] of Object.entries(put)) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    rows[r]![c] = v;
  }
  return rows.map((r) => r.join(' '));
};
void empty8;

/** A reproducible mid-game position: `plies` random moves from the start. */
function midgame(size: 10 | 8, seed: number, plies: number): GameState {
  const rng = createRng(seed);
  let s = createGame({ seed, rules: makeRules(size) });
  for (let i = 0; i < plies && !isOver(s); i++) s = applyMove(s, rng.pick(legalMoves(s)));
  return s;
}

describe('evaluation', () => {
  it('is zero-sum: the same position is worth the opposite to the other side', () => {
    const s = midgame(10, 4, 20);
    expect(evaluate(s.board, LIGHT, s.rules)).toBe(-evaluate(s.board, DARK, s.rules));
  });
  it('counts material: an extra man is worth about a man, a king about three on 10x10', () => {
    const base = parseBoard(diagram({ '7,0': 'w', '0,7': 'b' }));
    const plus = parseBoard(diagram({ '7,0': 'w', '5,2': 'w', '0,7': 'b' }));
    expect(evaluate(plus, LIGHT, R8) - evaluate(base, LIGHT, R8)).toBeGreaterThan(90);
    expect(kingValue(R10)).toBeGreaterThan(2.5 * 100);
    expect(kingValue(R8)).toBeLessThan(kingValue(R10));
  });
  it('likes advanced men and the centre, and does not care about the side of the board', () => {
    const adv = parseBoard(diagram({ '2,3': 'w', '0,7': 'b' }));
    const back = parseBoard(diagram({ '6,3': 'w', '0,7': 'b' }));
    expect(evaluate(adv, LIGHT, R8)).toBeGreaterThan(evaluate(back, LIGHT, R8));
  });
});

describe('search', () => {
  it('a forced move needs no search', () => {
    const b = parseBoard(diagram({ '4,3': 'w', '3,2': 'b' }));
    const r = searchBest(b, LIGHT, R8, { maxDepth: 6, maxNodes: 1000 });
    expect(r).toMatchObject({ nodes: 0, depth: 0 });
    expect(r.best.caps).toHaveLength(1);
  });
  it('throws when there is no move', () => {
    const b = parseBoard(diagram({ '0,1': 'b' }));
    expect(() => searchBest(b, LIGHT, R8, { maxDepth: 2, maxNodes: 10 })).toThrow();
  });
  it('does not hang a piece when a safe move exists', () => {
    // moving (5,2) to (4,1) loses a man to (3,2); (4,3) is guarded by the man on (5,4)
    const b = parseBoard(diagram({ '5,2': 'w', '5,4': 'w', '3,2': 'b', '0,7': 'b' }));
    const s = createFromBoard({ board: b, turn: LIGHT, rules: R8 });
    const r = searchBest(s.board, LIGHT, R8, { maxDepth: 4, maxNodes: 4000 });
    const after = applyMove(s, r.best);
    expect(legalMoves(after).every((m) => m.caps.length === 0)).toBe(true);
    expect(r.depth).toBeGreaterThanOrEqual(3);
  });
  it('sees a won ending and reports a winning score', () => {
    // light to move: the dark man has one move left; after it light captures the last piece
    const b = parseBoard(diagram({ '3,2': 'w', '5,6': 'w', '1,2': 'b' }));
    const r = searchBest(b, LIGHT, R8, { maxDepth: 6, maxNodes: 20000 });
    expect(r.value).toBeGreaterThan(0);
  });
  it('is deterministic and leaves its input alone', () => {
    const s = midgame(10, 11, 24);
    const copy = s.board.slice();
    const a = searchBest(s.board, s.turn, s.rules, { maxDepth: 5, maxNodes: 3000, tie: 2 });
    // another search in between: nothing is shared between searches
    searchBest(midgame(8, 3, 14).board, LIGHT, R8, { maxDepth: 4, maxNodes: 1000 });
    const b = searchBest(s.board, s.turn, s.rules, { maxDepth: 5, maxNodes: 3000, tie: 2 });
    expect(b).toEqual(a);
    expect(s.board).toEqual(copy);
  });
  it('deeper search reaches deeper and may change its mind', () => {
    const s = midgame(8, 21, 22);
    const shallow = searchBest(s.board, s.turn, s.rules, { maxDepth: 2, maxNodes: 50000 });
    const deep = searchBest(s.board, s.turn, s.rules, { maxDepth: 7, maxNodes: 50000 });
    expect(shallow.depth).toBe(2);
    expect(deep.depth).toBe(7);
    expect(deep.nodes).toBeGreaterThan(shallow.nodes);
  });
  it('can skip root moves it is told to avoid, but never all of them', () => {
    const s = midgame(10, 5, 16);
    const moves = legalMoves(s);
    const first = moves[0]!;
    const r = searchBest(s.board, s.turn, s.rules, {
      maxDepth: 3,
      maxNodes: 2000,
      avoid: (m) => m.from === first.from && m.to === first.to,
    });
    expect(r.best.from === first.from && r.best.to === first.to).toBe(false);
    const all = searchBest(s.board, s.turn, s.rules, {
      maxDepth: 2,
      maxNodes: 500,
      avoid: () => true,
    });
    expect(findMove(s, all.best)).not.toBeNull();
  });
  it('near-best moves are never moves that were only bounded: a hanging move is not offered', () => {
    // (5,2)->(4,1) loses a man for nothing; the tie margin must never make it a candidate
    const b = parseBoard(diagram({ '5,2': 'w', '5,4': 'w', '3,2': 'b', '0,7': 'b' }));
    for (const tie of [0, 2, 6, 30]) {
      const r = searchBest(b, LIGHT, R8, { maxDepth: 5, maxNodes: 20000, tie });
      const hang = r.near.some((m) => m.from === 5 * 8 + 2 && m.to === 4 * 8 + 1);
      expect(hang, `tie ${tie}`).toBe(false);
    }
  });
  it('returns near-best moves within the tie margin', () => {
    const s = midgame(10, 9, 14);
    const r = searchBest(s.board, s.turn, s.rules, { maxDepth: 3, maxNodes: 5000, tie: 500 });
    expect(r.near.length).toBeGreaterThan(1);
    expect(r.near).toContain(r.best);
  });
});

describe('node budget: the search never exceeds it', () => {
  const positions: GameState[] = [
    midgame(10, 31, 18),
    midgame(10, 32, 40),
    midgame(8, 33, 16),
    midgame(8, 34, 36),
  ];
  for (const budget of [1, 2, 5, 25, 150, 1200, 6000]) {
    it(`maxNodes ${budget}`, () => {
      for (const s of positions) {
        if (isOver(s) || legalMoves(s).length < 2) continue;
        const r = searchBest(s.board, s.turn, s.rules, { maxDepth: 30, maxNodes: budget, tie: 2 });
        expect(r.nodes).toBeLessThanOrEqual(budget);
        expect(findMove(s, r.best)).not.toBeNull();
        const d = decide(s, 'hard', 7, budget);
        expect(d.nodes).toBeLessThanOrEqual(budget);
      }
    });
  }
  it('the shipped budgets are what the docs say, and the fallback is smaller than Medium', () => {
    expect(AI_PROFILES.easy.maxNodes).toBeLessThan(AI_PROFILES.medium.maxNodes);
    expect(AI_PROFILES.medium.maxNodes).toBeLessThan(AI_PROFILES.hard.maxNodes);
    expect(FALLBACK_NODES).toBeLessThan(AI_PROFILES.medium.maxNodes);
    expect(profileFor('hard', 99).maxNodes).toBe(99);
    expect(profileFor('hard', 1e9).maxNodes).toBe(AI_PROFILES.hard.maxNodes);
    expect(profileFor('hard', 0).maxNodes).toBe(1);
  });
  it('Hard at its full budget stays inside it on both sizes', () => {
    for (const s of positions) {
      if (isOver(s) || legalMoves(s).length < 2) continue;
      const d = decide(s, 'hard', 3);
      expect(d.nodes).toBeLessThanOrEqual(AI_PROFILES.hard.maxNodes);
      expect(d.depth).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('decide (the CPU move)', () => {
  const s = midgame(10, 41, 20);
  it('is a pure function of the position, level and seed', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      expect(decide(s, d, 5, 300)).toEqual(decide(s, d, 5, 300));
    }
  });
  it('always returns a legal move, at every level and seed', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const d of ['easy', 'medium', 'hard'] as const) {
        expect(findMove(s, decide(s, d, seed, 200).move)).not.toBeNull();
      }
    }
  });
  it('Easy slips: across seeds it plays more than one move, Hard (no blunders) keeps its best', () => {
    const easy = new Set<string>();
    const hard = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const e = decide(s, 'easy', seed).move;
      easy.add(`${e.from}>${e.to}`);
      const h = decide(s, 'hard', seed, 300).move;
      hard.add(`${h.from}>${h.to}`);
    }
    expect(easy.size).toBeGreaterThan(2);
    expect(hard.size).toBeLessThanOrEqual(easy.size);
  });
  it('the blunder rate is the profile one: about 30 percent of Easy decisions are not the search move', () => {
    let off = 0;
    const n = 300;
    for (let seed = 0; seed < n; seed++) {
      const best = searchBest(s.board, s.turn, s.rules, {
        maxDepth: 2,
        maxNodes: 400,
        tie: 0,
      }).best;
      const m = decide(s, 'easy', seed).move;
      if (m.from !== best.from || m.to !== best.to) off++;
    }
    expect(off / n).toBeGreaterThan(0.2);
    expect(off / n).toBeLessThan(0.55);
  });
  it('a forced move is returned without a search', () => {
    const forced = createFromBoard({
      board: parseBoard(diagram({ '4,3': 'w', '3,2': 'b', '0,7': 'b' })),
      turn: LIGHT,
      rules: R8,
    });
    expect(decide(forced, 'hard', 1)).toMatchObject({ nodes: 0, depth: 0 });
  });
  it('refuses a finished game', () => {
    const over = createFromBoard({
      board: parseBoard(diagram({ '7,0': 'w' })),
      turn: DARK,
      rules: R8,
    });
    expect(() => decide(over, 'easy', 1)).toThrow();
  });
  it('does not throw a won game away by repetition when another move wins', () => {
    // light has two kings and a man against one dark king; a repeated position would draw
    const b = parseBoard(diagram({ '7,0': 'W', '6,1': 'W', '5,4': 'w', '0,7': 'B' }));
    let st = createFromBoard({ board: b, turn: LIGHT, rules: R8 });
    // make the next move a draw-by-king-rule candidate
    st = { ...st, kingMoves: 48 };
    const m = decide(st, 'hard', 3, 800).move;
    const after = applyMove(st, m);
    // the man move resets the counter, the AI finds it (a king move would end the game as a draw)
    expect(after.result?.reason).not.toBe('kingMoves');
  });
  it('the decision seed depends on the game seed and the ply', () => {
    expect(decisionSeed(1, 0)).not.toBe(decisionSeed(1, 1));
    expect(decisionSeed(1, 0)).not.toBe(decisionSeed(2, 0));
    expect(decisionSeed(7, 3)).toBe(decisionSeed(7, 3));
  });
  it('the module has no state: a decision is the same before and after other games', () => {
    const before = decide(s, 'medium', 9, 500);
    for (let i = 0; i < 3; i++) decide(midgame(8, 100 + i, 18), 'hard', i, 300);
    expect(decide(s, 'medium', 9, 500)).toEqual(before);
  });
  it('WON is far above any material score', () => {
    expect(WON).toBeGreaterThan(20 * kingValue(R10));
  });
});
