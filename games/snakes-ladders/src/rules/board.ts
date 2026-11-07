import { jumpMap } from './layout';
import { type BoardLayout, type Rules } from './config';

export interface Cell {
  /** 0 = bottom row */
  row: number;
  col: number;
}

/**
 * Boustrophedon numbering: square 1 is bottom-left, the first row runs left to right, the next
 * right to left, and so on up to the last square at the top.
 */
export function squareToCell(square: number, size = 10): Cell {
  const i = square - 1;
  const row = Math.floor(i / size);
  const k = i % size;
  return { row, col: row % 2 === 0 ? k : size - 1 - k };
}

export function cellToSquare(cell: Cell, size = 10): number {
  const k = cell.row % 2 === 0 ? cell.col : size - 1 - cell.col;
  return cell.row * size + k + 1;
}

export interface Landing {
  /** where the die takes the pawn before any ladder or snake (or the start square if it cannot move) */
  landed: number;
  /** final square after a ladder or snake */
  to: number;
  via: 'ladder' | 'snake' | null;
  /** id of the ladder or snake used */
  jumpId: string | null;
  /** exact-finish rule: the roll was too big and the pawn stays */
  overshoot: boolean;
  won: boolean;
}

/** What happens when a pawn on `pos` moves `roll` squares. Pure; used by the engine and the AI. */
export function resolveLanding(
  layout: BoardLayout,
  rules: Pick<Rules, 'exactFinish'>,
  pos: number,
  roll: number,
  jumps: ReadonlyMap<number, { id: string; to: number; kind: 'ladder' | 'snake' }> = jumpMap(
    layout,
  ),
): Landing {
  const last = layout.size * layout.size;
  let landed = pos + roll;
  if (landed > last) {
    if (rules.exactFinish) {
      return { landed: pos, to: pos, via: null, jumpId: null, overshoot: true, won: false };
    }
    landed = last;
  }
  const j = jumps.get(landed);
  const to = j ? j.to : landed;
  return {
    landed,
    to,
    via: j ? j.kind : null,
    jumpId: j ? j.id : null,
    overshoot: false,
    won: to === last,
  };
}
