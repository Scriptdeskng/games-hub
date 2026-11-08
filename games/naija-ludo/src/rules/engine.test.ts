import { createRng } from '@naija/core/rng';
import { rollDie } from '@naija/core/board-kit';
import { describe, expect, it } from 'vitest';
import { isSafeSquare, isSeedSafe, trackDistance, trackIndex, zoneOf } from './board';
import { DEFAULT_RULES, HOME, sanitizeRules, type Rules } from './config';
import {
  apply,
  createGame,
  currentPlayer,
  deserialize,
  homeTarget,
  isOver,
  legalActions,
  legalMoves,
  serialize,
  turnsOf,
  type GameState,
} from './engine';

const cpu = (id: string) => ({ id, name: id });
const make = (rules: Partial<Rules> = {}, cpus = 1, seed = 1): GameState =>
  createGame({
    seed,
    human: { id: 'you', name: 'You' },
    cpus: Array.from({ length: cpus }, (_, i) => cpu(`c${i + 1}`)) as [ReturnType<typeof cpu>],
    rules,
  });

/** Put seeds (progress values) on players and a die value waiting in the move phase. */
const setup = (
  s: GameState,
  seeds: Record<string, number[]>,
  roll: number | null = null,
  extra: Partial<GameState> = {},
): GameState => ({
  ...s,
  players: s.players.map((p) => ({ ...p, seeds: seeds[p.id] ?? p.seeds })),
  phase: roll === null ? 'roll' : 'move',
  roll,
  ...extra,
});
/** CPU 1 sits opposite (slot 2): the progress it needs to stand on track square `idx`. */
const cpuAt = (idx: number): number => (idx - 26 + 52) % 52;
const YARD4 = [-1, -1, -1, -1];

/** A seed whose first die is `value`. */
const seedRolling = (value: number): number => {
  for (let seed = 1; ; seed++) {
    if (rollDie(createRng(seed), 6) === value) return seed;
  }
};

describe('board geometry', () => {
  it('has 8 safe squares: every start and the star 8 squares after it', () => {
    const safe = [...Array(52).keys()].filter(isSafeSquare);
    expect(safe).toEqual([0, 8, 13, 21, 26, 34, 39, 47]);
  });
  it('maps progress to track squares per colour and to zones', () => {
    expect(trackIndex(0, 0)).toBe(0);
    expect(trackIndex(2, 0)).toBe(26);
    expect(trackIndex(3, 50)).toBe((39 + 50) % 52);
    expect(zoneOf(-1)).toBe('yard');
    expect(zoneOf(0)).toBe('track');
    expect(zoneOf(50)).toBe('track');
    expect(zoneOf(51)).toBe('column');
    expect(zoneOf(55)).toBe('column');
    expect(zoneOf(56)).toBe('home');
    expect(isSeedSafe(0, 8)).toBe(true);
    expect(isSeedSafe(0, 9)).toBe(false);
    expect(isSeedSafe(0, 53)).toBe(true);
    expect(isSeedSafe(0, -1)).toBe(true);
    expect(trackDistance(50, 2)).toBe(4);
    expect(trackDistance(2, 50)).toBe(48);
  });
});

describe('setup', () => {
  it('seats one human and the CPU opposite, or three CPUs around the board', () => {
    expect(make({}, 1).players.map((p) => p.slot)).toEqual([0, 2]);
    expect(make({}, 3).players.map((p) => p.slot)).toEqual([0, 1, 2, 3]);
    expect(make({}, 3).turns.seats.map((x) => x.kind)).toEqual(['human', 'cpu', 'cpu', 'cpu']);
  });
  it('refuses any CPU count other than 1 or 3 (and there is no second human)', () => {
    expect(() => make({}, 2)).toThrow(RangeError);
    expect(() => createGame({ seed: 1, human: cpu('a'), cpus: [] as never })).toThrow(RangeError);
  });
  it('gives each side 4 seeds, or 2 in quick mode, all in the yard', () => {
    expect(make().players.every((p) => p.seeds.join() === YARD4.join())).toBe(true);
    expect(make({ quick: true }).players.every((p) => p.seeds.length === 2)).toBe(true);
  });
  it('can let the CPU start', () => {
    const s = createGame({ seed: 1, human: cpu('h'), cpus: [cpu('c')], firstSeat: 'cpu' });
    expect(currentPlayer(s).id).toBe('c');
  });
  it('sanitizeRules repairs junk and keeps valid values', () => {
    expect(sanitizeRules(null)).toEqual(DEFAULT_RULES);
    expect(sanitizeRules({ stacks: 'nope', exactHome: 'x', threeSixes: false })).toEqual({
      ...DEFAULT_RULES,
      threeSixes: false,
    });
    expect(sanitizeRules({ stacks: 'block', quick: true }).stacks).toBe('block');
    expect(sanitizeRules({ stacks: 'block', quick: true }).quick).toBe(true);
  });
  it('homeTarget: 4 classic, 1 quick (first home), 2 quick (both)', () => {
    expect(homeTarget(DEFAULT_RULES)).toBe(4);
    expect(homeTarget({ ...DEFAULT_RULES, quick: true })).toBe(1);
    expect(homeTarget({ ...DEFAULT_RULES, quick: true, quickFirstHome: false })).toBe(2);
  });
});

