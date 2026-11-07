import { advanceTurn, createTurns, type Seat, type TurnState } from '@naija/core/board-kit';
import { createRng } from '@naija/core/rng';
import { capture, isCapped, ownerOf, reachesOpponent, sideSeeds, sow } from './board';
import { DEFAULT_RULES, PITS, SEEDS_PER_PIT, SIDE, WIN_SCORE, type Rules } from './config';

/** Seats: 0 is the human (pits 0..5), 1 is the CPU (pits 6..11). */
export type Side = 0 | 1;

export interface CapturedPit {
  pit: number;
  count: number;
}

/** What one move did, in the order the view plays it. */
export interface MoveRecord {
  playerId: string;
  side: Side;
  /** pit the seeds were lifted from */
  pit: number;
  /** seeds lifted (and sown) */
  count: number;
  /** every pit a seed landed in, in order (length === count) */
  path: number[];
  /** the sow passed the origin pit and skipped it */
  skipped: boolean;
  /** the pit of the last seed */
  last: number;
  /** pits captured, the pit of the last seed first, then the chain backwards */
  captures: CapturedPit[];
  /** seeds taken by the captures */
  gained: number;
  /** at least one seed reached the opponent's side */
  fed: boolean;
}

export type EndReason = 'score' | 'stuck' | 'empty' | 'cap';

export interface GameEnd {
  reason: EndReason;
  /** seeds each seat takes from the board at the end ([human, cpu]); zero for a win by score */
  swept: [number, number];
}

export interface GameState {
  seed: number;
  rules: Rules;
  /** seeds in each pit 0..11 */
  pits: number[];
  /** seeds each seat has captured (plus, at the end, what was swept to them) */
  store: [number, number];
  turns: TurnState;
  /** moves played so far (both players) */
  plies: number;
  /** null while playing; set when the game is over */
  end: GameEnd | null;
  /** winning seat id, null while playing and on a draw */
  winner: string | null;
  draw: boolean;
  lastMove: MoveRecord | null;
}

/** An action is a move: the pit to sow from. */
export type Action = { type: 'move'; pit: number };

export interface Move {
  pit: number;
  count: number;
}

export interface NewGame {
  seed: number;
  human: { id: string; name: string };
  cpu: { id: string; name: string; persona?: string };
  rules?: Partial<Rules>;
  /** who moves first; default: decided by the seed */
  first?: Side;
}

export function createGame(o: NewGame): GameState {
  const first: Side = o.first ?? (createRng(o.seed ^ 0xa70).chance(0.5) ? 0 : 1);
  const turns = createTurns({
    human: o.human,
    cpus: [o.cpu],
    firstSeat: first === 0 ? 'human' : 'cpu',
  });
  const s: GameState = {
    seed: o.seed,
    rules: { ...DEFAULT_RULES, ...o.rules },
    pits: Array.from({ length: PITS }, () => SEEDS_PER_PIT),
    store: [0, 0],
    turns,
    plies: 0,
    end: null,
    winner: null,
    draw: false,
    lastMove: null,
  };
  return s;
}

export const currentSide = (s: GameState): Side => s.turns.index as Side;
export const isOver = (s: GameState): boolean => s.end !== null;
export const seatId = (s: GameState, side: Side): string => (s.turns.seats[side] as Seat).id;

/** Seeds each seat holds on its own side right now. */
export const onSide = (s: GameState, side: Side): number => sideSeeds(s.pits, side);

/** Must the player to move give the opponent seeds (the opponent side is empty and the rule is on)? */
export function mustFeedNow(s: GameState): boolean {
  return !isOver(s) && s.rules.mustFeed && onSide(s, (1 - currentSide(s)) as Side) === 0;
}

/** Legal moves of the player to move, in pit order. */
export function legalMoves(s: GameState): Move[] {
  if (isOver(s)) return [];
  return movesOf(s.pits, currentSide(s), s.rules);
}

