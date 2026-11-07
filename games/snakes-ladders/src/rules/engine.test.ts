import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import type { BoardLayout } from './config';
import {
  apply,
  canReroll,
  createGame,
  currentPlayer,
  currentSeatOf,
  deserialize,
  isChoiceTurn,
  isOver,
  legalActions,
  playerById,
  seatById,
  serialize,
  turnsOf,
  turnsUntilChoice,
  type Action,
  type GameState,
  type NewGame,
} from './engine';

const base: NewGame = {
  seed: 1,
  human: { id: 'you', name: 'You' },
  cpus: [{ id: 'cpu1', name: 'Tari', persona: 'tari' }],
};
const game = (o: Partial<NewGame> = {}): GameState => createGame({ ...base, ...o });

/** A tiny layout so scenarios are easy to reason about. */
const small: BoardLayout = {
  size: 10,
  ladders: [{ id: 'up', from: 4, to: 24 }],
  snakes: [{ id: 'down', from: 17, to: 5 }],
};

/** Rng state whose next single roll is `v`. */
function rngFor(v: number): number {
  for (let s = 0; s < 5000; s++) {
    const r = createRng(0);
    r.setState(s);
    if (r.int(1, 6) === v) return s;
  }
  throw new Error('no state');
}
/** Rng state whose next two dice are `[a, b]`. */
function rngForPair(a: number, b: number): number {
  for (let s = 0; s < 50000; s++) {
    const r = createRng(0);
    r.setState(s);
    if (r.int(1, 6) === a && r.int(1, 6) === b) return s;
  }
  throw new Error('no state');
}
const place = (s: GameState, pos: number, index = 0): GameState => ({
  ...s,
  players: s.players.map((p, i) => (i === index ? { ...p, pos } : p)),
});
const rolling = (s: GameState, v: number): GameState => ({ ...s, rng: rngFor(v) });
const play = (s: GameState, ...as: Action[]): GameState => as.reduce(apply, s);
/** a state where re-rolls are off, so a roll moves at once */
const plain = (o: Partial<NewGame> = {}): GameState =>
  game({ rules: { reroll: false, choiceDice: false }, ...o });

describe('setup', () => {
  it('seats one human first and 1 to 3 CPUs', () => {
    for (const n of [1, 2, 3]) {
      const s = game({
        cpus: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `C${i}` })),
      });
      expect(s.players).toHaveLength(n + 1);
      expect(s.turns.seats.filter((x) => x.kind === 'human')).toHaveLength(1);
      expect(currentSeatOf(s).kind).toBe('human');
      expect(s.players.every((p) => p.pos === 0 && p.rerollLeft)).toBe(true);
    }
    expect(seatById(game(), 'cpu1').persona).toBe('tari');
  });

  it('rejects 0 or 4 CPUs', () => {
    expect(() => game({ cpus: [] })).toThrow(RangeError);
    expect(() => game({ cpus: [0, 1, 2, 3].map((i) => ({ id: `c${i}`, name: 'x' })) })).toThrow(
      RangeError,
    );
  });

  it('a CPU can start', () => {
    expect(currentSeatOf(game({ firstSeat: 'cpu' })).id).toBe('cpu1');
  });

  it('defaults: exact finish on, re-roll on, choice every 5th turn', () => {
    const s = game();
    expect(s.rules).toEqual({ exactFinish: true, reroll: true, choiceDice: true, choiceEvery: 5 });
    expect(s.phase).toBe('roll');
  });
});