describe('rolling and releasing', () => {
  it('same seed, same game: dice are deterministic and independent of who plays', () => {
    const play = (): string => {
      let s = make({}, 1, 42);
      for (let i = 0; i < 60 && !isOver(s); i++) s = apply(s, legalActions(s)[0]!);
      return serialize(s);
    };
    expect(play()).toBe(play());
    const a = apply(make({}, 1, 7), { type: 'roll' });
    const b = apply(make({}, 3, 7), { type: 'roll' });
    expect(a.lastRoll!.value).toBe(b.lastRoll!.value);
  });

  it('a roll with every seed in the yard and no 6 passes the turn', () => {
    const s = apply(make({}, 1, seedRolling(3)), { type: 'roll' });
    expect(s.lastRoll).toMatchObject({ value: 3, stuck: true, forfeit: false });
    expect(s.phase).toBe('roll');
    expect(currentPlayer(s).id).toBe('c1');
    expect(s.roll).toBeNull();
  });

  it('a 6 releases a seed onto the start square and earns an extra roll', () => {
    let s = apply(make({}, 1, seedRolling(6)), { type: 'roll' });
    expect(s.phase).toBe('move');
    const moves = legalMoves(s);
    expect(moves).toHaveLength(4);
    expect(moves.every((m) => m.release && m.from === -1 && m.to === 0)).toBe(true);
    s = apply(s, { type: 'move', seed: 2 });
    expect(currentPlayer(s).seeds).toEqual([-1, -1, 0, -1]);
    expect(s.lastMove).toMatchObject({ release: true, again: 'six', playerId: 'you' });
    expect(currentPlayer(s).id).toBe('you');
    expect(s.phase).toBe('roll');
  });

  it('a seed in the yard cannot move on any other number', () => {
    const s = setup(make(), { you: [-1, 20, -1, -1] }, 4);
    expect(legalMoves(s).map((m) => m.seed)).toEqual([1]);
  });

  it('a stuck 6 still gives the roll back', () => {
    // seeds near home that overshoot, nothing in the yard
    const s0 = setup(make({}, 1, seedRolling(6)), { you: [55, 55, HOME, HOME] });
    const s = apply(s0, { type: 'roll' });
    expect(s.lastRoll).toMatchObject({ stuck: true, value: 6 });
    expect(currentPlayer(s).id).toBe('you');
  });

  it('refuses illegal actions without changing anything', () => {
    const s = make();
    expect(() => apply(s, { type: 'move', seed: 0 })).toThrow();
    const m = setup(s, { you: [5, -1, -1, -1] }, 3);
    expect(() => apply(m, { type: 'roll' })).toThrow();
    expect(() => apply(m, { type: 'move', seed: 1 })).toThrow();
    expect(() => apply(m, { type: 'move', seed: 9 })).toThrow();
    expect(m.players[0]!.seeds).toEqual([5, -1, -1, -1]);
    expect(legalActions({ ...m, phase: 'over' })).toEqual([]);
    expect(() => apply({ ...m, winner: 'you', phase: 'over' }, { type: 'roll' })).toThrow();
  });

  it('never mutates the state it was given', () => {
    const s = setup(make(), { you: [5, 9, -1, -1] }, 3);
    const copy = serialize(s);
    apply(s, { type: 'move', seed: 0 });
    expect(serialize(s)).toBe(copy);
  });
});

