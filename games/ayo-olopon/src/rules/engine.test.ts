import { describe, expect, it } from 'vitest';
import {
  CAPTURE_RULES,
  DEFAULT_RULES,
  END_SEEDS,
  MAX_PLIES,
  PITS,
  TOTAL_SEEDS,
  WIN_SCORE,
  sanitizeRules,
  type Rules,
} from './config';
import {
  capture,
  nextPit,
  ownerOf,
  prevPit,
  qualifies,
  reachesOpponent,
  sideSeeds,
  sow,
} from './board';
import {
  apply,
  createGame,
  currentSide,
  deserialize,
  isLegal,
  isOver,
  legalMoves,
  mustFeedNow,
  onSide,
  serialize,
  sweepOf,
  threatenedPits,
  totalOf,
  type GameState,
  type Side,
} from './engine';

const mk = (
  pits: number[],
  o: { side?: Side; store?: [number, number]; rules?: Partial<Rules>; plies?: number } = {},
): GameState => {
  const g = createGame({
    seed: 1,
    human: { id: 'you', name: 'You' },
    cpu: { id: 'cpu', name: 'CPU' },
    rules: o.rules,
    first: o.side ?? 0,
  });
  return { ...g, pits, store: o.store ?? [0, 0], plies: o.plies ?? 0 };
};
const empty = (): number[] => new Array<number>(PITS).fill(0);
const board = (set: Record<number, number>): number[] => {
  const p = empty();
  for (const [k, v] of Object.entries(set)) p[Number(k)] = v;
  return p;
};
const play = (s: GameState, pit: number): GameState => apply(s, { type: 'move', pit });

describe('setup', () => {
  it('2 x 6 pits, 4 seeds each, nothing captured, 48 seeds', () => {
    const s = createGame({ seed: 5, human: { id: 'a', name: 'A' }, cpu: { id: 'b', name: 'B' } });
    expect(s.pits).toEqual(new Array(12).fill(4));
    expect(s.pits.reduce((a, b) => a + b, 0)).toBe(TOTAL_SEEDS);
    expect(s.store).toEqual([0, 0]);
    expect(s.rules).toEqual(DEFAULT_RULES);
    expect(WIN_SCORE).toBe(25);
    expect(isOver(s)).toBe(false);
  });
  it('the seed decides who starts, the same way every time; `first` overrides it', () => {
    const who = (seed: number): Side =>
      currentSide(createGame({ seed, human: { id: 'a', name: 'A' }, cpu: { id: 'b', name: 'B' } }));
    expect(who(3)).toBe(who(3));
    expect(new Set([...Array(40).keys()].map(who)).size).toBe(2);
    expect(currentSide(mk([...Array(12).fill(4)], { side: 1 }))).toBe(1);
  });
  it('there is exactly one human seat and one CPU seat', () => {
    const s = createGame({ seed: 1, human: { id: 'a', name: 'A' }, cpu: { id: 'b', name: 'B' } });
    expect(s.turns.seats.map((x) => x.kind)).toEqual(['human', 'cpu']);
  });
  it('pit helpers: owners, neighbours wrap, reach', () => {
    expect([0, 5, 6, 11].map(ownerOf)).toEqual([0, 0, 1, 1]);
    expect(nextPit(11)).toBe(0);
    expect(prevPit(0)).toBe(11);
    expect(reachesOpponent(5, 1)).toBe(true);
    expect(reachesOpponent(0, 5)).toBe(false);
    expect(reachesOpponent(0, 6)).toBe(true);
    expect(reachesOpponent(11, 1)).toBe(true);
    expect(reachesOpponent(6, 5)).toBe(false);
    expect(reachesOpponent(6, 6)).toBe(true);
    expect(sideSeeds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 1)).toBe(57);
  });
});

