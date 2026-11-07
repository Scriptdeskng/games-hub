import { MAX_PLIES, PITS, SIDE, WIN_SCORE, type Rules } from '../rules/config';
import { capture, reachesOpponent, sow } from '../rules/board';
import { sweepOf, type Side } from '../rules/engine';

/**
 * Alpha-beta (negamax) search with iterative deepening, for the Hard CPU. Pure and deterministic:
 * no clock, no randomness (the caller's seeded rng only breaks exact ties). The work is capped by a
 * NODE budget, not by time, so a game replays identically on a fast and a slow phone, and the
 * cost of one decision is bounded: see `ai.test.ts` for the measured milliseconds.
 *
 * Scale: one seed in a tray is worth 16 points. A won game is worth `WON` minus the depth.
 */
export interface SearchOptions {
  /** deepest iteration (plies) */
  maxDepth: number;
  /** hard cap on visited nodes; an unfinished iteration is thrown away */
  maxNodes: number;
}

export interface SearchResult {
  /** every root move whose value equals the best (exact ties), in search order */
  best: number[];
  /** value of the best move for the side to move */
  value: number;
  /** deepest completed iteration */
  depth: number;
  nodes: number;
}

const WON = 100000;
const SEED = 16;
const INF = 1e9;

interface Ctx {
  rules: Rules;
  maxNodes: number;
  nodes: number;
  aborted: boolean;
  basePlies: number;
  /** pits per ply */
  P: Uint8Array[];
  /** stores per ply: [ply * 2 + seat] */
  S: Int16Array;
  /** move list per ply and its gains */
  M: Int8Array[];
  G: Int8Array[];
  /** the children of one node (6 boards of 12) and the order to visit them */
  K: Uint8Array[];
  O: Int8Array[];
}

const side0 = (p: Uint8Array): number => p[0]! + p[1]! + p[2]! + p[3]! + p[4]! + p[5]!;
const side1 = (p: Uint8Array): number => p[6]! + p[7]! + p[8]! + p[9]! + p[10]! + p[11]!;

/** Static value for `side` to move: trays, material on each side, and pits one seed from capture. */
function evaluate(p: Uint8Array, mine: number, theirs: number, side: Side): number {
  const own = side === 0 ? side0(p) : side1(p);
  const foe = side === 0 ? side1(p) : side0(p);
  let weakOwn = 0;
  let weakFoe = 0;
  const a = side * SIDE;
  const b = (1 - side) * SIDE;
  for (let i = 0; i < SIDE; i++) {
    const x = p[a + i]!;
    const y = p[b + i]!;
    if (x === 1 || x === 2) weakOwn++;
    if (y === 1 || y === 2) weakFoe++;
  }
  return (mine - theirs) * SEED + (own - foe) * 3 + (weakFoe - weakOwn) * 5;
}

/** Value of a finished game for `side` (the seeds on the board are swept first). */
function final(
  p: Uint8Array,
  s0: number,
  s1: number,
  stuck: Side | null,
  side: Side,
  rules: Rules,
): number {
  const [a, b] = sweepOf(p as unknown as number[], stuck, rules);
  const t0 = s0 + a;
  const t1 = s1 + b;
  const diff = side === 0 ? t0 - t1 : t1 - t0;
  const mine = side === 0 ? t0 : t1;
  const theirs = side === 0 ? t1 : t0;
  if (mine >= WIN_SCORE) return WON + diff;
  if (theirs >= WIN_SCORE) return -WON + diff;
  return 0;
}

