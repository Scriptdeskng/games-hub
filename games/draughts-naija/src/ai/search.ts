import { createRng } from '@naija/core/rng';
import { other, type Cells, type Side } from '../rules/board';
import type { Rules } from '../rules/config';
import { applyToCells, generateMoves, pieceAfter, type Move } from '../rules/movegen';
import { evaluate } from './eval';

/**
 * Alpha-beta (negamax) search for the CPU: iterative deepening, a per-search transposition table
 * (Zobrist keys), move ordering (table move, longest capture, history), quiescence (forced captures
 * are followed to the end, so no position is rated in the middle of an exchange). The work is capped
 * by a NODE budget, never by a clock, so a game replays identically on a fast and a slow phone.
 *
 * Pure: no DOM, no timers, no worker globals, no module-level state (the table, the Zobrist keys and
 * the history are created inside each call). The same code runs in the Web Worker, on the main
 * thread (fallback) and in the Node tests.
 */
export interface SearchOptions {
  /** deepest iteration, in plies */
  maxDepth: number;
  /** hard cap on visited nodes (quiescence included); an unfinished iteration is thrown away */
  maxNodes: number;
  /** also return moves whose value is within this many points of the best (default 0: exact ties) */
  tie?: number;
  /** skip root moves for which this is true (as long as another move remains) */
  avoid?: (m: Move) => boolean;
}

export interface SearchResult {
  best: Move;
  /** the best move plus every other root move within `tie` of it, in search order */
  near: Move[];
  /** value of the best move for the side to move */
  value: number;
  /** deepest completed iteration (0: only the move ordering was available) */
  depth: number;
  nodes: number;
}

export const WON = 100_000;
const INF = 1e9;
/** longest chain of forced captures followed after the horizon */
const Q_MAX = 8;

interface Entry {
  depth: number;
  value: number;
  /** 0 exact, 1 lower bound, 2 upper bound */
  flag: number;
  from: number;
  to: number;
}

/** Zobrist keys from a fixed seed, built per search (not shared between searches). */
function zobrist(cells: number): { piece: Int32Array; side: number } {
  const rng = createRng(0x5eed1234);
  // two independent 32-bit keys per (square, piece), interleaved: [a, b, a, b ...]
  const piece = new Int32Array(cells * 5 * 2);
  for (let i = 0; i < piece.length; i++) piece[i] = Math.floor(rng.next() * 4294967296) | 0;
  return { piece, side: Math.floor(rng.next() * 4294967296) | 0 };
}

/** 53 bits from two 32-bit hashes (21 bits of the second): collisions are about 2^21 times rarer. */
const keyOf = (h: number, g: number): number => (h >>> 0) * 2097152 + (g >>> 11);