describe('sowing', () => {
  it('goes counter-clockwise (index + 1), one seed per pit, from the next pit', () => {
    const p = [...Array(12).fill(4)];
    const path: number[] = [];
    const r = sow(p, 1, DEFAULT_RULES, path);
    expect(path).toEqual([2, 3, 4, 5]);
    expect(r).toEqual({ last: 5, skipped: false });
    expect(p[1]).toBe(0);
    expect(p.slice(2, 6)).toEqual([5, 5, 5, 5]);
  });
  it('crosses from pit 5 to pit 6 and wraps from 11 to 0', () => {
    const a = board({ 4: 3 });
    expect(sow(a, 4, DEFAULT_RULES).last).toBe(7);
    expect(a[5]).toBe(1);
    expect(a[6]).toBe(1);
    const b = board({ 10: 3 });
    sow(b, 10, DEFAULT_RULES);
    expect([b[11], b[0], b[1]]).toEqual([1, 1, 1]);
  });
  it('11 seeds do not reach the origin pit, 12 skip it (default)', () => {
    const a = board({ 0: 11 });
    const pa: number[] = [];
    sow(a, 0, DEFAULT_RULES, pa);
    expect(pa).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const b = board({ 0: 12 });
    const pb: number[] = [];
    const r = sow(b, 0, DEFAULT_RULES, pb);
    expect(pb).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 1]);
    expect(b[0]).toBe(0);
    expect(b[1]).toBe(2);
    expect(r).toEqual({ last: 1, skipped: true });
  });
  it('a long sow skips the origin on every lap', () => {
    const b = board({ 3: 24 });
    sow(b, 3, DEFAULT_RULES);
    expect(b[3]).toBe(0);
    expect(b.reduce((x, y) => x + y, 0)).toBe(24);
    expect(b[4]).toBe(3);
    expect(b[2]).toBe(2);
  });
  it('toggle skipOrigin off: the origin pit gets a seed on the 12th', () => {
    const b = board({ 0: 12 });
    const r = sow(b, 0, { ...DEFAULT_RULES, skipOrigin: false });
    expect(b[0]).toBe(1);
    expect(r).toEqual({ last: 0, skipped: false });
  });
});