function negamax(
  c: Ctx,
  ply: number,
  depth: number,
  alpha: number,
  beta: number,
  side: Side,
): number {
  if (++c.nodes > c.maxNodes) {
    c.aborted = true;
    return 0;
  }
  const p = c.P[ply] as Uint8Array;
  const s0 = c.S[ply * 2] as number;
  const s1 = c.S[ply * 2 + 1] as number;
  const mine = side === 0 ? s0 : s1;
  const theirs = side === 0 ? s1 : s0;
  if (mine >= WIN_SCORE) return WON - ply;
  if (theirs >= WIN_SCORE) return -WON + ply;
  if (c.basePlies + ply >= MAX_PLIES) return final(p, s0, s1, null, side, c.rules);

  // moves
  const ownSeeds = side === 0 ? side0(p) : side1(p);
  const foeSeeds = side === 0 ? side1(p) : side0(p);
  const feed = c.rules.mustFeed && foeSeeds === 0;
  const moves = c.M[ply] as Int8Array;
  let n = 0;
  if (ownSeeds > 0) {
    for (let pit = side * SIDE; pit < side * SIDE + SIDE; pit++) {
      const k = p[pit] as number;
      if (k > 0 && (!feed || reachesOpponent(pit, k))) moves[n++] = pit;
    }
  }
  if (n === 0) return final(p, s0, s1, side, side, c.rules);
  if (depth === 0) return evaluate(p, mine, theirs, side);

  // children: the gain of each move orders them (captures first)
  const gains = c.G[ply] as Int8Array;
  const kids = c.K[ply] as Uint8Array;
  const ord = c.O[ply] as Int8Array;
  const child = c.P[ply + 1] as Uint8Array;
  for (let i = 0; i < n; i++) {
    child.set(p);
    const r = sow(child, moves[i] as number, c.rules);
    gains[i] = capture(child, r.last, side, c.rules);
    kids.set(child, i * PITS);
    // insertion into the visiting order, best gain first
    let j = i - 1;
    while (j >= 0 && (gains[ord[j] as number] as number) < (gains[i] as number)) {
      ord[j + 1] = ord[j] as number;
      j--;
    }
    ord[j + 1] = i;
  }
  let best = -INF;
  for (let k = 0; k < n; k++) {
    const i = ord[k] as number;
    child.set(kids.subarray(i * PITS, i * PITS + PITS));
    const g = gains[i] as number;
    c.S[(ply + 1) * 2] = s0 + (side === 0 ? g : 0);
    c.S[(ply + 1) * 2 + 1] = s1 + (side === 1 ? g : 0);
    const v = -negamax(c, ply + 1, depth - 1, -beta, -alpha, (1 - side) as Side);
    if (c.aborted) return 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Pick the best pit for `side`. `pits` and `store` are not modified. Always completes depth 1,
 * then deepens until `maxDepth` or until the node budget runs out.
 */
export function searchBest(
  pits: readonly number[],
  store: readonly [number, number],
  side: Side,
  rules: Rules,
  plies: number,
  o: SearchOptions,
): SearchResult {
  const rows = o.maxDepth + 2;
  const c: Ctx = {
    rules,
    maxNodes: o.maxNodes,
    nodes: 0,
    aborted: false,
    basePlies: plies,
    P: Array.from({ length: rows }, () => new Uint8Array(PITS)),
    S: new Int16Array(rows * 2),
    M: Array.from({ length: rows }, () => new Int8Array(SIDE)),
    G: Array.from({ length: rows }, () => new Int8Array(SIDE)),
    K: Array.from({ length: rows }, () => new Uint8Array(SIDE * PITS)),
    O: Array.from({ length: rows }, () => new Int8Array(SIDE)),
  };
  // root moves, in pit order (the previous iteration's best is moved to the front)
  const root: number[] = [];
  const feed =
    rules.mustFeed && pits.slice((1 - side) * SIDE, (1 - side) * SIDE + SIDE).every((x) => x === 0);
  for (let pit = side * SIDE; pit < side * SIDE + SIDE; pit++) {
    const k = pits[pit] as number;
    if (k > 0 && (!feed || reachesOpponent(pit, k))) root.push(pit);
  }
  let result: SearchResult = { best: root.slice(0, 1), value: 0, depth: 0, nodes: 0 };
  if (root.length <= 1) return { ...result, best: root };

  for (let depth = 1; depth <= o.maxDepth; depth++) {
    c.aborted = false;
    // depth 1 is never cut short: a decision always exists
    if (depth === 1) c.maxNodes = Infinity;
    else c.maxNodes = o.maxNodes;
    let bestV = -INF;
    let ties: number[] = [];
    const order = result.best.length
      ? [...result.best, ...root.filter((x) => !result.best.includes(x))]
      : root;
    let alpha = -INF;
    for (const pit of order) {
      const child = c.P[1] as Uint8Array;
      child.set(pits as ArrayLike<number> as number[]);
      c.P[0]!.set(pits as ArrayLike<number> as number[]);
      const r = sow(child, pit, rules);
      const g = capture(child, r.last, side, rules);
      c.S[0] = store[0];
      c.S[1] = store[1];
      c.S[2] = store[0] + (side === 0 ? g : 0);
      c.S[3] = store[1] + (side === 1 ? g : 0);
      // alpha = best - 1: any move equal to the best returns its exact value, so ties are real ties
      const v = -negamax(c, 1, depth - 1, -INF, -alpha, (1 - side) as Side);
      if (c.aborted) break;
      if (v > bestV) {
        bestV = v;
        ties = [pit];
      } else if (v === bestV) ties.push(pit);
      alpha = Math.max(alpha, bestV - 1);
    }
    if (c.aborted) break;
    result = { best: ties, value: bestV, depth, nodes: c.nodes };
    if (Math.abs(bestV) >= WON - MAX_PLIES) break; // a forced win or loss is found: deeper adds nothing
  }
  return { ...result, nodes: c.nodes };
}
