import { createRng } from '@naija/core/rng';
import {
  advanceTurn,
  createTurns,
  currentSeat,
  isEveryNth,
  turnsTaken,
  turnsUntilNth,
  type Seat,
  type TurnState,
} from '@naija/core/board-kit';
import { rollChoice, rollDie, takeChoice } from '@naija/core/board-kit';
import { DEFAULT_RULES, MAX_CPUS, MAX_ROLL, SQUARES, type BoardLayout, type Rules } from './config';
import { resolveLanding } from './board';
import { DEFAULT_LAYOUT, jumpMap } from './layout';

export interface Player {
  id: string;
  /** square 0..100 (0 = not on the board yet) */
  pos: number;
  /** the once-per-game re-roll is still unspent */
  rerollLeft: boolean;
}

export type Phase = 'roll' | 'pick' | 'decide' | 'over';

/** What a turn did. The view animates from this; nothing else is needed to replay it. */
export interface MoveRecord {
  playerId: string;
  /** this player's own turn number, from 1 */
  turn: number;
  from: number;
  /** the die value that was used */
  roll: number;
  /** re-roll: the value that was thrown away */
  rolledFrom: number | null;
  /** pick-one-of-two turn: both dice and the kept index */
  picked: { options: [number, number]; index: 0 | 1 } | null;
  landed: number;
  to: number;
  via: 'ladder' | 'snake' | null;
  jumpId: string | null;
  overshoot: boolean;
  won: boolean;
}

export interface GameState {
  version: 1;
  seed: number;
  /** dice rng state (mulberry32) */
  rng: number;
  rules: Rules;
  layout: BoardLayout;
  /** same order as `turns.seats`: the human first, then the CPUs */
  players: Player[];
  turns: TurnState;
  phase: Phase;
  /** pick phase: the two dice just rolled */
  dice: [number, number] | null;
  /** pick phase result kept for the move record */
  picked: { options: [number, number]; index: 0 | 1 } | null;
  /** decide phase: the die value waiting for accept or re-roll */
  roll: number | null;
  lastMove: MoveRecord | null;
  winner: string | null;
}

export type Action =
  { type: 'roll' } | { type: 'pick'; index: 0 | 1 } | { type: 'accept' } | { type: 'reroll' };

export interface SeatSetup {
  id: string;
  name: string;
  persona?: string;
}

export interface NewGame {
  seed: number;
  human: { id: string; name: string };
  /** 1 to 3 CPU opponents */
  cpus: readonly SeatSetup[];
  rules?: Partial<Rules>;
  layout?: BoardLayout;
  firstSeat?: 'human' | 'cpu';
}

export function createGame(o: NewGame): GameState {
  if (o.cpus.length < 1 || o.cpus.length > MAX_CPUS) {
    throw new RangeError(`a game needs 1 to ${MAX_CPUS} CPU opponents`);
  }
  const turns = createTurns({
    human: o.human,
    cpus: o.cpus as [SeatSetup, ...SeatSetup[]],
    firstSeat: o.firstSeat,
  });
  const rules = { ...DEFAULT_RULES, ...o.rules };
  return {
    version: 1,
    seed: o.seed >>> 0,
    rng: createRng(o.seed >>> 0).getState(),
    rules,
    layout: o.layout ?? DEFAULT_LAYOUT,
    players: turns.seats.map((s) => ({ id: s.id, pos: 0, rerollLeft: rules.reroll })),
    turns,
    phase: 'roll',
    dice: null,
    picked: null,
    roll: null,
    lastMove: null,
    winner: null,
  };
}

export const currentPlayer = (s: GameState): Player => s.players[s.turns.index] as Player;
export const currentSeatOf = (s: GameState): Seat => currentSeat(s.turns);
export const playerById = (s: GameState, id: string): Player =>
  s.players.find((p) => p.id === id) as Player;
export const seatById = (s: GameState, id: string): Seat =>
  s.turns.seats.find((x) => x.id === id) as Seat;

/** Is the current player's next roll a pick-one-of-two turn? */
export const isChoiceTurn = (s: GameState): boolean =>
  s.rules.choiceDice && isEveryNth(s.turns, s.rules.choiceEvery);

