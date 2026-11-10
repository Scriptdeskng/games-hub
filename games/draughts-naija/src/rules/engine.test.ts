import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, countPieces, isDarkIndex, parseBoard, squareName, type Side } from './board';
import { KING_ONLY_PLY_LIMIT, MAX_PLIES, makeRules, sanitizeToggles, type Rules } from './config';
import {
  applyMove,
  createFromBoard,
  createGame,
  findMove,
  isLegal,
  isOver,
  legalMoves,
  mustCaptureNow,
  pieceCounts,
  type GameState,
} from './engine';

const R10 = makeRules(10);
const R8 = makeRules(8);
const sq = (r: number, c: number, n = 8): number => r * n + c;
const empty8 = (): string[] => Array<string>(8).fill('. . . . . . . .');
const diagram = (put: Record<string, string>): string[] => {
  const rows = empty8().map((r) => r.split(' '));
  for (const [k, v] of Object.entries(put)) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    rows[r]![c] = v;
  }
  return rows.map((r) => r.join(' '));
};
const play = (s: GameState, from: number, to: number): GameState => {
  const m = legalMoves(s).find((x) => x.from === from && x.to === to);
  if (!m) throw new Error(`no move ${from}->${to}`);
  return applyMove(s, m);
};

describe('new games', () => {
  it('the human (light) moves first by default, the CPU (dark) when the toggle says so', () => {
    expect(createGame({ seed: 1, rules: R10 }).turn).toBe(LIGHT);
    expect(
      createGame({ seed: 1, rules: makeRules(10, { ...sanitizeToggles(null), cpuStarts: true }) })
        .turn,
    ).toBe(DARK);
    expect(createGame({ seed: 1 }).rules.size).toBe(10);
  });
  it('starts with no result, no captures and one position in the history', () => {
    const s = createGame({ seed: 9, rules: R8 });
    expect(s).toMatchObject({
      plies: 0,
      captured: [0, 0],
      crowned: [0, 0],
      result: null,
      lastMove: null,
    });
    expect(Object.keys(s.history)).toHaveLength(1);
    expect(pieceCounts(s)).toEqual({ light: 12, dark: 12 });
  });
  it('is plain JSON: a state survives JSON round-trips and keeps playing', () => {
    let s = createGame({ seed: 3, rules: R10 });
    s = applyMove(s, legalMoves(s)[0]!);
    const copy = JSON.parse(JSON.stringify(s)) as GameState;
    expect(copy).toEqual(s);
    expect(applyMove(copy, legalMoves(copy)[0]!)).toEqual(applyMove(s, legalMoves(s)[0]!));
  });
  it('rules toggles: sanitize bad input, 10x10 ignores the 8x8 toggles, 8x8 honours them', () => {
    expect(sanitizeToggles({ maxCapture: 'yes', cpuStarts: true })).toEqual({
      maxCapture: true,
      flyingKingsShort: false,
      cpuStarts: true,
    });
    expect(sanitizeToggles(7)).toEqual({
      maxCapture: true,
      flyingKingsShort: false,
      cpuStarts: false,
    });
    const t = { maxCapture: false, flyingKingsShort: true, cpuStarts: false };
    expect(makeRules(10, t)).toMatchObject({ maxCapture: true, flyingKings: true });
    expect(makeRules(8, t)).toMatchObject({ maxCapture: false, flyingKings: true });
    expect(makeRules(8)).toMatchObject({ maxCapture: true, flyingKings: false });
  });
  it('names squares like a board: a1 is the bottom-left square', () => {
    expect(squareName(sq(9, 0, 10), 10)).toBe('a1');
    expect(squareName(sq(0, 9, 10), 10)).toBe('j10');
    expect(squareName(sq(7, 0), 8)).toBe('a1');
  });
});

