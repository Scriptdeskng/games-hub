import {
  advanceTurn,
  createTurns,
  currentSeat,
  turnsTaken,
  type TurnState,
} from '@naija/core/board-kit';
import { createRng, type Rng } from '@naija/core/rng';
import { DECK, cardOf, handValue, isSpecial, type Shape, type ShapeName } from './cards';
import {
  CATCH_PENALTY,
  CPU_COUNTS,
  DEFAULT_RULES,
  HAND_SIZE,
  MAX_TURNS,
  type Rules,
} from './config';
import {
  announceLevel,
  calledShape,
  canAnnounceWith,
  canDraw,
  canPlayCard,
  isExposed,
  isShapeName,
  playableCards,
  type Action,
  type CallLevel,
  type Pending,
} from './legal';

export type Phase = 'play' | 'over';
export type EndReason = 'empty' | 'market' | 'cap';
export type DrawReason = 'market' | 'pick' | 'general' | 'caught';
export type EffectKind =
  'hold' | 'pickTwo' | 'pickThree' | 'suspend' | 'market' | 'whot' | 'defend';

/** What one action did: the view plays these in order. */
export type GameEvent =
  | { type: 'play'; seat: number; card: number; call: ShapeName | null }
  | { type: 'effect'; kind: EffectKind; seat: number; victim: number | null }
  | { type: 'draw'; seat: number; cards: number[]; reason: DrawReason }
  | { type: 'reshuffle' }
  | { type: 'announce'; seat: number; level: CallLevel }
  | { type: 'catch'; by: number; target: number }
  | { type: 'end'; reason: EndReason; winner: number };

/** Public history, newest last (the AI reads it; it never contains anybody's hand). */
export type LogEntry =
  | { t: 'play'; seat: number; card: number }
  | { t: 'draw'; seat: number; n: number; voluntary: boolean; need: Shape | null; needN: number };

const LOG_KEEP = 40;

export interface GameState {
  version: 1;
  seed: number;
  /** shuffle rng state (mulberry32) */
  rng: number;
  rules: Rules;
  /** seats: the human first, then the CPUs clockwise */
  turns: TurnState;
  /** card ids per seat */
  hands: number[][];
  /** the market: the next card is the last element */
  draw: number[];
  /** the face-up pile, top card last */
  discard: number[];
  called: ShapeName | null;
  pending: Pending | null;
  /** the announcement each seat has made (reset when its hand grows) */
  calls: CallLevel[];
  phase: Phase;
  winner: string | null;
  endedBy: EndReason | null;
  /** count-up totals per seat when the game ended without an empty hand */
  totals: number[] | null;
  log: LogEntry[];
  /** the events of the last action */
  last: GameEvent[];
}

export interface SeatSetup {
  id: string;
  name: string;
  persona?: string;
}

export interface NewGame {
  seed: number;
  human: { id: string; name: string };
  /** 1, 2 or 3 CPUs */
  cpus: readonly SeatSetup[];
  rules?: Partial<Rules>;
  /** seat index that starts (default 0, the human) */
  first?: number;
}

export function createGame(o: NewGame): GameState {
  if (!CPU_COUNTS.includes(o.cpus.length)) {
    throw new RangeError('a game needs 1, 2 or 3 CPU opponents');
  }
  const turns = createTurns({
    human: o.human,
    cpus: o.cpus as [SeatSetup, ...SeatSetup[]],
  });
  const seats = turns.seats.length;
  const rng = createRng(o.seed);
  const deck = rng.shuffle(DECK.map((c) => c.id));
  const hands: number[][] = turns.seats.map(() => []);
  for (let r = 0; r < HAND_SIZE; r++)
    for (let s = 0; s < seats; s++) hands[s]?.push(deck.pop() as number);
  // the starter is a plain number card: no power to resolve before the first move
  let at = deck.length - 1;
  while (at > 0 && isSpecial(deck[at] as number)) at--;
  const [starter] = deck.splice(at, 1) as [number];
  return {
    version: 1,
    seed: o.seed,
    rng: rng.getState(),
    rules: { ...DEFAULT_RULES, ...o.rules },
    turns: { ...turns, index: Math.max(0, Math.min(seats - 1, o.first ?? 0)) },
    hands,
    draw: deck,
    discard: [starter],
    called: null,
    pending: null,
    calls: hands.map(() => 'none'),
    phase: 'play',
    winner: null,
    endedBy: null,
    totals: null,
    log: [],
    last: [],
  };
}

// ---- queries ----