/** Own turns until the next two-dice turn (1 = this turn); 0 when the rule is off. */
export const turnsUntilChoice = (s: GameState): number =>
  s.rules.choiceDice ? turnsUntilNth(s.turns, s.rules.choiceEvery) : 0;

export const canReroll = (s: GameState): boolean =>
  s.rules.reroll && s.phase === 'decide' && currentPlayer(s).rerollLeft;

export const turnsOf = (s: GameState, id: string): number => {
  const m = s.lastMove;
  return m && m.playerId === id && s.winner === id ? m.turn : turnsTaken(s.turns, id);
};

export function legalActions(s: GameState): Action[] {
  switch (s.phase) {
    case 'roll':
      return [{ type: 'roll' }];
    case 'pick':
      return [
        { type: 'pick', index: 0 },
        { type: 'pick', index: 1 },
      ];
    case 'decide':
      return canReroll(s) ? [{ type: 'accept' }, { type: 'reroll' }] : [{ type: 'accept' }];
    default:
      return [];
  }
}

const illegal = (s: GameState, a: Action): never => {
  throw new Error(`illegal action "${a.type}" in phase "${s.phase}"`);
};

/** The reducer. Returns a new state; never mutates its input. Throws on an illegal action. */
export function apply(s: GameState, a: Action): GameState {
  if (s.winner) return illegal(s, a);
  const rng = createRng(0);
  rng.setState(s.rng);
  switch (a.type) {
    case 'roll': {
      if (s.phase !== 'roll') return illegal(s, a);
      if (isChoiceTurn(s)) {
        const { options } = rollChoice(rng, MAX_ROLL);
        return { ...s, rng: rng.getState(), phase: 'pick', dice: [options[0], options[1]] };
      }
      const value = rollDie(rng, MAX_ROLL);
      return afterValue({ ...s, rng: rng.getState() }, value);
    }
    case 'pick': {
      if (s.phase !== 'pick' || !s.dice) return illegal(s, a);
      const options = s.dice;
      const value = takeChoice({ options }, a.index);
      return afterValue({ ...s, dice: null, picked: { options, index: a.index } }, value);
    }
    case 'accept': {
      if (s.phase !== 'decide' || s.roll === null) return illegal(s, a);
      return execute(s, s.roll, null);
    }
    case 'reroll': {
      if (!canReroll(s) || s.roll === null) return illegal(s, a);
      const thrown = s.roll;
      const players = s.players.map((p, i) =>
        i === s.turns.index ? { ...p, rerollLeft: false } : p,
      );
      const next = rollDie(rng, MAX_ROLL);
      return execute({ ...s, players, rng: rng.getState() }, next, thrown);
    }
  }
}

/** A die value is settled: offer the re-roll if the player still has it, otherwise move. */
function afterValue(s: GameState, value: number): GameState {
  if (s.rules.reroll && currentPlayer(s).rerollLeft) return { ...s, phase: 'decide', roll: value };
  return execute(s, value, null);
}

function execute(s: GameState, value: number, rolledFrom: number | null): GameState {
  const me = currentPlayer(s);
  const land = resolveLanding(s.layout, s.rules, me.pos, value, jumpMap(s.layout));
  const move: MoveRecord = {
    playerId: me.id,
    turn: (s.turns.taken[s.turns.index] ?? 0) + 1,
    from: me.pos,
    roll: value,
    rolledFrom,
    picked: s.picked,
    landed: land.landed,
    to: land.to,
    via: land.via,
    jumpId: land.jumpId,
    overshoot: land.overshoot,
    won: land.won,
  };
  const players = s.players.map((p, i) => (i === s.turns.index ? { ...p, pos: land.to } : p));
  const done = { ...s, players, dice: null, picked: null, roll: null, lastMove: move };
  if (land.won) return { ...done, phase: 'over', winner: me.id };
  return { ...done, phase: 'roll', turns: advanceTurn(s.turns) };
}

export const isOver = (s: GameState): boolean => s.winner !== null;

/** Serialization: the state is plain JSON, so this is the identity through JSON. */
export const serialize = (s: GameState): string => JSON.stringify(s);

export function deserialize(raw: string): GameState {
  const s = JSON.parse(raw) as GameState;
  if (s?.version !== 1 || !Array.isArray(s.players) || s.layout.size * s.layout.size !== SQUARES) {
    throw new Error('unsupported game state');
  }
  return s;
}