describe('moving', () => {
  it('a roll moves the pawn and hands over the turn', () => {
    const s = apply(rolling(plain({ layout: small }), 3), { type: 'roll' });
    expect(playerById(s, 'you').pos).toBe(3);
    expect(s.lastMove).toMatchObject({
      playerId: 'you',
      from: 0,
      roll: 3,
      to: 3,
      via: null,
      turn: 1,
    });
    expect(currentPlayer(s).id).toBe('cpu1');
    expect(s.phase).toBe('roll');
  });

  it('landing on a ladder base climbs', () => {
    const s = apply(rolling(plain({ layout: small }), 4), { type: 'roll' });
    expect(playerById(s, 'you').pos).toBe(24);
    expect(s.lastMove).toMatchObject({ landed: 4, to: 24, via: 'ladder', jumpId: 'up' });
  });

  it('landing on a snake head slides down', () => {
    const s = apply(rolling(place(plain({ layout: small }), 12), 5), { type: 'roll' });
    expect(playerById(s, 'you').pos).toBe(5);
    expect(s.lastMove).toMatchObject({ landed: 17, to: 5, via: 'snake', jumpId: 'down' });
  });

  it('landing on a ladder top or a snake tail does nothing special', () => {
    const top = apply(rolling(place(plain({ layout: small }), 20), 4), { type: 'roll' });
    expect(top.lastMove).toMatchObject({ to: 24, via: null });
    const tail = apply(rolling(place(plain({ layout: small }), 1), 4), { type: 'roll' });
    expect(tail.lastMove).toMatchObject({ to: 5, via: null });
  });

  it('does not mutate the previous state', () => {
    const s = rolling(plain(), 2);
    const frozen = JSON.stringify(s);
    apply(s, { type: 'roll' });
    expect(JSON.stringify(s)).toBe(frozen);
  });

  it('turn order cycles through every seat', () => {
    let s = plain({ cpus: [1, 2, 3].map((i) => ({ id: `c${i}`, name: `C${i}` })) });
    const order: string[] = [];
    for (let i = 0; i < 8; i++) {
      order.push(currentPlayer(s).id);
      s = apply(s, { type: 'roll' });
    }
    expect(order).toEqual(['you', 'c1', 'c2', 'c3', 'you', 'c1', 'c2', 'c3']);
  });
});

describe('winning and the exact roll', () => {
  const nearEnd = (exactFinish: boolean): GameState =>
    place(plain({ layout: small, rules: { exactFinish, reroll: false, choiceDice: false } }), 97);

  it('exact roll wins', () => {
    const s = apply(rolling(nearEnd(true), 3), { type: 'roll' });
    expect(s.winner).toBe('you');
    expect(s.phase).toBe('over');
    expect(isOver(s)).toBe(true);
    expect(s.lastMove).toMatchObject({ won: true, to: 100 });
    expect(legalActions(s)).toEqual([]);
    expect(() => apply(s, { type: 'roll' })).toThrow();
  });

  it('overshoot with the exact-roll rule: the pawn stays and the turn passes', () => {
    const s = apply(rolling(nearEnd(true), 5), { type: 'roll' });
    expect(playerById(s, 'you').pos).toBe(97);
    expect(s.lastMove).toMatchObject({ overshoot: true, won: false });
    expect(s.winner).toBeNull();
    expect(currentPlayer(s).id).toBe('cpu1');
  });

  it('overshoot without the rule: any roll past 100 wins', () => {
    const s = apply(rolling(nearEnd(false), 5), { type: 'roll' });
    expect(s.winner).toBe('you');
    expect(playerById(s, 'you').pos).toBe(100);
    expect(s.lastMove?.overshoot).toBe(false);
  });

  it('a ladder that reaches 100 wins', () => {
    const lay: BoardLayout = { size: 10, ladders: [{ id: 'x', from: 90, to: 100 }], snakes: [] };
    const s = apply(rolling(place(plain({ layout: lay }), 86), 4), { type: 'roll' });
    expect(s.winner).toBe('you');
  });

  it('the winner is the CPU when it gets there first, and turnsOf counts its own turns', () => {
    let s = plain({ layout: small });
    s = apply(rolling(s, 1), { type: 'roll' });
    s = place(s, 96, 1);
    s = apply(rolling(s, 4), { type: 'roll' });
    expect(s.winner).toBe('cpu1');
    expect(turnsOf(s, 'cpu1')).toBe(1);
    expect(turnsOf(s, 'you')).toBe(1);
  });
});