export const isOver = (s: GameState): boolean => s.phase === 'over';
export const currentSeatOf = (s: GameState): TurnState['seats'][number] => currentSeat(s.turns);
export const seatIndexOf = (s: GameState, id: string): number =>
  s.turns.seats.findIndex((x) => x.id === id);
export const turnsOf = (s: GameState, id: string): number => turnsTaken(s.turns, id);
export const topCard = (s: GameState): number => s.discard[s.discard.length - 1] as number;
export const handOf = (s: GameState, id: string): number[] => s.hands[seatIndexOf(s, id)] ?? [];

export const legalPlays = (s: GameState): number[] =>
  s.phase === 'play' ? playableCards(s, s.hands[s.turns.index] as number[]) : [];
export const mustDraw = (s: GameState): boolean =>
  s.phase === 'play' &&
  canDraw(s, s.hands[s.turns.index] as number[]) &&
  legalPlays(s).length === 0;
export const exposedSeat = (s: GameState, seat: number): boolean =>
  s.phase === 'play' &&
  isExposed(s.rules, (s.hands[seat] as number[]).length, s.calls[seat] as CallLevel);
export const canAnnounce = (s: GameState, seat: number): boolean =>
  s.phase === 'play' &&
  canAnnounceWith(s.rules, (s.hands[seat] as number[]).length, s.calls[seat] as CallLevel);
export const canCatch = (s: GameState, by: number, target: number): boolean =>
  by !== target && by >= 0 && by < s.hands.length && exposedSeat(s, target);

// ---- mutation helpers (work on a private draft; `apply` returns it as the new state) ----

type Draft = GameState & { events: GameEvent[] };

function draftOf(s: GameState): Draft {
  return {
    ...s,
    hands: s.hands.map((h) => h.slice()),
    draw: s.draw.slice(),
    discard: s.discard.slice(),
    calls: s.calls.slice(),
    log: s.log.slice(-LOG_KEEP),
    events: [],
  };
}

function seal(d: Draft): GameState {
  const { events, ...rest } = d;
  return { ...rest, last: events };
}

const withRng = <T>(d: Draft, fn: (r: Rng) => T): T => {
  const r = createRng(0);
  r.setState(d.rng);
  const v = fn(r);
  d.rng = r.getState();
  return v;
};

/** Count-up end (market ran out, or a very long game): the lowest hand wins. */
function endByCount(d: Draft, reason: EndReason): void {
  const totals = d.hands.map(handValue);
  let best = 0;
  for (let i = 1; i < totals.length; i++) {
    const a = totals[i] as number;
    const b = totals[best] as number;
    const fewer = (d.hands[i] as number[]).length < (d.hands[best] as number[]).length;
    if (a < b || (a === b && fewer)) best = i;
  }
  d.totals = totals;
  finish(d, best, reason);
}

function finish(d: Draft, winner: number, reason: EndReason): void {
  d.phase = 'over';
  d.endedBy = reason;
  d.winner = (d.turns.seats[winner] as { id: string }).id;
  d.pending = null;
  d.events.push({ type: 'end', reason, winner });
}

/** Turn the discard pile (but its top card) into a new market. False if there is nothing to shuffle. */
function reshuffle(d: Draft): boolean {
  if (d.discard.length < 2) return false;
  const top = d.discard.pop() as number;
  const pile = d.discard;
  d.draw = withRng(d, (r) => r.shuffle(pile));
  d.discard = [top];
  d.events.push({ type: 'reshuffle' });
  return true;
}

/** Give `seat` up to `n` cards. Returns false when the count-up variant ended the game instead. */
function take(d: Draft, seat: number, n: number, reason: DrawReason, voluntary = false): boolean {
  const got: number[] = [];
  const top = cardOf(d.discard[d.discard.length - 1] as number);
  const need: Shape | null = top.shape === 'whot' ? d.called : top.shape;
  const needN = top.n;
  let alive = true;
  for (let i = 0; i < n; i++) {
    if (d.draw.length === 0) {
      if (d.rules.marketEnds) {
        alive = false;
        break;
      }
      if (!reshuffle(d)) break;
    }
    got.push(d.draw.pop() as number);
  }
  if (got.length) {
    (d.hands[seat] as number[]).push(...got);
    d.calls[seat] = 'none';
    d.events.push({ type: 'draw', seat, cards: got, reason });
    d.log.push({ t: 'draw', seat, n: got.length, voluntary, need, needN });
  }
  if (!alive) endByCount(d, 'market');
  return alive;
}

function setAnnounce(d: Draft, seat: number): void {
  const len = (d.hands[seat] as number[]).length;
  if (!canAnnounceWith(d.rules, len, d.calls[seat] as CallLevel)) return;
  const level = announceLevel(d.rules, len);
  d.calls[seat] = level;
  d.events.push({ type: 'announce', seat, level });
}

