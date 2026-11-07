import { MAX_PLIES, PITS, SIDE, type Rules } from './config';

/** A mutable list of pit counts. The engine uses plain arrays, the AI search uses typed arrays. */
export type Pits = number[] | Uint8Array | Int8Array;

/** Seat (0 = human, 1 = CPU) that owns a pit. */
export const ownerOf = (pit: number): 0 | 1 => (pit < SIDE ? 0 : 1);
export const nextPit = (pit: number): number => (pit + 1) % PITS;
export const prevPit = (pit: number): number => (pit + PITS - 1) % PITS;

export const sideSeeds = (pits: Pits, side: number): number => {
  let n = 0;
  for (let i = side * SIDE; i < side * SIDE + SIDE; i++) n += pits[i]!;
  return n;
};

/** Does a pit of `count` seeds (taken from `pit`) reach the opponent's side? */
export const reachesOpponent = (pit: number, count: number): boolean => {
  const first = ownerOf(pit) === 0 ? SIDE : PITS;
  return count >= first - pit;
};

/** Does `count` seeds in a pit qualify for capture under the rule? */
export const qualifies = (count: number, rules: Rules): boolean =>
  rules.capture === 'threeOnly' ? count === 3 : count === 2 || count === 3;

export interface SowResult {
  /** pit that got the last seed */
  last: number;
  /** the origin pit was skipped at least once */
  skipped: boolean;
}

/**
 * Lift every seed from `pit` and sow them one by one counter-clockwise. A sow of 12 or more seeds
 * skips the origin pit when `rules.skipOrigin` is on. `path` (optional) receives each landing pit.
 */
export function sow(pits: Pits, pit: number, rules: Rules, path?: number[]): SowResult {
  const n = pits[pit]!;
  pits[pit] = 0;
  const skip = rules.skipOrigin && n >= PITS;
  let i = pit;
  let skipped = false;
  for (let k = 0; k < n; k++) {
    i = nextPit(i);
    if (skip && i === pit) {
      i = nextPit(i);
      skipped = true;
    }
    pits[i] = pits[i]! + 1;
    path?.push(i);
  }
  return { last: i, skipped };
}

/**
 * Capture after a sow ended in `last`: only an opponent pit counts. The pit qualifies when it holds
 * 2 or 3 (or exactly 3). With the chain rule, the pits before it (still on the opponent side) that
 * also qualify are taken too, stopping at the first that does not. Returns the seeds taken;
 * `taken` (optional) receives `{ pit, count }` in capture order.
 */
export function capture(
  pits: Pits,
  last: number,
  mover: number,
  rules: Rules,
  taken?: { pit: number; count: number }[],
): number {
  let gained = 0;
  let i = last;
  while (ownerOf(i) !== mover && qualifies(pits[i]!, rules)) {
    const count = pits[i]!;
    gained += count;
    pits[i] = 0;
    taken?.push({ pit: i, count });
    if (!rules.captureChain) break;
    i = prevPit(i);
  }
  return gained;
}

/** The game is cut off after MAX_PLIES moves. */
export const isCapped = (plies: number): boolean => plies >= MAX_PLIES;