describe('movement, capture and safe squares', () => {
  it('moves one seed by the roll and passes the turn on a non-6', () => {
    const s = apply(setup(make(), { you: [5, 9, -1, -1] }, 3), { type: 'move', seed: 0 });
    expect(currentPlayer(s).id).toBe('c1');
    expect(s.players[0]!.seeds).toEqual([8, 9, -1, -1]);
    expect(s.lastMove).toMatchObject({ from: 5, to: 8, again: null, captures: [] });
  });

  it('lands on a lone opponent seed on a normal square: it goes home to the yard, and you roll again', () => {
    const s0 = setup(make(), { you: [6, -1, -1, -1], c1: [cpuAt(10), 30, -1, -1] }, 4);
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.players[1]!.seeds).toEqual([-1, 30, -1, -1]);
    expect(s.lastMove!.captures).toEqual([
      { playerId: 'c1', seed: 0, from: cpuAt(10), square: 10 },
    ]);
    expect(s.lastMove!.again).toBe('capture');
    expect(currentPlayer(s).id).toBe('you');
  });

  it('capture bonus can be switched off', () => {
    const s0 = setup(
      make({ captureBonus: false }),
      { you: [6, -1, -1, -1], c1: [cpuAt(10), -1, -1, -1] },
      4,
    );
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.players[1]!.seeds[0]).toBe(-1);
    expect(s.lastMove!.again).toBeNull();
    expect(currentPlayer(s).id).toBe('c1');
  });

  it('cannot capture on a star square or on any start square', () => {
    for (const idx of [8, 21, 34, 47, 13, 39, 26]) {
      const from = (idx - 3 + 52) % 52;
      // human is slot 0: it can stand on idx only at progress idx (0..50)
      if (idx > 50) continue;
      const s0 = setup(make(), { you: [from, -1, -1, -1], c1: [cpuAt(idx), -1, -1, -1] }, 3);
      const mv = legalMoves(s0).find((m) => m.seed === 0);
      expect(mv, `square ${idx}`).toBeTruthy();
      expect(mv!.captures, `square ${idx}`).toEqual([]);
      const s = apply(s0, { type: 'move', seed: 0 });
      expect(s.players[1]!.seeds[0]).toBe(cpuAt(idx));
    }
  });

  it('a release onto the start square does not capture a lone opponent seed there', () => {
    // square 0 is the human start square; the opponent seed sits on it (progress 26 for slot 2)
    const s0 = setup(make(), { you: YARD4, c1: [cpuAt(0), -1, -1, -1] }, 6);
    const mv = legalMoves(s0).find((m) => m.seed === 0);
    expect(mv, 'release is legal').toBeTruthy();
    expect(mv!.to).toBe(0);
    expect(mv!.captures).toEqual([]);
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.players[1]!.seeds[0]).toBe(cpuAt(0));
    expect(s.players[0]!.seeds[0]).toBe(0);
    expect(s.lastMove!.again).toBe('six');
  });

  it('the bonus roll only follows a real capture', () => {
    const s0 = setup(make(), { you: [5, -1, -1, -1], c1: [cpuAt(8), -1, -1, -1] }, 3);
    expect(apply(s0, { type: 'move', seed: 0 }).lastMove!.again).toBeNull();
  });

  it('captures every lone opponent on the square (three CPUs)', () => {
    const s0 = setup(
      make({}, 3),
      {
        you: [6, -1, -1, -1],
        c1: [(10 - 13 + 52) % 52, -1, -1, -1],
        c3: [(10 - 39 + 52) % 52, -1, -1, -1],
      },
      4,
    );
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.lastMove!.captures.map((c) => c.playerId).sort()).toEqual(['c1', 'c3']);
  });

  it('your own seeds share a square without capturing each other', () => {
    const s = apply(setup(make(), { you: [5, 9, -1, -1] }, 4), { type: 'move', seed: 0 });
    expect(s.players[0]!.seeds).toEqual([9, 9, -1, -1]);
    expect(s.lastMove!.captures).toEqual([]);
  });

  it('seeds in the home column cannot be captured, whatever the opponent lands on', () => {
    // the human walks round the whole track over the squares the CPU's column "would" map to
    for (let p = 51; p <= 55; p++) {
      for (let from = 0; from <= 50; from++) {
        const s0 = setup(make(), { you: [from, -1, -1, -1], c1: [p, -1, -1, -1] }, 1);
        const mv = legalMoves(s0).find((m) => m.seed === 0);
        expect(mv?.captures ?? []).toEqual([]);
      }
    }
  });

  it('a seed past progress 50 enters its own column, which is not a track square', () => {
    const s = apply(setup(make(), { you: [48, -1, -1, -1] }, 4), { type: 'move', seed: 0 });
    expect(s.players[0]!.seeds[0]).toBe(52);
    expect(s.lastMove!.captures).toEqual([]);
  });
});