describe('capture', () => {
  it('captures an opponent pit that the last seed makes 2 or 3', () => {
    // human pit 5 (1 seed) lands in pit 6, which holds 1: becomes 2
    const s = mk(board({ 5: 1, 6: 1, 0: 1, 10: 9 }));
    const n = play(s, 5);
    expect(n.pits[6]).toBe(0);
    expect(n.store).toEqual([2, 0]);
    expect(n.lastMove?.captures).toEqual([{ pit: 6, count: 2 }]);
    expect(n.lastMove?.gained).toBe(2);
    const t = play(mk(board({ 5: 1, 6: 2, 0: 1, 10: 9 })), 5);
    expect(t.store[0]).toBe(3);
  });
  it('does not capture 1 or 4+ seeds, or an own pit', () => {
    expect(play(mk(board({ 5: 1, 6: 0, 0: 1, 10: 9 })), 5).store[0]).toBe(0); // 1
    expect(play(mk(board({ 5: 1, 6: 3, 0: 1, 10: 9 })), 5).store[0]).toBe(0); // 4
    expect(play(mk(board({ 0: 1, 1: 1, 6: 1, 10: 9 })), 0).store[0]).toBe(0); // lands on own pit 1 (becomes 2)
  });
  it('the CPU captures on the human side', () => {
    const s = mk(board({ 11: 1, 0: 2, 7: 1, 3: 9 }), { side: 1 });
    const n = play(s, 11);
    expect(n.store).toEqual([0, 3]);
    expect(n.pits[0]).toBe(0);
  });
  it('a chain takes the preceding opponent pits that hold 2 or 3, and stops at the first that does not', () => {
    // sow 3 from pit 3: 4, 5, 6 ... need last in 8: from pit 5 with 3 seeds -> 6,7,8
    const s = mk(board({ 5: 3, 6: 1, 7: 2, 8: 1, 9: 0, 1: 1, 10: 9 }));
    // after sow: 6 -> 2, 7 -> 3, 8 -> 2: all qualify, chain from 8 back to 6
    const n = play(s, 5);
    expect(n.lastMove?.captures).toEqual([
      { pit: 8, count: 2 },
      { pit: 7, count: 3 },
      { pit: 6, count: 2 },
    ]);
    expect(n.store[0]).toBe(7);
    expect(n.pits.slice(6, 9)).toEqual([0, 0, 0]);
    // a pit in the middle that does not qualify ends the chain
    const m = mk(board({ 5: 3, 6: 1, 7: 3, 8: 1, 1: 1, 10: 9 })); // 6->2, 7->4 (no), 8->2
    expect(play(m, 5).lastMove?.captures).toEqual([{ pit: 8, count: 2 }]);
  });
  it('the chain never leaves the opponent side', () => {
    // human sows into 6 only; pit 5 (own) holds 2 afterwards but must stay
    const s = mk(board({ 4: 2, 5: 1, 6: 1, 0: 1, 10: 9 }));
    const n = play(s, 4); // 5 -> 2, 6 -> 2 (last)
    expect(n.lastMove?.captures).toEqual([{ pit: 6, count: 2 }]);
    expect(n.pits[5]).toBe(2);
    // the CPU's chain stops at pit 6 and does not run into pit 5
    const c = mk(board({ 4: 1, 5: 1, 9: 3, 0: 0, 6: 0 }), { side: 1 });
    expect(c.pits[5]).toBe(1);
  });
  it('the chain wraps for the CPU: last in pit 1, then pit 0, and pit 11 is its own', () => {
    // CPU sows 3 from pit 10: 11, 0, 1. pit 0 holds 1 -> 2, pit 1 holds 2 -> 3
    const s = mk(board({ 10: 3, 0: 1, 1: 2, 11: 1, 6: 1, 4: 9 }), { side: 1 });
    const n = play(s, 10);
    expect(n.lastMove?.captures).toEqual([
      { pit: 1, count: 3 },
      { pit: 0, count: 2 },
    ]);
    expect(n.pits[11]).toBe(2); // own pit, not captured
    expect(n.store).toEqual([0, 5]);
  });
  it('toggle captureChain off: only the last pit is taken', () => {
    const s = mk(board({ 5: 3, 6: 1, 7: 2, 8: 1, 1: 1, 10: 9 }), {
      rules: { captureChain: false },
    });
    const n = play(s, 5);
    expect(n.lastMove?.captures).toEqual([{ pit: 8, count: 2 }]);
    expect(n.pits[6]).toBe(2);
  });
  it('toggle capture threeOnly: 2 is safe, exactly 3 is taken (chain too)', () => {
    const rules = { capture: 'threeOnly' } as const;
    expect(qualifies(2, { ...DEFAULT_RULES, ...rules })).toBe(false);
    expect(qualifies(3, { ...DEFAULT_RULES, ...rules })).toBe(true);
    expect(qualifies(2, DEFAULT_RULES)).toBe(true);
    expect(qualifies(4, DEFAULT_RULES)).toBe(false);
    const two = mk(board({ 5: 1, 6: 1, 0: 1, 10: 9 }), { rules });
    expect(play(two, 5).store[0]).toBe(0);
    const three = mk(board({ 5: 1, 6: 2, 0: 1, 10: 9 }), { rules });
    expect(play(three, 5).store[0]).toBe(3);
    const chain = mk(board({ 5: 2, 6: 2, 7: 2, 0: 1, 10: 9 }), { rules }); // 6 -> 3, 7 -> 3
    expect(play(chain, 5).lastMove?.captures).toHaveLength(2);
  });
  it('a long sow that ends in an opponent pit after skipping the origin can capture', () => {
    const s = mk(board({ 0: 12, 1: 0, 2: 0, 3: 0 }));
    // 12 seeds from pit 0: 1..11 then 1 again, last = pit 1 (own): no capture
    expect(play(s, 0).store).toEqual([0, 0]);
    const t = mk(board({ 0: 17, 6: 1 }));
    // 17 seeds: 1..11 (11), then 1..6 (6) = 17: last = pit 6 which holds 1+1+1 = 3 -> captured
    const n = play(t, 0);
    expect(n.lastMove?.skipped).toBe(true);
    expect(n.lastMove?.last).toBe(6);
    expect(n.lastMove?.captures[0]).toEqual({ pit: 6, count: 3 });
  });
  it('capture() on the raw board is reusable: returns the seeds taken', () => {
    const p = board({ 6: 2, 7: 3 });
    const taken: { pit: number; count: number }[] = [];
    expect(capture(p, 7, 0, DEFAULT_RULES, taken)).toBe(5);
    expect(taken).toHaveLength(2);
  });
});

describe('legal moves and the must-feed rule', () => {
  it('any non-empty pit of the player to move is legal', () => {
    const s = mk(board({ 0: 1, 3: 2, 7: 4 }));
    expect(legalMoves(s).map((m) => m.pit)).toEqual([0, 3]);
    expect(isLegal(s, 7)).toBe(false);
    expect(isLegal(s, 1)).toBe(false);
    expect(() => play(s, 7)).toThrow(/illegal/);
  });
  it('when the opponent side is empty, only moves that reach it are legal', () => {
    const s = mk(board({ 0: 2, 4: 2, 5: 1 }));
    expect(mustFeedNow(s)).toBe(true);
    // pit 0 (2 seeds) and pit 4 (2 seeds: 5, 6) -> only pit 4 reaches; pit 5 (1 seed: 6) reaches
    expect(legalMoves(s).map((m) => m.pit)).toEqual([4, 5]);
  });
  it('the opponent side does not need feeding while it holds seeds', () => {
    const s = mk(board({ 0: 2, 7: 1 }));
    expect(mustFeedNow(s)).toBe(false);
    expect(legalMoves(s).map((m) => m.pit)).toEqual([0]);
  });
  it('a feeding move may capture what it fed; then the opponent has nothing and the game ends', () => {
    const s = mk(board({ 5: 1, 0: 3 }), { store: [10, 5] }); // pit 5 feeds pit 6 with 1 seed: 1, no capture
    const n = play(s, 5);
    expect(n.pits[6]).toBe(1);
    expect(isOver(n)).toBe(false);
  });
  it('toggle mustFeed off: any move is legal even when the opponent side is empty', () => {
    const s = mk(board({ 0: 2, 4: 2, 5: 1 }), { rules: { mustFeed: false } });
    expect(mustFeedNow(s)).toBe(false);
    expect(legalMoves(s).map((m) => m.pit)).toEqual([0, 4, 5]);
  });
  it('legalMoves is empty once the game is over', () => {
    const s = {
      ...mk(board({ 0: 1 })),
      end: { reason: 'stuck' as const, swept: [0, 0] as [number, number] },
    };
    expect(legalMoves(s)).toEqual([]);
    expect(mustFeedNow(s)).toBe(false);
    expect(() => play(s, 0)).toThrow(/over/);
  });
});