// ---- the three turn actions ----

function doPlay(d: Draft, a: Extract<Action, { type: 'play' }>): void {
  const seat = d.turns.index;
  const hand = d.hands[seat] as number[];
  if (!canPlayCard(d, hand, a.card)) throw new RangeError(`illegal play: card ${a.card}`);
  const card = cardOf(a.card);
  if (card.shape === 'whot' && !isShapeName(a.call)) {
    throw new RangeError('a Whot 20 must name a shape');
  }
  const wasPending = d.pending;
  hand.splice(hand.indexOf(a.card), 1);
  d.discard.push(a.card);
  d.called = calledShape(card.shape, a.call);
  d.log.push({ t: 'play', seat, card: a.card });
  d.events.push({ type: 'play', seat, card: a.card, call: d.called });
  if (a.announce) setAnnounce(d, seat);

  if (hand.length === 0) {
    finish(d, seat, 'empty');
    return;
  }

  const seats = d.turns.seats.length;
  const next = (seat + 1) % seats;
  let again = false;
  let skip: Set<string> | undefined;
  if (card.shape === 'whot') {
    d.pending = null;
    d.events.push({ type: 'effect', kind: 'whot', seat, victim: null });
    if (wasPending) d.events.push({ type: 'effect', kind: 'defend', seat, victim: null });
  } else if (card.n === 2 || card.n === 5) {
    const kind = card.n === 2 ? 'two' : 'three';
    const add = card.n === 2 ? 2 : 3;
    d.pending = { kind, count: (wasPending?.count ?? 0) + add };
    d.events.push({
      type: 'effect',
      kind: wasPending ? 'defend' : kind === 'two' ? 'pickTwo' : 'pickThree',
      seat,
      victim: next,
    });
  } else if (card.n === 1) {
    again = true;
    d.events.push({ type: 'effect', kind: 'hold', seat, victim: null });
  } else if (card.n === 8) {
    skip = new Set([(d.turns.seats[next] as { id: string }).id]);
    d.events.push({ type: 'effect', kind: 'suspend', seat, victim: next });
  } else if (card.n === 14) {
    d.events.push({ type: 'effect', kind: 'market', seat, victim: null });
    for (let k = 1; k < seats; k++) {
      if (!take(d, (seat + k) % seats, 1, 'general')) return;
    }
    again = d.rules.marketAgain;
  }
  d.turns = advanceTurn(d.turns, { again, skip });
}

function doDraw(d: Draft): void {
  const seat = d.turns.index;
  const hand = d.hands[seat] as number[];
  if (!canDraw(d, hand)) throw new RangeError('illegal draw: a card can be played');
  const forced = d.pending;
  d.pending = null;
  const ok = take(d, seat, forced ? forced.count : 1, forced ? 'pick' : 'market', !forced);
  if (ok) d.turns = advanceTurn(d.turns);
}

function doCatch(d: Draft, by: number, target: number): void {
  if (by === target || by < 0 || by >= d.hands.length) throw new RangeError('illegal catch');
  const hand = d.hands[target] as number[] | undefined;
  if (!hand || !isExposed(d.rules, hand.length, d.calls[target] as CallLevel)) {
    throw new RangeError('illegal catch: nothing to catch');
  }
  d.events.push({ type: 'catch', by, target });
  take(d, target, CATCH_PENALTY, 'caught');
}

/** Apply one action of the current seat. Throws RangeError for an illegal one. */
export function apply(s: GameState, a: Action): GameState {
  if (s.phase !== 'play') throw new RangeError('the game is over');
  const d = draftOf(s);
  if (a.type === 'play') doPlay(d, a);
  else if (a.type === 'draw') doDraw(d);
  else doCatch(d, d.turns.index, a.target);
  if (d.phase === 'play' && d.turns.turn >= MAX_TURNS) endByCount(d, 'cap');
  return seal(d);
}

/** The player presses "Last card" (any time, even out of turn). Returns the same state if not allowed. */
export function announce(s: GameState, seat: number): GameState {
  if (!canAnnounce(s, seat)) return s;
  const d = draftOf(s);
  setAnnounce(d, seat);
  return seal(d);
}

/** Catch an exposed player from any seat, any time (the human taps a CPU). Same state if not allowed. */
export function catchPlayer(s: GameState, by: number, target: number): GameState {
  if (!canCatch(s, by, target)) return s;
  const d = draftOf(s);
  doCatch(d, by, target);
  return seal(d);
}