describe('stacks (two or more same-colour seeds on a square)', () => {
  const stackSetup = (rules: Partial<Rules>): GameState =>
    setup(make(rules), { you: [6, -1, -1, -1], c1: [cpuAt(10), cpuAt(10), -1, -1] }, 4);

  it('safe (default): a stack cannot be captured and the mover shares the square', () => {
    const s0 = stackSetup({ stacks: 'safe' });
    const mv = legalMoves(s0).find((m) => m.seed === 0)!;
    expect(mv.captures).toEqual([]);
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.players[1]!.seeds.slice(0, 2)).toEqual([cpuAt(10), cpuAt(10)]);
    expect(s.lastMove!.again).toBeNull();
  });

  it('off: the whole stack is captured', () => {
    const s = apply(stackSetup({ stacks: 'off' }), { type: 'move', seed: 0 });
    expect(s.lastMove!.captures).toHaveLength(2);
    expect(s.players[1]!.seeds).toEqual(YARD4);
  });

  it('off: capturing a whole stack earns no bonus roll, even with captureBonus on', () => {
    const s = apply(stackSetup({ stacks: 'off', captureBonus: true }), { type: 'move', seed: 0 });
    expect(s.lastMove!.captures).toHaveLength(2);
    expect(s.lastMove!.again).toBeNull();
    expect(currentPlayer(s).id).toBe('c1');
  });

  it('off: capturing a lone seed still earns the bonus roll', () => {
    const s0 = setup(
      make({ stacks: 'off' }),
      { you: [6, -1, -1, -1], c1: [cpuAt(10), -1, -1, -1] },
      4,
    );
    const s = apply(s0, { type: 'move', seed: 0 });
    expect(s.lastMove!.captures).toHaveLength(1);
    expect(s.lastMove!.again).toBe('capture');
    expect(currentPlayer(s).id).toBe('you');
  });

  it('block: nobody may land on or pass a blockade', () => {
    const land = stackSetup({ stacks: 'block' });
    expect(legalMoves(land).find((m) => m.seed === 0)).toBeUndefined();
    const pass = setup(
      make({ stacks: 'block' }),
      { you: [6, 20, -1, -1], c1: [cpuAt(8), cpuAt(8), -1, -1] },
      4,
    );
    expect(legalMoves(pass).map((m) => m.seed)).toEqual([1]);
    // a seed that is already past the stack is free
    const free = setup(
      make({ stacks: 'block' }),
      { you: [9, -1, -1, -1], c1: [cpuAt(8), cpuAt(8), -1, -1] },
      4,
    );
    expect(legalMoves(free)).toHaveLength(1);
  });

  it('block: your own stack does not block you', () => {
    const s = setup(make({ stacks: 'block' }), { you: [6, 7, 7, -1] }, 4);
    expect(legalMoves(s).map((m) => m.seed)).toEqual([0, 1, 2]);
  });

  it('block: release is refused while an opponent blockade sits on your start square', () => {
    // c1 (slot 2) has two seeds on square 0, which is the human's start square
    const s0 = setup(
      make({ stacks: 'block' }),
      { you: YARD4, c1: [cpuAt(0), cpuAt(0), -1, -1] },
      6,
    );
    expect(legalMoves(s0)).toEqual([]);
    // under the default rule the same release is fine (start squares are safe and shared)
    const open = setup(make(), { you: YARD4, c1: [cpuAt(0), cpuAt(0), -1, -1] }, 6);
    expect(legalMoves(open)).toHaveLength(4);
    const s = apply(open, { type: 'move', seed: 0 });
    expect(s.players[1]!.seeds.slice(0, 2)).toEqual([cpuAt(0), cpuAt(0)]);
  });

  it('block: a roll with only blocked moves passes the turn', () => {
    const s0 = setup(make({ stacks: 'block' }, 1, seedRolling(6)), {
      you: YARD4,
      c1: [cpuAt(0), cpuAt(0), -1, -1],
    });
    const s = apply(s0, { type: 'roll' });
    expect(s.lastRoll).toMatchObject({ stuck: true });
    expect(currentPlayer(s).id).toBe('you'); // a 6 still rolls again
  });
});