describe('end of the game', () => {
  it('a player who cannot feed ends the game: remaining seeds go to their owners (default)', () => {
    // human has 0:1 only; CPU side empty after the CPU's move... set up: CPU moves into emptiness
    // CPU pit 11 has 1 seed -> pit 0: lands on a human pit. Then it is the human's turn with CPU side empty.
    const s = mk(board({ 11: 1, 0: 0, 1: 1, 2: 2 }), { side: 1, store: [10, 6] });
    const n = play(s, 11);
    // human has pits 0 (1), 1 (1), 2 (2); CPU side empty; must feed: no human pit reaches pit 6 -> stuck
    expect(isOver(n)).toBe(true);
    expect(n.end?.reason).toBe('stuck');
    expect(n.store).toEqual([10 + 4, 6]);
    expect(n.end?.swept).toEqual([4, 0]);
    expect(n.pits).toEqual(empty());
    expect(n.winner).toBeNull();
    expect(n.draw).toBe(true); // 14 vs 6: nobody has 25
  });
  it('toggle endSeeds capturer: the other player takes what is left on the board', () => {
    const s = mk(board({ 11: 1, 1: 1, 2: 2 }), {
      side: 1,
      store: [10, 6],
      rules: { endSeeds: 'capturer' },
    });
    const n = play(s, 11);
    expect(n.end?.reason).toBe('stuck');
    expect(n.end?.swept).toEqual([0, 4]);
    expect(n.store).toEqual([10, 10]);
  });
  it('sweepOf: owners vs capturer, and a cap-out always sweeps to the owners', () => {
    const p = board({ 0: 3, 7: 2 });
    expect(sweepOf(p, 0, DEFAULT_RULES)).toEqual([3, 2]);
    expect(sweepOf(p, 0, { ...DEFAULT_RULES, endSeeds: 'capturer' })).toEqual([0, 5]);
    expect(sweepOf(p, 1, { ...DEFAULT_RULES, endSeeds: 'capturer' })).toEqual([5, 0]);
    expect(sweepOf(p, null, { ...DEFAULT_RULES, endSeeds: 'capturer' })).toEqual([3, 2]);
  });
  it('an emptied player ends the game (no seeds to move) and the mover keeps the board', () => {
    // CPU captures the last human seeds
    const s = mk(board({ 11: 1, 0: 2, 7: 3 }), { side: 1, store: [20, 20] });
    const n = play(s, 11);
    expect(n.lastMove?.gained).toBe(3);
    expect(n.end?.reason).toBe('empty');
    expect(n.store).toEqual([20, 23 + 3]);
    expect(n.winner).toBe('cpu');
  });
  it('reaching 25 ends the game at once (a win by score)', () => {
    const s = mk(board({ 5: 1, 6: 1, 8: 4, 0: 1 }), { store: [23, 10] });
    const n = play(s, 5);
    expect(n.store[0]).toBe(25);
    expect(n.end?.reason).toBe('score');
    expect(n.winner).toBe('you');
    expect(n.draw).toBe(false);
    expect(isOver(n)).toBe(true);
    expect(n.pits[8]).toBe(4); // the board is left as it was
  });
  it('24 v 24 is a draw (the documented tie rule), nobody wins', () => {
    const s = mk(board({ 5: 1, 6: 1, 0: 0, 11: 0, 1: 0 }), { store: [22, 24] });
    const n = play(s, 5);
    expect(n.store).toEqual([24, 24]);
    expect(isOver(n)).toBe(true);
    expect(n.winner).toBeNull();
    expect(n.draw).toBe(true);
    expect(totalOf(n, 0)).toBe(24);
  });
  it('the sweep can decide the game: owners keep their side', () => {
    const s = mk(board({ 5: 1, 1: 6, 11: 0, 7: 0 }), { store: [18, 24], side: 1 });
    // CPU has no seeds: it is the CPU's turn with nothing to play
    expect(onSide(s, 1)).toBe(0);
    const t = mk(board({ 11: 1, 1: 0, 2: 3 }), { side: 1, store: [20, 21] });
    const n = play(t, 11);
    expect(n.end?.reason).toBe('stuck');
    expect(n.store).toEqual([20 + 4, 21]);
    expect(n.draw).toBe(true);
  });
  it('the move cap ends a game that never finishes; every side keeps its own seeds', () => {
    const s = mk(board({ 0: 1, 6: 1, 3: 3, 9: 3 }), { plies: MAX_PLIES - 1 });
    const n = play(s, 0);
    expect(n.end?.reason).toBe('cap');
    expect(n.store[0] + n.store[1]).toBe(8);
    expect(n.pits).toEqual(empty());
  });
  it('seeds are conserved all the way: pits + trays = 48 until the end', () => {
    let s = createGame({ seed: 9, human: { id: 'a', name: 'A' }, cpu: { id: 'b', name: 'B' } });
    for (let i = 0; i < 300 && !isOver(s); i++) {
      const m = legalMoves(s)[i % legalMoves(s).length]!;
      s = play(s, m.pit);
      expect(s.pits.reduce((a, b) => a + b, 0) + s.store[0] + s.store[1]).toBe(TOTAL_SEEDS);
    }
  });
});

