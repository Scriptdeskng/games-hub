import {
  DARK,
  LIGHT,
  countPieces,
  initialBoard,
  isKing,
  other,
  positionKey,
  sideOf,
  type Side,
} from './board';
import { KING_ONLY_PLY_LIMIT, MAX_PLIES, REPETITION_LIMIT, makeRules, type Rules } from './config';
import { applyToCells, generateMoves, type Move } from './movegen';

export type EndReason = 'noPieces' | 'blocked' | 'repetition' | 'kingMoves' | 'cap';

/** `winner` null is a draw. */
export interface GameResult {
  winner: Side | null;
  reason: EndReason;
}

/** What happened on the last ply, for the view (sounds, animation, banter, move list). */
export interface MoveRecord {
  side: Side;
  from: number;
  to: number;
  path: number[];
  caps: number[];
  /** the moved piece was a king before the move */
  king: boolean;
  /** a man was crowned by this move */
  crowned: boolean;
}

/**
 * The whole game as plain, serialisable data (it is posted to the AI worker as it is).
 * Light is the human seat, dark the CPU. `history` counts positions since the last irreversible
 * move (a man move or a capture), for the threefold-repetition draw.
 */
export interface GameState {
  rules: Rules;
  /** the seed this game was created with (the AI derives its per-move seeds from it) */
  seed: number;
  board: number[];
  turn: Side;
  plies: number;
  /** consecutive plies in which only a king moved and nothing was captured */
  kingMoves: number;
  history: Record<string, number>;
  /** pieces taken BY each side: [light, dark] */
  captured: [number, number];
  /** men crowned by each side */
  crowned: [number, number];
  lastMove: MoveRecord | null;
  result: GameResult | null;
}

export function createGame(o: { seed: number; rules?: Rules }): GameState {
  const rules = o.rules ?? makeRules(10);
  const board = initialBoard(rules.size);
  const turn: Side = rules.cpuStarts ? DARK : LIGHT;
  return {
    rules,
    seed: o.seed >>> 0,
    board,
    turn,
    plies: 0,
    kingMoves: 0,
    history: { [positionKey(board, turn)]: 1 },
    captured: [0, 0],
    crowned: [0, 0],
    lastMove: null,
    result: null,
  };
}

/** A game from a diagram (tests, puzzles). The result is evaluated at once (no moves = a loss). */
export function createFromBoard(o: {
  board: number[];
  turn: Side;
  rules: Rules;
  seed?: number;
}): GameState {
  const s: GameState = {
    rules: o.rules,
    seed: (o.seed ?? 1) >>> 0,
    board: o.board.slice(),
    turn: o.turn,
    plies: 0,
    kingMoves: 0,
    history: { [positionKey(o.board, o.turn)]: 1 },
    captured: [0, 0],
    crowned: [0, 0],
    lastMove: null,
    result: null,
  };
  s.result = noMovesResult(s);
  return s;
}

export const isOver = (s: GameState): boolean => s.result !== null;

/** Legal moves of the side to move (empty when the game is over). */
export const legalMoves = (s: GameState): Move[] =>
  s.result ? [] : generateMoves(s.board, s.turn, s.rules);

const sameMove = (a: Move, b: Pick<Move, 'from' | 'to' | 'caps'>): boolean =>
  a.from === b.from &&
  a.to === b.to &&
  a.caps.length === b.caps.length &&
  a.caps.every((c) => b.caps.includes(c));

/** The legal move equal to `m` (same start, end and captured set), or null. */
export const findMove = (s: GameState, m: Pick<Move, 'from' | 'to' | 'caps'>): Move | null =>
  legalMoves(s).find((x) => sameMove(x, m)) ?? null;

export const isLegal = (s: GameState, m: Pick<Move, 'from' | 'to' | 'caps'>): boolean =>
  findMove(s, m) !== null;

/** Does the side to move have to capture this turn? */
export const mustCaptureNow = (s: GameState): boolean => {
  const first = legalMoves(s)[0];
  return !!first && first.caps.length > 0;
};

function noMovesResult(s: GameState): GameResult | null {
  if (generateMoves(s.board, s.turn, s.rules).length > 0) return null;
  const { men, kings } = countPieces(s.board);
  const left = (men[s.turn] as number) + (kings[s.turn] as number);
  return { winner: other(s.turn), reason: left === 0 ? 'noPieces' : 'blocked' };
}

/**
 * Play a legal move. Throws on an illegal one (the view and the AI only ever send legal moves).
 * Immutable: returns a new state. The end of the game is decided here: the side to move with no
 * legal move loses; threefold repetition, the king-only rule and the safety cap are draws.
 */
export function applyMove(s: GameState, m: Pick<Move, 'from' | 'to' | 'caps'>): GameState {
  if (s.result) throw new Error('the game is over');
  const legal = findMove(s, m);
  if (!legal) throw new Error(`illegal move ${m.from}->${m.to}`);
  const n = s.rules.size;
  const board = s.board.slice();
  const piece = board[legal.from] as number;
  const side = sideOf(piece);
  const king = isKing(piece);
  const crowned = applyToCells(board, legal, n);
  const capturing = legal.caps.length > 0;
  const irreversible = !king || capturing;
  const turn = other(s.turn);
  const next: GameState = {
    ...s,
    board,
    turn,
    plies: s.plies + 1,
    kingMoves: irreversible ? 0 : s.kingMoves + 1,
    captured: capturing
      ? (s.captured.map((c, i) => (i === side ? c + legal.caps.length : c)) as [number, number])
      : s.captured,
    crowned: crowned
      ? (s.crowned.map((c, i) => (i === side ? c + 1 : c)) as [number, number])
      : s.crowned,
    lastMove: {
      side,
      from: legal.from,
      to: legal.to,
      path: legal.path.slice(),
      caps: legal.caps.slice(),
      king,
      crowned,
    },
    history: irreversible ? {} : { ...s.history },
    result: null,
  };
  const key = positionKey(board, turn);
  next.history[key] = (next.history[key] ?? 0) + 1;
  next.result = noMovesResult(next);
  if (!next.result) {
    if (next.history[key] >= REPETITION_LIMIT) next.result = { winner: null, reason: 'repetition' };
    else if (next.kingMoves >= KING_ONLY_PLY_LIMIT)
      next.result = { winner: null, reason: 'kingMoves' };
    else if (next.plies >= MAX_PLIES) next.result = { winner: null, reason: 'cap' };
  }
  return next;
}

/** How many men and kings each side has: handy for HUDs and the evaluation of results. */
export const pieceCounts = (s: GameState): { light: number; dark: number } => {
  const { men, kings } = countPieces(s.board);
  return { light: men[0] + kings[0], dark: men[1] + kings[1] };
};