describe('exact roll to reach home', () => {
  it('an exact roll gets home; an overshoot is not a legal move', () => {
    const s = setup(make(), { you: [53, 54, -1, -1] }, 3);
    expect(legalMoves(s).map((m) => [m.seed, m.to, m.home])).toEqual([[0, HOME, true]]);
    const six = setup(make(), { you: [55, -1, -1, -1] }, 2);
    expect(legalMoves(six)).toEqual([]);
  });
  it('overshooting passes the turn when nothing else can move', () => {
    const s = apply(setup(make({}, 1, seedRolling(5)), { you: [55, HOME, HOME, HOME] }), {
      type: 'roll',
    });
    expect(s.lastRoll!.stuck).toBe(true);
    expect(currentPlayer(s).id).toBe('c1');
  });
  it('with the rule off any roll that reaches or passes home gets the seed home', () => {
    const s = setup(make({ exactHome: false }), { you: [55, -1, -1, -1] }, 5);
    expect(legalMoves(s)[0]).toMatchObject({ to: HOME, home: true });
  });
  it('no move for a seed already home', () => {
    expect(legalMoves(setup(make(), { you: [HOME, 3, -1, -1] }, 2)).map((m) => m.seed)).toEqual([
      1,
    ]);
  });
});

describe('three sixes in a row', () => {
  const rollWith = (s: GameState, value: number): GameState =>
    apply({ ...s, rng: findRng(value) }, { type: 'roll' });
  const findRng = (value: number): number => {
    for (let seed = 1; ; seed++) {
      if (rollDie(createRng(seed), 6) === value) return createRng(seed).getState();
    }
  };

  it('the third 6 forfeits the turn: nothing moves, the next colour plays', () => {
    let s = setup(make(), { you: [10, -1, -1, -1] });
    s = rollWith(s, 6);
    s = apply(s, { type: 'move', seed: 0 }); // first six: 10 -> 16, again
    expect(s.sixes).toBe(1);
    s = rollWith(s, 6);
    expect(s.sixes).toBe(2);
    s = apply(s, { type: 'move', seed: 0 }); // second six: 16 -> 22, again
    expect(currentPlayer(s).id).toBe('you');
    expect(s.players[0]!.seeds[0]).toBe(22);
    s = rollWith(s, 6);
    expect(s.lastRoll).toMatchObject({ forfeit: true, sixes: 3, value: 6 });
    expect(s.phase).toBe('roll');
    expect(currentPlayer(s).id).toBe('c1');
    expect(s.sixes).toBe(0);
    // the seed that moved on the second six is NOT undone
    expect(s.players[0]!.seeds[0]).toBe(22);
  });

  it('a non-6 breaks the run', () => {
    let s = setup(make(), { you: [10, -1, -1, -1] });
    s = rollWith(s, 6);
    s = apply(s, { type: 'move', seed: 0 });
    s = rollWith(s, 3);
    expect(s.sixes).toBe(0);
    s = apply(s, { type: 'move', seed: 0 });
    expect(currentPlayer(s).id).toBe('c1');
  });

  it('the rule can be switched off', () => {
    let s = setup(make({ threeSixes: false }), { you: [10, -1, -1, -1] }, null, { sixes: 2 });
    s = rollWith(s, 6);
    expect(s.lastRoll!.forfeit).toBe(false);
    expect(s.phase).toBe('move');
  });

  it('the count starts over for the next player', () => {
    let s = setup(make(), { you: [10, -1, -1, -1] }, null, { sixes: 2 });
    s = rollWith(s, 6);
    expect(currentPlayer(s).id).toBe('c1');
    s = rollWith(s, 6);
    expect(s.sixes).toBe(1);
  });
});