describe('re-roll power-up (once per game, same rules for everyone)', () => {
  const withReroll = (o: Partial<NewGame> = {}): GameState =>
    game({ layout: small, rules: { choiceDice: false }, ...o });

  it('after a roll the player may accept or re-roll', () => {
    const s = apply(rolling(withReroll(), 3), { type: 'roll' });
    expect(s.phase).toBe('decide');
    expect(s.roll).toBe(3);
    expect(canReroll(s)).toBe(true);
    expect(legalActions(s)).toEqual([{ type: 'accept' }, { type: 'reroll' }]);
    expect(playerById(s, 'you').pos).toBe(0);
  });

  it('accepting moves by the shown roll and keeps the power-up', () => {
    const s = play(rolling(withReroll(), 3), { type: 'roll' }, { type: 'accept' });
    expect(playerById(s, 'you')).toMatchObject({ pos: 3, rerollLeft: true });
    expect(s.lastMove?.rolledFrom).toBeNull();
  });

  it('re-rolling throws the roll away, takes a new one, and spends the power-up', () => {
    let s = apply(rolling(withReroll(), 3), { type: 'roll' });
    s = apply(s, { type: 'reroll' });
    const me = playerById(s, 'you');
    expect(me.rerollLeft).toBe(false);
    expect(s.lastMove?.rolledFrom).toBe(3);
    expect(me.pos).toBe(s.lastMove?.roll);
    expect(s.phase).toBe('roll');
  });

  it('is available only once per player', () => {
    let s = play(rolling(withReroll(), 3), { type: 'roll' }, { type: 'reroll' });
    s = apply(s, { type: 'roll' }); // the CPU rolls: it has its own power-up
    expect(s.phase).toBe('decide');
    s = apply(s, { type: 'accept' });
    // the human's second turn: no power-up left, so a roll moves at once
    s = apply(s, { type: 'roll' });
    expect(s.phase).toBe('roll');
    expect(s.lastMove?.playerId).toBe('you');
    expect(legalActions(s)).toEqual([{ type: 'roll' }]);
  });

  it('CPU players follow the same rule', () => {
    let s = play(withReroll({ firstSeat: 'cpu' }), { type: 'roll' }, { type: 'reroll' });
    expect(playerById(s, 'cpu1').rerollLeft).toBe(false);
    expect(playerById(s, 'you').rerollLeft).toBe(true);
    expect(s.lastMove?.playerId).toBe('cpu1');
    s = apply(s, { type: 'roll' });
    expect(s.phase).toBe('decide');
  });

  it('a re-roll can rescue a snake', () => {
    let s = place(withReroll(), 12);
    s = apply(rolling(s, 5), { type: 'roll' }); // 17 = snake head
    expect(s.phase).toBe('decide');
    s = apply(s, { type: 'reroll' });
    expect(s.lastMove?.rolledFrom).toBe(5);
  });

  it('the toggle turns it off completely', () => {
    const s = apply(
      rolling(game({ layout: small, rules: { reroll: false, choiceDice: false } }), 3),
      {
        type: 'roll',
      },
    );
    expect(s.phase).toBe('roll');
    expect(canReroll(s)).toBe(false);
    expect(s.players.every((p) => !p.rerollLeft)).toBe(true);
  });

  it('cannot re-roll or accept out of phase', () => {
    const s = withReroll();
    expect(() => apply(s, { type: 'reroll' })).toThrow();
    expect(() => apply(s, { type: 'accept' })).toThrow();
    expect(() => apply(s, { type: 'pick', index: 0 })).toThrow();
    const d = apply(rolling(s, 2), { type: 'roll' });
    expect(() => apply(d, { type: 'roll' })).toThrow();
  });
});