describe('applying moves', () => {
  it('moves the piece, passes the turn and records the move', () => {
    const s = play(createGame({ seed: 1, rules: R8 }), sq(5, 0), sq(4, 1));
    expect(s.turn).toBe(DARK);
    expect(s.plies).toBe(1);
    expect(s.board[sq(4, 1)]).toBe(1);
    expect(s.board[sq(5, 0)]).toBe(0);
    expect(s.lastMove).toMatchObject({
      side: LIGHT,
      from: sq(5, 0),
      to: sq(4, 1),
      caps: [],
      king: false,
      crowned: false,
    });
  });
  it('rejects illegal moves and moves after the end', () => {
    const s = createGame({ seed: 1, rules: R8 });
    expect(() => applyMove(s, { from: sq(5, 0), to: sq(3, 2), caps: [] })).toThrow(/illegal/);
    expect(isLegal(s, { from: sq(5, 0), to: sq(4, 1), caps: [] })).toBe(true);
    expect(findMove(s, { from: 0, to: 1, caps: [] })).toBeNull();
    const over = createFromBoard({
      board: parseBoard(diagram({ '7,0': 'w' })),
      turn: DARK,
      rules: R8,
    });
    expect(() => applyMove(over, { from: 0, to: 1, caps: [] })).toThrow(/over/);
    expect(legalMoves(over)).toEqual([]);
  });
  it('removes captured pieces after the whole sequence and counts them', () => {
    const b = parseBoard(diagram({ '6,1': 'w', '5,2': 'b', '3,2': 'b', '0,7': 'b' }));
    let s = createFromBoard({ board: b, turn: LIGHT, rules: R8 });
    expect(mustCaptureNow(s)).toBe(true);
    s = play(s, sq(6, 1), sq(2, 1));
    expect(s.captured).toEqual([2, 0]);
    expect(s.board[sq(5, 2)]).toBe(0);
    expect(s.board[sq(3, 2)]).toBe(0);
    expect(s.lastMove!.path).toEqual([sq(4, 3), sq(2, 1)]);
    expect(pieceCounts(s)).toEqual({ light: 1, dark: 1 });
  });
  it('counts crowned men and marks the record', () => {
    const b = parseBoard(diagram({ '1,2': 'w', '7,0': 'b' }));
    const s = play(createFromBoard({ board: b, turn: LIGHT, rules: R8 }), sq(1, 2), sq(0, 1));
    expect(s.crowned).toEqual([1, 0]);
    expect(s.lastMove!.crowned).toBe(true);
    expect(s.board[sq(0, 1)]).toBe(2);
  });
});

describe('end of the game', () => {
  it('a side with no legal move loses: no pieces left', () => {
    const b = parseBoard(diagram({ '6,1': 'w', '5,2': 'b' }));
    const s = play(createFromBoard({ board: b, turn: LIGHT, rules: R8 }), sq(6, 1), sq(4, 3));
    expect(s.result).toEqual({ winner: LIGHT, reason: 'noPieces' });
    expect(isOver(s)).toBe(true);
  });
  it('a side with pieces but no legal move loses: blocked', () => {
    // dark man on (7,0)... dark moves down; (6,1) is its only way and is blocked twice over
    const b = parseBoard(diagram({ '0,1': 'b', '1,0': 'w', '1,2': 'w', '2,3': 'w', '3,0': 'w' }));
    const s = createFromBoard({ board: b, turn: DARK, rules: R8 });
    // (0,1) steps to (1,0) or (1,2): both occupied; jumping (1,0) is off the board, (1,2)->(2,3) occupied
    expect(s.result).toEqual({ winner: LIGHT, reason: 'blocked' });
  });
  it('a position with no moves from the start is decided at once', () => {
    expect(
      createFromBoard({ board: parseBoard(diagram({})), turn: LIGHT, rules: R8 }).result,
    ).toEqual({ winner: DARK, reason: 'noPieces' });
  });
  it('threefold repetition is a draw', () => {
    // two kings shuffling: the start position repeats every four plies
    const b = parseBoard(diagram({ '7,0': 'W', '0,7': 'B' }));
    let s = createFromBoard({ board: b, turn: LIGHT, rules: R8 });
    const cycle: [number, number][] = [
      [sq(7, 0), sq(6, 1)],
      [sq(0, 7), sq(1, 6)],
      [sq(6, 1), sq(7, 0)],
      [sq(1, 6), sq(0, 7)],
    ];
    let plies = 0;
    while (!s.result) {
      const [from, to] = cycle[plies % 4]!;
      s = play(s, from, to);
      plies++;
    }
    expect(s.result).toEqual({ winner: null, reason: 'repetition' });
    expect(plies).toBe(8); // the start position occurs for the third time after eight plies
  });
  it(`${KING_ONLY_PLY_LIMIT} plies of king-only moves without a capture is a draw (25 moves each)`, () => {
    const b = parseBoard(diagram({ '7,0': 'W', '0,7': 'B' }));
    let s = {
      ...createFromBoard({ board: b, turn: LIGHT, rules: R8 }),
      kingMoves: KING_ONLY_PLY_LIMIT - 1,
    };
    s = play(s, sq(7, 0), sq(6, 1));
    expect(s.result).toEqual({ winner: null, reason: 'kingMoves' });
    // one ply earlier it is still a game
    const t = play(
      {
        ...createFromBoard({ board: b, turn: LIGHT, rules: R8 }),
        kingMoves: KING_ONLY_PLY_LIMIT - 2,
      },
      sq(7, 0),
      sq(6, 1),
    );
    expect(t.result).toBeNull();
    expect(t.kingMoves).toBe(KING_ONLY_PLY_LIMIT - 1);
  });
  it('a man move or a capture resets the king-only counter and the repetition history', () => {
    const b = parseBoard(diagram({ '7,0': 'W', '0,7': 'B', '5,4': 'w' }));
    const s = { ...createFromBoard({ board: b, turn: LIGHT, rules: R8 }), kingMoves: 30 };
    const after = play(s, sq(5, 4), sq(4, 3));
    expect(after.kingMoves).toBe(0);
    expect(Object.keys(after.history)).toHaveLength(1);
    const c = parseBoard(diagram({ '7,0': 'W', '4,3': 'b', '0,7': 'B' }));
    const cap = play(
      {
        ...createFromBoard({
          board: c,
          turn: LIGHT,
          rules: makeRules(8, { ...sanitizeToggles(null), flyingKingsShort: true }),
        }),
        kingMoves: 30,
      },
      sq(7, 0),
      sq(3, 4),
    );
    expect(cap.kingMoves).toBe(0);
  });
  it('the safety cap is a draw (not reachable in real play)', () => {
    const b = parseBoard(diagram({ '7,0': 'W', '0,7': 'B', '5,4': 'w' }));
    const s = { ...createFromBoard({ board: b, turn: LIGHT, rules: R8 }), plies: MAX_PLIES - 1 };
    expect(play(s, sq(5, 4), sq(4, 3)).result).toEqual({ winner: null, reason: 'cap' });
  });
});