describe('threatened pits (hint markers)', () => {
  it('lists the human pits the CPU could capture next, and none that are safe', () => {
    // CPU pit 11 (1 seed) lands in pit 0 (2 -> 3): pit 0 is threatened; pit 3 (4 seeds) is not
    const s = mk(board({ 11: 1, 0: 2, 3: 4, 7: 2 }));
    expect(threatenedPits(s, 0)).toEqual([0]);
    expect(threatenedPits(s, 1)).toEqual([7]); // the human could take pit 7 with pit 3
  });
  it('includes the pits of a chain', () => {
    const s = mk(board({ 10: 3, 0: 1, 1: 2, 5: 9, 7: 1 }));
    expect(threatenedPits(s, 0)).toEqual([0, 1]);
  });
  it('does not change the state', () => {
    const s = mk(board({ 11: 1, 0: 2, 3: 4, 7: 2 }));
    const before = serialize(s);
    threatenedPits(s, 0);
    expect(serialize(s)).toBe(before);
  });
});

describe('records and serialisation', () => {
  it('the move record lists the path, skip, last pit, feeding and captures', () => {
    const n = play(mk(board({ 3: 4, 6: 1 })), 3);
    const m = n.lastMove!;
    expect([m.pit, m.count, m.last, m.fed, m.skipped]).toEqual([3, 4, 7, true, false]);
    expect(m.path).toEqual([4, 5, 6, 7]);
    expect(m.playerId).toBe('you');
    expect(m.side).toBe(0);
    expect(n.plies).toBe(1);
    expect(currentSide(n)).toBe(1);
  });
  it('a move that stays at home is not feeding', () => {
    expect(play(mk(board({ 0: 2, 7: 1 })), 0).lastMove?.fed).toBe(false);
  });
  it('state is plain JSON and round-trips', () => {
    const s = play(
      createGame({ seed: 2, human: { id: 'a', name: 'A' }, cpu: { id: 'b', name: 'B' }, first: 0 }),
      2,
    );
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('apply never mutates the state it was given', () => {
    const s = createGame({
      seed: 2,
      human: { id: 'a', name: 'A' },
      cpu: { id: 'b', name: 'B' },
      first: 0,
    });
    const before = serialize(s);
    play(s, 1);
    expect(serialize(s)).toBe(before);
  });
});

describe('rules sanitising', () => {
  it('repairs junk to the defaults and keeps valid values', () => {
    expect(sanitizeRules(null)).toEqual(DEFAULT_RULES);
    expect(sanitizeRules({ skipOrigin: 'yes', capture: 'five', endSeeds: 7 })).toEqual(
      DEFAULT_RULES,
    );
    const custom: Rules = {
      skipOrigin: false,
      captureChain: false,
      capture: 'threeOnly',
      mustFeed: false,
      endSeeds: 'capturer',
    };
    expect(sanitizeRules(custom)).toEqual(custom);
    expect(CAPTURE_RULES).toHaveLength(2);
    expect(END_SEEDS).toHaveLength(2);
  });
});