/** Legal moves of `side` on a raw pit list (shared with the AI search). */
export function movesOf(pits: readonly number[], side: Side, rules: Rules): Move[] {
  const feed = rules.mustFeed && sideSeeds(pits as number[], 1 - side) === 0;
  const out: Move[] = [];
  for (let pit = side * SIDE; pit < side * SIDE + SIDE; pit++) {
    const count = pits[pit] as number;
    if (count > 0 && (!feed || reachesOpponent(pit, count))) out.push({ pit, count });
  }
  return out;
}

export const isLegal = (s: GameState, pit: number): boolean =>
  legalMoves(s).some((m) => m.pit === pit);

/**
 * Pits of `side` that the other player could capture with a move right now (as if it were their
 * turn). Used for the hint's danger markers; it does not change the state.
 */
export function threatenedPits(s: GameState, side: Side): number[] {
  const foe = (1 - side) as Side;
  const hit = new Set<number>();
  for (const m of movesOf(s.pits, foe, s.rules)) {
    const pits = s.pits.slice();
    const { last } = sow(pits, m.pit, s.rules);
    const taken: CapturedPit[] = [];
    capture(pits, last, foe, s.rules, taken);
    for (const c of taken) hit.add(c.pit);
  }
  return [...hit].sort((a, b) => a - b);
}

/** What each seat gets from the seeds left on the board when the game stops. */
export function sweepOf(
  pits: readonly number[],
  stuck: Side | null,
  rules: Rules,
): [number, number] {
  const mine = sideSeeds(pits as number[], 0);
  const theirs = sideSeeds(pits as number[], 1);
  if (stuck !== null && rules.endSeeds === 'starver') {
    // the player who could not move loses what is left on the board to the other player
    return stuck === 0 ? [0, mine + theirs] : [mine + theirs, 0];
  }
  return [mine, theirs];
}

/** Close the game: sweep what is left, decide the winner (a tie is a draw). */
function finish(s: GameState, reason: EndReason): GameState {
  const swept =
    reason === 'score'
      ? ([0, 0] as [number, number])
      : sweepOf(s.pits, reason === 'cap' ? null : currentSide(s), s.rules);
  const store: [number, number] = [s.store[0] + swept[0], s.store[1] + swept[1]];
  const pits = reason === 'score' ? s.pits : s.pits.map(() => 0);
  const winSide: Side | null = store[0] >= WIN_SCORE ? 0 : store[1] >= WIN_SCORE ? 1 : null;
  return {
    ...s,
    pits,
    store,
    end: { reason, swept },
    winner: winSide === null ? null : seatId(s, winSide),
    draw: winSide === null,
  };
}

/**
 * Play a move. Returns a new state. An illegal pit throws (the view only offers legal ones and the
 * AI only picks legal ones; a throw means a bug, not bad input).
 */
export function apply(s: GameState, a: Action): GameState {
  if (isOver(s)) throw new Error('the game is over');
  const side = currentSide(s);
  if (!isLegal(s, a.pit)) throw new Error(`illegal move: pit ${a.pit}`);
  const pits = s.pits.slice();
  const count = pits[a.pit] as number;
  const path: number[] = [];
  const { last, skipped } = sow(pits, a.pit, s.rules, path);
  const captures: CapturedPit[] = [];
  const gained = capture(pits, last, side, s.rules, captures);
  const store: [number, number] = [s.store[0], s.store[1]];
  store[side] += gained;
  const record: MoveRecord = {
    playerId: seatId(s, side),
    side,
    pit: a.pit,
    count,
    path,
    skipped,
    last,
    captures,
    gained,
    fed: path.some((p) => ownerOf(p) !== side),
  };
  let next: GameState = {
    ...s,
    pits,
    store,
    turns: advanceTurn(s.turns),
    plies: s.plies + 1,
    lastMove: record,
  };
  if (store[side] >= WIN_SCORE) return finish(next, 'score');
  if (isCapped(next.plies)) return finish(next, 'cap');
  if (sideSeeds(pits, currentSide(next)) === 0) next = finish(next, 'empty');
  else if (legalMoves(next).length === 0) next = finish(next, 'stuck');
  return next;
}
