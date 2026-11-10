import { crownRow, forward, isKing, kingOf, sideOf, type Cells, type Side } from './board';
import type { Rules } from './config';

/**
 * One legal move. `path` lists every square the piece lands on, in order (one square for a plain
 * move, one per jump for a capture); `caps` lists the jumped squares in the order they were jumped.
 * The pieces in `caps` are removed only after the whole sequence (international draughts).
 */
export interface Move {
  from: number;
  to: number;
  path: number[];
  caps: number[];
}

const DR = [-1, -1, 1, 1];
const DC = [-1, 1, -1, 1];

/**
 * Every capture sequence of the piece on `from`. Rules applied here:
 *  - men capture forwards AND backwards; kings fly (when `rules.flyingKings`) or step once;
 *  - a piece may not jump the same piece twice, but may pass the same EMPTY square twice;
 *  - a captured piece stays on the board until the sequence ends, so it still blocks;
 *  - the moving piece's own start square counts as empty;
 *  - a sequence is complete only when no further capture is possible; a flying king that lands
 *    with a choice of squares must pick one from which it can keep capturing, if there is one.
 * The moving piece is NOT crowned here (a man that passes the back row and keeps capturing does not
 * crown); `applyToCells` crowns a man only if the move ends on the back row.
 */
function captureSequences(board: Cells, from: number, rules: Rules, out: Move[]): void {
  const n = rules.size;
  const v = board[from] as number;
  const sign = v > 0 ? 1 : -1;
  const fly = isKing(v) && rules.flyingKings;
  const caps: number[] = [];
  const path: number[] = [];
  const empty = (i: number): boolean => board[i] === 0 || i === from;

  /** Returns true when at least one further jump was possible from `pos`. */
  const walk = (pos: number): boolean => {
    const r = Math.floor(pos / n);
    const c = pos % n;
    let jumped = false;
    for (let d = 0; d < 4; d++) {
      const dr = DR[d] as number;
      const dc = DC[d] as number;
      let rr = r + dr;
      let cc = c + dc;
      if (fly) {
        while (rr >= 0 && rr < n && cc >= 0 && cc < n && empty(rr * n + cc)) {
          rr += dr;
          cc += dc;
        }
      }
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
      const cap = rr * n + cc;
      // must be an enemy piece that has not been jumped yet
      if ((board[cap] as number) * sign >= 0 || caps.includes(cap)) continue;
      const lands: number[] = [];
      let lr = rr + dr;
      let lc = cc + dc;
      while (lr >= 0 && lr < n && lc >= 0 && lc < n && empty(lr * n + lc)) {
        lands.push(lr * n + lc);
        if (!fly) break;
        lr += dr;
        lc += dc;
      }
      if (!lands.length) continue;
      jumped = true;
      caps.push(cap);
      const segs: { start: number; end: number; more: boolean }[] = [];
      for (const land of lands) {
        path.push(land);
        const start = out.length;
        const more = walk(land);
        segs.push({ start, end: out.length, more });
        path.pop();
      }
      caps.pop();
      // a king that can keep capturing from some landing square must not stop on one that cannot
      if (segs.some((s) => s.more)) {
        for (let k = segs.length - 1; k >= 0; k--) {
          const s = segs[k] as { start: number; end: number; more: boolean };
          if (!s.more) out.splice(s.start, s.end - s.start);
        }
      }
    }
    if (!jumped && caps.length > 0) {
      out.push({ from, to: pos, path: path.slice(), caps: caps.slice() });
    }
    return jumped;
  };
  walk(from);
}

function quietMoves(board: Cells, from: number, rules: Rules, out: Move[]): void {
  const n = rules.size;
  const v = board[from] as number;
  const r = Math.floor(from / n);
  const c = from % n;
  const add = (to: number): void => void out.push({ from, to, path: [to], caps: [] });
  if (!isKing(v)) {
    const rr = r + forward(sideOf(v));
    if (rr < 0 || rr >= n) return;
    for (const dc of [-1, 1]) {
      const cc = c + dc;
      if (cc >= 0 && cc < n && board[rr * n + cc] === 0) add(rr * n + cc);
    }
    return;
  }
  for (let d = 0; d < 4; d++) {
    let rr = r + (DR[d] as number);
    let cc = c + (DC[d] as number);
    while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === 0) {
      add(rr * n + cc);
      if (!rules.flyingKings) break;
      rr += DR[d] as number;
      cc += DC[d] as number;
    }
  }
}

const sameCaps = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const s = a.slice().sort((x, y) => x - y);
  const t = b.slice().sort((x, y) => x - y);
  return s.every((x, i) => x === t[i]);
};

/**
 * All legal moves for `side`: if any capture exists the player must capture (and, with
 * `rules.maxCapture`, must take the sequence that captures the most pieces; a king counts as one).
 * Two sequences with the same start, end and set of captured pieces are one move.
 */
export function generateMoves(board: Cells, side: Side, rules: Rules): Move[] {
  const caps: Move[] = [];
  for (let i = 0; i < board.length; i++) {
    const v = board[i] as number;
    if (v !== 0 && sideOf(v) === side) captureSequences(board, i, rules, caps);
  }
  if (caps.length > 0) {
    let list = caps;
    if (rules.maxCapture) {
      const most = Math.max(...caps.map((m) => m.caps.length));
      list = caps.filter((m) => m.caps.length === most);
    }
    return list.filter(
      (m, i) =>
        !list.some(
          (o, j) => j < i && o.from === m.from && o.to === m.to && sameCaps(o.caps, m.caps),
        ),
    );
  }
  const quiet: Move[] = [];
  for (let i = 0; i < board.length; i++) {
    const v = board[i] as number;
    if (v !== 0 && sideOf(v) === side) quietMoves(board, i, rules, quiet);
  }
  return quiet;
}

/** Does `side` have to capture? (Cheaper than building every move when only the answer matters.) */
export const mustCapture = (board: Cells, side: Side, rules: Rules): boolean => {
  const probe: Move[] = [];
  for (let i = 0; i < board.length; i++) {
    const v = board[i] as number;
    if (v !== 0 && sideOf(v) === side) {
      captureSequences(board, i, rules, probe);
      if (probe.length) return true;
    }
  }
  return false;
};

/**
 * Play `m` on `cells` (mutates). Captured pieces leave after the whole sequence; a man is crowned only
 * if it ENDS the move on the back row. Returns true when the move crowned a man.
 */
export function applyToCells(cells: { [i: number]: number }, m: Move, n: number): boolean {
  const v = cells[m.from] as number;
  const side = sideOf(v);
  cells[m.from] = 0;
  for (const c of m.caps) cells[c] = 0;
  const crowned = !isKing(v) && Math.floor(m.to / n) === crownRow(side, n);
  cells[m.to] = crowned ? kingOf(side) : v;
  return crowned;
}

/** The piece a move would leave on `m.to`, for tests and views. */
export const pieceAfter = (v: number, m: Move, n: number): number =>
  !isKing(v) && Math.floor(m.to / n) === crownRow(sideOf(v), n) ? kingOf(sideOf(v)) : v;
