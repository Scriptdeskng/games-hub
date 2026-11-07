/**
 * Rules as DATA. Nothing in this folder touches the DOM, timers or Math.random.
 *
 * Board model: 12 pits in a ring, indexed 0..11. Sowing goes index + 1 (mod 12), which is
 * counter-clockwise on screen. Pits 0..5 belong to the human (seat 0), 6..11 to the CPU (seat 1).
 *
 * The exact Ayo variant has not been confirmed by a Nigerian player yet (docs/GAMES.md section 3),
 * so every variation is a toggle. The defaults are the GAMES.md rules.
 */
export type CaptureRule = 'twoThree' | 'threeOnly';
export type EndSeeds = 'owners' | 'capturer';

export interface Rules {
  /** A sow of 12 or more seeds skips the pit it started from (default on). Off: the origin pit gets a seed too. */
  skipOrigin: boolean;
  /** After a capture, the pits before it that also qualify are captured too (default on). */
  captureChain: boolean;
  /** Which count captures: `twoThree` (a pit that reaches 2 or 3, default) or `threeOnly`. */
  capture: CaptureRule;
  /** A player must give the opponent seeds when the opponent side is empty (default on). */
  mustFeed: boolean;
  /**
   * When the game ends because the player to move cannot (or may not) move, who gets the seeds
   * still on the board: `owners` (each side's owner, default) or `capturer` (the other player,
   * the one who starved the mover, takes everything that is left).
   */
  endSeeds: EndSeeds;
}

export const DEFAULT_RULES: Readonly<Rules> = {
  skipOrigin: true,
  captureChain: true,
  capture: 'twoThree',
  mustFeed: true,
  endSeeds: 'owners',
};

export const CAPTURE_RULES: readonly CaptureRule[] = ['twoThree', 'threeOnly'];
export const END_SEEDS: readonly EndSeeds[] = ['owners', 'capturer'];

/** Repair rules loaded from storage or the portal: never trust them. */
export function sanitizeRules(raw: unknown): Rules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Rules>;
  const flag = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  return {
    skipOrigin: flag(r.skipOrigin, DEFAULT_RULES.skipOrigin),
    captureChain: flag(r.captureChain, DEFAULT_RULES.captureChain),
    capture: CAPTURE_RULES.includes(r.capture as CaptureRule)
      ? (r.capture as CaptureRule)
      : DEFAULT_RULES.capture,
    mustFeed: flag(r.mustFeed, DEFAULT_RULES.mustFeed),
    endSeeds: END_SEEDS.includes(r.endSeeds as EndSeeds)
      ? (r.endSeeds as EndSeeds)
      : DEFAULT_RULES.endSeeds,
  };
}

export const PITS = 12;
export const SIDE = 6;
export const SEEDS_PER_PIT = 4;
export const TOTAL_SEEDS = PITS * SEEDS_PER_PIT;
/** more than half of the 48 seeds wins at once */
export const WIN_SCORE = TOTAL_SEEDS / 2 + 1;
/**
 * Safety net: a game that has not finished after this many moves (both players together) ends and
 * every side keeps its own seeds. Seeds can circle forever when nobody can capture; real games end
 * long before (a Hard-vs-Hard game takes about 80 moves).
 */
export const MAX_PLIES = 400;