export function searchBest(
  board: Cells,
  side: Side,
  rules: Rules,
  opts: SearchOptions,
): SearchResult {
  const n = rules.size;
  const cells = n * n;
  const rootMoves = generateMoves(board, side, rules);
  if (rootMoves.length === 0) throw new Error('searchBest: no legal move');
  if (rootMoves.length === 1) {
    return { best: rootMoves[0] as Move, near: rootMoves, value: 0, depth: 0, nodes: 0 };
  }
  const z = zobrist(cells);
  const tt = new Map<number, Entry>();
  const hist = new Int32Array(cells * cells);
  let nodes = 0;
  let aborted = false;
  const cap = opts.maxNodes;

  /** the two hashes of a position: [first, second] */
  const hashOf = (b: Cells, s: Side): [number, number] => {
    let h = s === 0 ? 0 : z.side;
    let g = s === 0 ? 0 : Math.imul(z.side, 0x9e3779b1);
    for (let i = 0; i < cells; i++) {
      const v = b[i] as number;
      if (v !== 0) {
        const k = (i * 5 + v + 2) * 2;
        h ^= z.piece[k] as number;
        g ^= z.piece[k + 1] as number;
      }
    }
    return [h, g];
  };
  /** the hashes after `m`, from the parent's (one xor per changed square) */
  const childHash = (h: number, g: number, b: Cells, m: Move): [number, number] => {
    const v = b[m.from] as number;
    let k = (m.from * 5 + v + 2) * 2;
    let a = h ^ z.side ^ (z.piece[k] as number);
    let c = g ^ Math.imul(z.side, 0x9e3779b1) ^ (z.piece[k + 1] as number);
    for (const cp of m.caps) {
      k = (cp * 5 + (b[cp] as number) + 2) * 2;
      a ^= z.piece[k] as number;
      c ^= z.piece[k + 1] as number;
    }
    k = (m.to * 5 + pieceAfter(v, m, n) + 2) * 2;
    return [a ^ (z.piece[k] as number), c ^ (z.piece[k + 1] as number)];
  };

  /** score a move for ordering: table move, then captures by size, then history */
  const orderScore = (m: Move, tm: Entry | undefined): number =>
    (tm && tm.from === m.from && tm.to === m.to ? 1e7 : 0) +
    m.caps.length * 1000 +
    (hist[m.from * cells + m.to] as number);

  function order(moves: Move[], tm: Entry | undefined): number[] {
    const scores = moves.map((m) => orderScore(m, tm));
    return moves.map((_, i) => i).sort((a, b) => (scores[b] as number) - (scores[a] as number));
  }

  function negamax(
    b: Int8Array,
    s: Side,
    depth: number,
    alphaIn: number,
    betaIn: number,
    ply: number,
    h: number,
    g: number,
    qd: number,
  ): number {
    if (nodes >= cap) {
      aborted = true;
      return 0;
    }
    nodes++;
    const moves = generateMoves(b, s, rules);
    if (moves.length === 0) return -WON + ply;
    if (depth <= 0 && ((moves[0] as Move).caps.length === 0 || qd >= Q_MAX)) {
      return evaluate(b, s, rules);
    }
    let alpha = alphaIn;
    let beta = betaIn;
    let tm: Entry | undefined;
    if (depth > 0) {
      tm = tt.get(keyOf(h, g));
      if (tm && tm.depth >= depth) {
        if (tm.flag === 0) return tm.value;
        if (tm.flag === 1 && tm.value > alpha) alpha = tm.value;
        else if (tm.flag === 2 && tm.value < beta) beta = tm.value;
        if (alpha >= beta) return tm.value;
      }
    }
    let best = -INF;
    let bestMove: Move | null = null;
    const next = other(s);
    for (const i of order(moves, tm)) {
      const m = moves[i] as Move;
      const child = Int8Array.from(b);
      const [ch, cg] = childHash(h, g, b, m);
      applyToCells(child, m, n);
      const v = -negamax(
        child,
        next,
        depth - 1,
        -beta,
        -alpha,
        ply + 1,
        ch,
        cg,
        depth <= 0 ? qd + 1 : 0,
      );
      if (aborted) return 0;
      if (v > best) {
        best = v;
        bestMove = m;
        if (v > alpha) alpha = v;
        if (alpha >= beta) {
          if (m.caps.length === 0) hist[m.from * cells + m.to] += depth * depth;
          break;
        }
      }
    }
    if (depth > 0 && bestMove) {
      tt.set(keyOf(h, g), {
        depth,
        value: best,
        flag: best <= alphaIn ? 2 : best >= betaIn ? 1 : 0,
        from: bestMove.from,
        to: bestMove.to,
      });
    }
    return best;
  }

  const root = Int8Array.from(board);
  const [rootH, rootG] = hashOf(root, side);
  let candidates = rootMoves;
  if (opts.avoid) {
    const kept = rootMoves.filter((m) => !(opts.avoid as (m: Move) => boolean)(m));
    if (kept.length) candidates = kept;
  }
  if (candidates.length === 1) {
    return { best: candidates[0] as Move, near: candidates, value: 0, depth: 0, nodes: 0 };
  }
  // move ordering for the first iteration: captures and history only
  let ordered = order(candidates, undefined).map((i) => candidates[i] as Move);
  let result: SearchResult = {
    best: ordered[0] as Move,
    near: [ordered[0] as Move],
    value: 0,
    depth: 0,
    nodes: 0,
  };
  const tie = opts.tie ?? 0;

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    let bestVal = -INF;
    let alpha = -INF;
    const scored: { m: Move; v: number; exact: boolean }[] = [];
    for (const m of ordered) {
      const child = Int8Array.from(root);
      const [ch, cg] = childHash(rootH, rootG, root, m);
      applyToCells(child, m, n);
      // a window below the best by `tie` keeps near-best moves exact; weaker ones return a bound
      const v = -negamax(child, other(side), depth - 1, -INF, -(alpha - tie), 1, ch, cg, 0);
      if (aborted) break;
      // a value at or below the window floor is only a bound: it never counts as a near-best move
      scored.push({ m, v, exact: v > alpha - tie });
      if (v > bestVal) {
        bestVal = v;
        if (v > alpha) alpha = v;
      }
    }
    if (aborted) break;
    scored.sort((a, b) => b.v - a.v);
    const top = (scored[0] as { m: Move; v: number }).v;
    result = {
      best: (scored[0] as { m: Move }).m,
      near: scored.filter((x) => x.exact && x.v >= top - tie).map((x) => x.m),
      value: top,
      depth,
      nodes: 0,
    };
    ordered = scored.map((x) => x.m);
    if (Math.abs(top) > WON - 200) break; // a forced win or loss is already in sight
  }
  result.nodes = nodes;
  return result;
}