describe('pick one of two dice on every 5th own turn', () => {
  const noReroll = (o: Partial<NewGame> = {}): GameState =>
    game({ layout: small, rules: { reroll: false }, ...o });

  /** play `n` turns each (human and CPU) with plain rolls */
  function turns(s: GameState, own: number): GameState {
    for (let i = 0; i < own * 2; i++)
      s = apply({ ...s, rng: rngFor(1 + (i % 2)) }, { type: 'roll' });
    return s;
  }

  it('turns 1-4 roll one die, turn 5 offers two', () => {
    let s = noReroll({ layout: { size: 10, ladders: [], snakes: [] } });
    for (let own = 1; own <= 4; own++) {
      expect(isChoiceTurn(s)).toBe(false);
      expect(turnsUntilChoice(s)).toBe(5 - (own - 1));
      s = turns(s, 1);
    }
    expect(isChoiceTurn(s)).toBe(true);
    expect(turnsUntilChoice(s)).toBe(1);
    s = apply(s, { type: 'roll' });
    expect(s.phase).toBe('pick');
    expect(s.dice).toHaveLength(2);
    expect(legalActions(s)).toEqual([
      { type: 'pick', index: 0 },
      { type: 'pick', index: 1 },
    ]);
  });

  it('the CPU gets the same two-dice turn on its own 5th turn', () => {
    let s = noReroll({ layout: { size: 10, ladders: [], snakes: [] } });
    s = turns(s, 4);
    s = apply(s, { type: 'roll' });
    s = apply(s, { type: 'pick', index: 0 });
    expect(currentPlayer(s).id).toBe('cpu1');
    expect(isChoiceTurn(s)).toBe(true);
    s = apply(s, { type: 'roll' });
    expect(s.phase).toBe('pick');
  });

  it('picking uses that die and records both', () => {
    let s = noReroll({ layout: { size: 10, ladders: [], snakes: [] } });
    s = turns(s, 4);
    s = apply({ ...s, rng: rngForPair(2, 5) }, { type: 'roll' });
    expect(s.dice).toEqual([2, 5]);
    const second = apply(s, { type: 'pick', index: 1 });
    expect(second.lastMove).toMatchObject({ roll: 5, picked: { options: [2, 5], index: 1 } });
    const first = apply(s, { type: 'pick', index: 0 });
    expect(first.lastMove).toMatchObject({ roll: 2, picked: { options: [2, 5], index: 0 } });
    expect(first.dice).toBeNull();
    expect(first.phase).toBe('roll');
  });

  it('after picking, the re-roll can still be used', () => {
    let s = game({ layout: { size: 10, ladders: [], snakes: [] } });
    s = turns({ ...s, players: s.players.map((p) => ({ ...p, rerollLeft: false })) }, 4);
    s = { ...s, players: s.players.map((p) => ({ ...p, rerollLeft: true })) };
    s = apply({ ...s, rng: rngForPair(3, 4) }, { type: 'roll' });
    s = apply(s, { type: 'pick', index: 1 });
    expect(s.phase).toBe('decide');
    expect(s.roll).toBe(4);
    s = apply(s, { type: 'reroll' });
    expect(s.lastMove).toMatchObject({ rolledFrom: 4 });
    expect(s.lastMove?.picked).not.toBeNull();
  });

  it('the toggle turns it off, and other intervals work', () => {
    let s = game({ rules: { reroll: false, choiceDice: false }, layout: small });
    s = turns(s, 5);
    expect(isChoiceTurn(s)).toBe(false);
    expect(turnsUntilChoice(s)).toBe(0);
    let t = game({ rules: { reroll: false, choiceEvery: 2 }, layout: small });
    t = turns(t, 1);
    expect(isChoiceTurn(t)).toBe(true);
  });

  it('cannot pick without two dice, or an index other than 0/1', () => {
    const s = noReroll();
    expect(() => apply(s, { type: 'pick', index: 0 })).toThrow();
    let t = turns(noReroll({ layout: { size: 10, ladders: [], snakes: [] } }), 4);
    t = apply(t, { type: 'roll' });
    expect(() => apply(t, { type: 'pick', index: 2 as 0 })).toThrow();
  });
});

describe('determinism and serialization', () => {
  function playOut(seed: number): { winner: string | null; moves: number; log: number[] } {
    let s = game({ seed });
    const log: number[] = [];
    let moves = 0;
    while (!isOver(s) && moves < 3000) {
      const actions = legalActions(s);
      const a = actions[actions.length - 1] as Action; // always take the last option
      s = apply(s, a);
      if (s.lastMove && a.type !== 'roll' && a.type !== 'pick') log.push(s.lastMove.to);
      moves++;
    }
    return { winner: s.winner, moves, log };
  }

  it('the same seed gives the same game', () => {
    expect(playOut(42)).toEqual(playOut(42));
    expect(playOut(42).winner).not.toBeNull();
  });

  it('different seeds give different games', () => {
    expect(playOut(1).log).not.toEqual(playOut(2).log);
  });

  it('state survives a JSON round trip mid-game and then plays on identically', () => {
    let s = game({
      seed: 7,
      cpus: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });
    for (let i = 0; i < 30; i++) s = apply(s, legalActions(s)[0] as Action);
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
    let x = s;
    let y = copy;
    for (let i = 0; i < 60 && !isOver(x); i++) {
      x = apply(x, legalActions(x)[0] as Action);
      y = apply(y, legalActions(y)[0] as Action);
    }
    expect(y).toEqual(x);
  });

  it('rejects unusable saved states', () => {
    expect(() => deserialize('{"version":2}')).toThrow();
    expect(() => deserialize('{"version":1,"players":[],"layout":{"size":4}}')).toThrow();
  });

  it('every game finishes within a sane number of turns (exact finish on and off)', () => {
    for (const exactFinish of [true, false]) {
      for (let seed = 1; seed <= 30; seed++) {
        let s = game({ seed, rules: { exactFinish }, cpus: [{ id: 'a', name: 'A' }] });
        let n = 0;
        while (!isOver(s) && n++ < 5000) s = apply(s, legalActions(s)[0] as Action);
        expect(isOver(s)).toBe(true);
      }
    }
  });
});
