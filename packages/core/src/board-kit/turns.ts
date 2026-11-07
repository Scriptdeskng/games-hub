/**
 * Turn manager for ONE human seat and 1..N CPU seats. The types make a second human seat
 * unrepresentable: `human` is a single object, `cpus` are CPU seats only. There is no
 * pass-and-play, no hide-hand screen and no human player count.
 *
 * State is plain JSON and every function returns a new state, so it can live inside a game state.
 */
export type SeatKind = 'human' | 'cpu';

export interface HumanSeatConfig {
  id: string;
  name: string;
}

export interface CpuSeatConfig {
  id: string;
  name: string;
  /** persona id (see ai-kit); optional so non-persona CPUs still work */
  persona?: string;
}

export interface TurnSetup {
  human: HumanSeatConfig;
  /** at least one CPU opponent */
  cpus: readonly [CpuSeatConfig, ...CpuSeatConfig[]];
  /** who starts: the human (default) or the first CPU */
  firstSeat?: 'human' | 'cpu';
}

export interface Seat {
  id: string;
  name: string;
  kind: SeatKind;
  persona?: string;
}

export interface TurnState {
  seats: Seat[];
  /** index of the seat whose turn it is */
  index: number;
  /** how many whole turns each seat has completed (parallel to `seats`) */
  taken: number[];
  /** completed turns overall */
  turn: number;
}

export function createTurns(setup: TurnSetup): TurnState {
  const seats: Seat[] = [
    { id: setup.human.id, name: setup.human.name, kind: 'human' },
    ...setup.cpus.map((c): Seat => ({ id: c.id, name: c.name, kind: 'cpu', persona: c.persona })),
  ];
  const ids = new Set(seats.map((s) => s.id));
  if (ids.size !== seats.length) throw new Error('seat ids must be unique');
  return {
    seats,
    index: setup.firstSeat === 'cpu' ? 1 : 0,
    taken: seats.map(() => 0),
    turn: 0,
  };
}

export const currentSeat = (s: TurnState): Seat => s.seats[s.index] as Seat;

export const isHumanTurn = (s: TurnState): boolean => currentSeat(s).kind === 'human';

export const humanSeat = (s: TurnState): Seat => s.seats[0] as Seat;

export const seatIndex = (s: TurnState, id: string): number =>
  s.seats.findIndex((x) => x.id === id);

/** Turns the given seat has completed so far. */
export const turnsTaken = (s: TurnState, id: string): number => s.taken[seatIndex(s, id)] ?? 0;

export interface AdvanceOptions {
  /** the current seat plays again (extra turn) */
  again?: boolean;
  /** seat ids that are skipped (e.g. finished or suspended) */
  skip?: ReadonlySet<string>;
}

/** Complete the current seat's turn and hand over to the next one. */
export function advanceTurn(s: TurnState, o: AdvanceOptions = {}): TurnState {
  const taken = s.taken.slice();
  taken[s.index] = (taken[s.index] ?? 0) + 1;
  let index = s.index;
  if (!o.again) {
    for (let i = 0; i < s.seats.length; i++) {
      index = (index + 1) % s.seats.length;
      if (!o.skip?.has((s.seats[index] as Seat).id)) break;
    }
  }
  return { seats: s.seats, index, taken, turn: s.turn + 1 };
}

/** Is the current seat on its n-th, 2n-th, ... own turn (1-based)? Used for "every 5th turn" rules. */
export const isEveryNth = (s: TurnState, n: number): boolean =>
  n > 0 && ((s.taken[s.index] ?? 0) + 1) % n === 0;

/** Own turns left (counting the current one) until the next every-nth turn; 0 if n <= 0. */
export function turnsUntilNth(s: TurnState, n: number): number {
  if (n <= 0) return 0;
  const done = s.taken[s.index] ?? 0;
  return n - (done % n);
}