/** All the invariants a position must satisfy. */
function check(s: GameState, start: number, prev: GameState | null): void {
  const n = s.rules.size;
  expect(s.board).toHaveLength(n * n);
  // one assertion for the whole board: per-cell expect() calls are slow under coverage
  const strays = s.board.filter(
    (v, i) => !Number.isInteger(v) || Math.abs(v) > 2 || (v !== 0 && !isDarkIndex(i, n)),
  );
  expect(strays).toEqual([]);
  const { men, kings } = countPieces(s.board);
  expect((men[0] as number) + (kings[0] as number)).toBe(start - s.captured[DARK]);
  expect((men[1] as number) + (kings[1] as number)).toBe(start - s.captured[LIGHT]);
  // men never stand on their own crowning row (they would be kings)
  const unCrowned = [
    ...s.board.slice(0, n).filter((v) => v === 1),
    ...s.board.slice((n - 1) * n).filter((v) => v === -1),
  ];
  expect(unCrowned).toEqual([]);
  if (!s.result) expect(legalMoves(s).length).toBeGreaterThan(0);
  if (prev) {
    expect(s.plies).toBe(prev.plies + 1);
    expect(s.turn).toBe(1 - prev.turn);
    const m = s.lastMove!;
    expect(new Set(m.caps).size).toBe(m.caps.length);
    expect(m.path.at(-1)).toBe(m.to);
  }
  if (s.result?.winner !== undefined && s.result && s.result.winner !== null) {
    expect(['noPieces', 'blocked']).toContain(s.result.reason);
    expect(s.result.winner).toBe((1 - s.turn) as Side);
  }
}

describe('random games (seeded, engine only)', () => {
  const run = (
    size: 10 | 8,
    rules: Rules,
    games: number,
    seed0: number,
  ): { ended: number; draws: number; longest: number } => {
    let draws = 0;
    let longest = 0;
    const start = size === 10 ? 20 : 12;
    for (let g = 0; g < games; g++) {
      const rng = createRng(seed0 + g);
      let s = createGame({ seed: seed0 + g, rules: { ...rules, cpuStarts: g % 2 === 1 } });
      check(s, start, null);
      while (!isOver(s)) {
        const prev = s;
        s = applyMove(s, rng.pick(legalMoves(s)));
        if (s.plies % 7 === 0 || s.result) check(s, start, prev);
      }
      if (s.plies >= MAX_PLIES) throw new Error(`game ${g} hit the safety cap`);
      if (s.result!.winner === null) draws++;
      longest = Math.max(longest, s.plies);
    }
    return { ended: games, draws, longest };
  };
  it(
    '10x10: 220 games all end by a rule, never by the safety cap, and keep every invariant',
    { timeout: 300_000 },
    () => {
      const r = run(10, R10, 220, 100);
      expect(r.ended).toBe(220);
      expect(r.longest).toBeLessThan(MAX_PLIES);
    },
  );
  it('8x8 (one-step kings): 220 games', { timeout: 300_000 }, () => {
    expect(run(8, R8, 220, 5000).longest).toBeLessThan(MAX_PLIES);
  });
  it('8x8 with flying kings and no majority rule: 220 games', { timeout: 300_000 }, () => {
    const rules = makeRules(8, { maxCapture: false, flyingKingsShort: true, cpuStarts: false });
    expect(run(8, rules, 220, 9000).longest).toBeLessThan(MAX_PLIES);
  });
  it('the same seed gives the same game', () => {
    const go = (): GameState => {
      const rng = createRng(77);
      let s = createGame({ seed: 77, rules: R10 });
      while (!isOver(s)) s = applyMove(s, rng.pick(legalMoves(s)));
      return s;
    };
    expect(go()).toEqual(go());
  });
});
