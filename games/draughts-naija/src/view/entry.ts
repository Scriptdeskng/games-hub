import type { Move } from '../rules/movegen';

/**
 * How a human enters a move, as a pure model (the view only draws it and feeds it taps).
 *  1. press a piece that can move: it is selected, its destinations light up;
 *  2. press a destination: the move is played;
 *  3. if several different captures END on that square, the paths are told apart by tapping the
 *     numbered stone where they first differ (once or more), then the move is played.
 * With only one piece able to move, it is selected at once.
 */
export interface Entry {
  /** every legal move */
  moves: readonly Move[];
  /** squares of the human's own pieces (to tell "cannot move" from "not mine") */
  own: readonly number[];
  /** the selected piece, or null */
  from: number | null;
  /** the moves still possible after the choices so far */
  cands: readonly Move[];
  /** while telling paths apart: the index in `path` where the candidates differ, else -1 */
  at: number;
}

export type TapResult =
  | { kind: 'select' | 'deselect' | 'step'; entry: Entry }
  | { kind: 'play'; move: Move }
  | { kind: 'illegal'; reason: 'must' | 'blocked' | 'empty'; entry: Entry };

export const movable = (moves: readonly Move[]): number[] => [...new Set(moves.map((m) => m.from))];
const distinct = (xs: number[]): number[] => [...new Set(xs)];

export function startEntry(moves: readonly Move[], own: readonly number[]): Entry {
  const e: Entry = { moves, own, from: null, cands: [], at: -1 };
  const pieces = movable(moves);
  return pieces.length === 1 ? select(e, pieces[0] as number) : e;
}

const select = (e: Entry, sq: number): Entry => ({
  ...e,
  from: sq,
  cands: e.moves.filter((m) => m.from === sq),
  at: -1,
});

/** First path index where the candidates land on different squares. */
const divergence = (cs: readonly Move[], after: number): number => {
  const len = Math.min(...cs.map((m) => m.path.length));
  for (let i = after + 1; i < len; i++) {
    if (new Set(cs.map((m) => m.path[i])).size > 1) return i;
  }
  return -1;
};

/** The squares the player can press next to carry on the move (destinations, or path stones). */
export function targets(e: Entry): number[] {
  if (e.from === null) return [];
  return e.at >= 0
    ? distinct(e.cands.map((m) => m.path[e.at] as number))
    : distinct(e.cands.map((m) => m.to));
}

/** Everything the board can react to right now: movable pieces, the selected piece, next squares. */
export const pressable = (e: Entry): number[] =>
  distinct([...movable(e.moves), ...(e.from === null ? [] : [e.from]), ...targets(e)]);

/** Pieces that the selected piece could take (any candidate), for the "can be taken" marks. */
export const takeable = (e: Entry): number[] =>
  e.from === null ? [] : distinct(e.cands.flatMap((m) => m.caps));

/** If exactly one candidate remains, it is the move the preview shows. */
export const preview = (e: Entry, target: number | null): Move | null => {
  if (e.from === null) return null;
  if (e.at < 0 && target !== null) {
    const m = e.cands.filter((x) => x.to === target);
    return m.length === 1 ? (m[0] as Move) : null;
  }
  return e.cands.length === 1 ? (e.cands[0] as Move) : null;
};

export function tap(e: Entry, sq: number): TapResult {
  const canMove = movable(e.moves).includes(sq);
  if (e.from === null) {
    if (canMove) return { kind: 'select', entry: select(e, sq) };
    const mustTake = (e.moves[0]?.caps.length ?? 0) > 0;
    return {
      kind: 'illegal',
      reason: e.own.includes(sq) ? (mustTake ? 'must' : 'blocked') : 'empty',
      entry: e,
    };
  }
  if (sq === e.from) {
    return { kind: 'deselect', entry: { ...e, from: null, cands: [], at: -1 } };
  }
  if (e.at < 0 && canMove) return { kind: 'select', entry: select(e, sq) };
  const next = e.cands.filter((m) => (e.at >= 0 ? m.path[e.at] === sq : m.to === sq));
  if (next.length === 0) {
    if (canMove) return { kind: 'select', entry: select(e, sq) };
    const mustTake = (e.moves[0]?.caps.length ?? 0) > 0;
    return {
      kind: 'illegal',
      reason: e.own.includes(sq) ? (mustTake ? 'must' : 'blocked') : 'empty',
      entry: e,
    };
  }
  if (next.length === 1) return { kind: 'play', move: next[0] as Move };
  const at = divergence(next, e.at);
  if (at < 0) return { kind: 'play', move: next[0] as Move };
  return { kind: 'step', entry: { ...e, cands: next, at } };
}
