import {
  advanceTurn,
  createTurns,
  currentSeat,
  rollDie,
  turnsTaken,
  type Seat,
  type TurnState,
} from '@naija/core/board-kit';
import { createRng } from '@naija/core/rng';
import { trackIndex, isSafeSquare } from './board';
import {
  CPU_COUNTS,
  DEFAULT_RULES,
  HOME,
  LAST_TRACK,
  MAX_ROLL,
  YARD,
  seedsPer,
  type Rules,
} from './config';

export interface Player {
  id: string;
  /** colour slot 0..3, clockwise; slot 0 is the human */
  slot: number;
  /** progress of each seed: -1 yard, 0..50 track, 51..55 home column, 56 home */
  seeds: number[];
}

export type Phase = 'roll' | 'move' | 'over';

export interface Capture {
  playerId: string;
  seed: number;
  /** the progress the captured seed had (it goes back to the yard) */
  from: number;
  /** the track square where it happened */
  square: number;
}

/** A legal move of one seed for the current roll. */
export interface Move {
  seed: number;
  from: number;
  to: number;
  release: boolean;
  captures: Capture[];
  home: boolean;
}

/** What a roll did when it did not lead to a move (the view plays it). */
export interface RollRecord {
  playerId: string;
  value: number;
  /** consecutive sixes including this roll */
  sixes: number;
  /** third six in a row: the turn is forfeited */
  forfeit: boolean;
  /** no seed could move: the turn passes (or, after a 6, the same player rolls again) */
  stuck: boolean;
}

export interface MoveRecord extends Move {
  playerId: string;
  roll: number;
  /** why the same player rolls again */
  again: 'six' | 'capture' | null;
  won: boolean;
}

export interface GameState {
  version: 1;
  seed: number;
  /** dice rng state (mulberry32) */
  rng: number;
  rules: Rules;
  /** same order as `turns.seats`: the human first, then the CPUs clockwise */
  players: Player[];
  turns: TurnState;
  phase: Phase;
  /** move phase: the die value waiting to be used */
  roll: number | null;
  /** consecutive 6s rolled by the current player */
  sixes: number;
  lastRoll: RollRecord | null;
  lastMove: MoveRecord | null;
  winner: string | null;
}

export type Action = { type: 'roll' } | { type: 'move'; seed: number };

export interface SeatSetup {
  id: string;
  name: string;
  persona?: string;
}

export interface NewGame {
  seed: number;
  human: { id: string; name: string };
  /** 1 CPU (opposite) or 3 CPUs */
  cpus: readonly SeatSetup[];
  rules?: Partial<Rules>;
  firstSeat?: 'human' | 'cpu';
}

export function createGame(o: NewGame): GameState {
  if (!CPU_COUNTS.includes(o.cpus.length)) {
    throw new RangeError('a game needs 1 or 3 CPU opponents');
  }
  const turns = createTurns({
    human: o.human,
    cpus: o.cpus as [SeatSetup, ...SeatSetup[]],
    firstSeat: o.firstSeat,
  });
  const rules = { ...DEFAULT_RULES, ...o.rules };
  const slots = o.cpus.length === 1 ? [0, 2] : [0, 1, 2, 3];
  return {
    version: 1,
    seed: o.seed >>> 0,
    rng: createRng(o.seed >>> 0).getState(),
    rules,
    players: turns.seats.map((s, i) => ({
      id: s.id,
      slot: slots[i] as number,
      seeds: Array.from({ length: seedsPer(rules) }, () => YARD),
    })),
    turns,
    phase: 'roll',
    roll: null,
    sixes: 0,
    lastRoll: null,
    lastMove: null,
    winner: null,
  };
}

export const currentPlayer = (s: GameState): Player => s.players[s.turns.index] as Player;
export const currentSeatOf = (s: GameState): Seat => currentSeat(s.turns);
export const playerById = (s: GameState, id: string): Player =>
  s.players.find((p) => p.id === id) as Player;
export const isOver = (s: GameState): boolean => s.winner !== null;
export const turnsOf = (s: GameState, id: string): number => turnsTaken(s.turns, id);
export const homeCount = (p: Player): number => p.seeds.filter((x) => x === HOME).length;
/** Seeds a player needs home to win under the current rules. */
export function homeTarget(rules: Rules): number {
  if (!rules.quick) return seedsPer(rules);
  return rules.quickFirstHome ? 1 : seedsPer(rules);
}

const onSquare = (p: Player, idx: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < p.seeds.length; i++) {
    const q = p.seeds[i] as number;
    if (q >= 0 && q <= LAST_TRACK && trackIndex(p.slot, q) === idx) out.push(i);
  }
  return out;
};

/** Does some colour other than `except` hold a blockade (2+ seeds) on this track square? */
function blockadeAt(s: GameState, idx: number, except: Player): boolean {
  return s.players.some((p) => p !== except && onSquare(p, idx).length >= 2);
}