describe('winning', () => {
  it('classic: all four seeds home', () => {
    const almost = setup(make(), { you: [HOME, HOME, HOME, 55] }, 1);
    const s = apply(almost, { type: 'move', seed: 3 });
    expect(s.winner).toBe('you');
    expect(s.phase).toBe('over');
    expect(s.lastMove!.won).toBe(true);
    expect(isOver(s)).toBe(true);
    expect(legalActions(s)).toEqual([]);
  });
  it('classic: three home is not a win', () => {
    const s = apply(setup(make(), { you: [HOME, HOME, 55, 3] }, 1), { type: 'move', seed: 2 });
    expect(s.winner).toBeNull();
  });
  it('quick, first home wins (default)', () => {
    const q = make({ quick: true });
    const s = apply(setup(q, { you: [55, 3] }, 1), { type: 'move', seed: 0 });
    expect(s.winner).toBe('you');
  });
  it('quick, both home wins when the toggle is off', () => {
    const q = make({ quick: true, quickFirstHome: false });
    const one = apply(setup(q, { you: [55, 3] }, 1), { type: 'move', seed: 0 });
    expect(one.winner).toBeNull();
    const two = apply(setup(q, { you: [HOME, 55] }, 1), { type: 'move', seed: 1 });
    expect(two.winner).toBe('you');
  });
  it('a CPU can win, against 1 CPU and in a 3 CPU game', () => {
    const one = setup(make({}, 1), { c1: [HOME, HOME, HOME, 55] }, 1, {
      turns: { ...make().turns, index: 1 },
    });
    expect(apply(one, { type: 'move', seed: 3 }).winner).toBe('c1');
    const three = make({}, 3);
    const t3 = setup(three, { c3: [HOME, HOME, HOME, 55] }, 1, {
      turns: { ...three.turns, index: 3 },
    });
    const done = apply(t3, { type: 'move', seed: 3 });
    expect(done.winner).toBe('c3');
    expect(turnsOf(done, 'c3')).toBe(0);
  });
});

describe('serialization', () => {
  it('round-trips through JSON mid-game and replays identically', () => {
    let s = make({ stacks: 'block' }, 3, 99);
    for (let i = 0; i < 80 && !isOver(s); i++) s = apply(s, legalActions(s)[0]!);
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
    let a = s;
    let b = copy;
    for (let i = 0; i < 50 && !isOver(a); i++) {
      a = apply(a, legalActions(a)[0]!);
      b = apply(b, legalActions(b)[0]!);
    }
    expect(b).toEqual(a);
  });
  it('rejects garbage', () => {
    expect(() => deserialize('{"version":2}')).toThrow();
    expect(() => deserialize('{}')).toThrow();
  });
});

describe('1000 random games terminate and stay legal', () => {
  const variants: Partial<Rules>[] = [
    {},
    { stacks: 'block' },
    { stacks: 'off', exactHome: false, captureBonus: false, threeSixes: false },
    { quick: true },
    { quick: true, quickFirstHome: false, stacks: 'block' },
  ];
  it('every action is legal, invariants hold, and a winner emerges', () => {
    let games = 0;
    for (let g = 0; g < 1000; g++) {
      const rules = variants[g % variants.length]!;
      let s = make(rules, g % 2 ? 3 : 1, g + 1);
      const rng = createRng(g * 7 + 3);
      let steps = 0;
      while (!isOver(s)) {
        const acts = legalActions(s);
        expect(acts.length).toBeGreaterThan(0);
        s = apply(s, rng.pick(acts));
        if (++steps > 20000) throw new Error(`game ${g} did not terminate`);
        for (const p of s.players) {
          for (const x of p.seeds) {
            if (x < -1 || x > HOME) throw new Error('seed out of range');
          }
        }
        // captures only ever happen on normal track squares, and a stack is only taken when stacks are off
        for (const c of s.lastMove?.captures ?? []) {
          expect(isSafeSquare(c.square)).toBe(false);
          if (rules.stacks !== 'off') {
            expect(s.lastMove!.captures.filter((x) => x.playerId === c.playerId)).toHaveLength(1);
          }
        }
      }
      expect(s.winner).toBeTruthy();
      games++;
    }
    expect(games).toBe(1000);
    // 1000 full games with per-step invariant checks: ~11 s under v8 coverage, over the 5 s default.
  }, 60000);
});