function movesOfSeed(s: GameState, me: Player, seed: number, roll: number): Move | null {
  const from = me.seeds[seed] as number;
  if (from === HOME) return null;
  let to: number;
  let release = false;
  if (from === YARD) {
    if (roll !== MAX_ROLL) return null;
    to = 0;
    release = true;
  } else {
    to = from + roll;
    if (to > HOME) {
      if (s.rules.exactHome) return null;
      to = HOME;
    }
  }
  if (s.rules.stacks === 'block') {
    for (let q = Math.max(0, from + 1); q <= Math.min(to, LAST_TRACK); q++) {
      if (blockadeAt(s, trackIndex(me.slot, q), me)) return null;
    }
  }
  const captures: Capture[] = [];
  if (to <= LAST_TRACK) {
    const idx = trackIndex(me.slot, to);
    if (!isSafeSquare(idx)) {
      for (const p of s.players) {
        if (p === me) continue;
        const here = onSquare(p, idx);
        // a stack is protected unless stacks are off
        if (here.length === 0 || (here.length >= 2 && s.rules.stacks !== 'off')) continue;
        for (const i of here) {
          captures.push({ playerId: p.id, seed: i, from: p.seeds[i] as number, square: idx });
        }
      }
    }
  }
  return { seed, from, to, release, captures, home: to === HOME };
}

/** Every legal move for the current player and the die waiting to be used (empty outside the move phase). */
export function legalMoves(s: GameState): Move[] {
  if (s.phase !== 'move' || s.roll === null) return [];
  return movesFor(s, currentPlayer(s), s.roll);
}

/** The moves a player would have with `roll` (used by the rolling step to detect "stuck"). */
export function movesFor(s: GameState, me: Player, roll: number): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < me.seeds.length; i++) {
    const m = movesOfSeed(s, me, i, roll);
    if (m) out.push(m);
  }
  return out;
}

export function legalActions(s: GameState): Action[] {
  if (s.phase === 'roll') return [{ type: 'roll' }];
  if (s.phase === 'move') return legalMoves(s).map((m) => ({ type: 'move', seed: m.seed }));
  return [];
}

const illegal = (s: GameState, a: Action): never => {
  throw new Error(`illegal action "${a.type}" in phase "${s.phase}"`);
};

/** The reducer. Returns a new state; never mutates its input. Throws on an illegal action. */
export function apply(s: GameState, a: Action): GameState {
  if (s.winner) return illegal(s, a);
  if (a.type === 'roll') return roll(s, a);
  if (s.phase !== 'move' || s.roll === null) return illegal(s, a);
  const move = legalMoves(s).find((m) => m.seed === a.seed);
  if (!move) return illegal(s, a);
  return execute(s, move);
}

/** Close a roll step: same player again, or hand over to the next colour. */
function pass(s: GameState, again: boolean): GameState {
  return {
    ...s,
    phase: 'roll',
    roll: null,
    sixes: again ? s.sixes : 0,
    turns: advanceTurn(s.turns, { again }),
  };
}

function roll(s: GameState, a: Action): GameState {
  if (s.phase !== 'roll') return illegal(s, a);
  const rng = createRng(0);
  rng.setState(s.rng);
  const value = rollDie(rng, MAX_ROLL);
  const me = currentPlayer(s);
  const sixes = value === MAX_ROLL ? s.sixes + 1 : 0;
  const base: GameState = { ...s, rng: rng.getState(), sixes, lastMove: null };
  const rec = (forfeit: boolean, stuck: boolean): RollRecord => ({
    playerId: me.id,
    value,
    sixes,
    forfeit,
    stuck,
  });
  if (s.rules.threeSixes && sixes >= 3) return pass({ ...base, lastRoll: rec(true, false) }, false);
  if (movesFor(base, me, value).length === 0) {
    return pass({ ...base, lastRoll: rec(false, true) }, value === MAX_ROLL);
  }
  return { ...base, phase: 'move', roll: value, lastRoll: rec(false, false) };
}

function execute(s: GameState, m: Move): GameState {
  const me = currentPlayer(s);
  const value = s.roll as number;
  const players = s.players.map((p) => {
    if (p === me) return { ...p, seeds: p.seeds.map((x, i) => (i === m.seed ? m.to : x)) };
    const hit = m.captures.filter((c) => c.playerId === p.id);
    if (!hit.length) return p;
    return { ...p, seeds: p.seeds.map((x, i) => (hit.some((c) => c.seed === i) ? YARD : x)) };
  });
  const mover = players[s.turns.index] as Player;
  const won = homeCount(mover) >= homeTarget(s.rules);
  const again: MoveRecord['again'] =
    value === MAX_ROLL ? 'six' : m.captures.length === 1 && s.rules.captureBonus ? 'capture' : null;
  const lastMove: MoveRecord = { ...m, playerId: me.id, roll: value, again, won };
  const next: GameState = { ...s, players, lastMove };
  if (won) return { ...next, phase: 'over', roll: null, winner: me.id };
  return pass(next, again !== null);
}

/** Serialization: the state is plain JSON, so this is the identity through JSON. */
export const serialize = (s: GameState): string => JSON.stringify(s);

export function deserialize(raw: string): GameState {
  const s = JSON.parse(raw) as GameState;
  if (s?.version !== 1 || !Array.isArray(s.players) || !s.turns || !s.rules) {
    throw new Error('unsupported game state');
  }
  return s;
}
