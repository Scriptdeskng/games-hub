/**
 * Rules as DATA. Nothing in this folder touches the DOM, timers or Math.random.
 *
 * Two board sizes:
 *  - 10x10 INTERNATIONAL draughts (default): 20 men each, men capture forwards and backwards,
 *    capture is mandatory, the MAXIMUM capture must be taken (majority rule), flying kings.
 *  - 8x8 SHORT game: 12 men each, men capture backwards, capture is mandatory. The majority rule is
 *    a toggle (default on). Kings step one square by default; `flyingKingsShort` makes them fly.
 *    OPEN RULE QUESTION for a Nigerian player: is the short game played with flying kings?
 *
 * Board geometry: row 0 is the TOP of the screen, the bottom-left square is dark for both sizes
 * (a square is dark when row + col is odd). Light (the human, ivory) starts at the bottom and moves
 * up; dark (iroko) starts at the top and moves down.
 */
export type Size = 10 | 8;

/** What the player can change on the Rules screen (saved with the progress). */
export interface RuleToggles {
  /** 8x8 only: must the capture that takes the most pieces be played? (10x10 always does.) */
  maxCapture: boolean;
  /** 8x8 only: do kings fly (as they always do on 10x10)? Default off: one step. */
  flyingKingsShort: boolean;
  /** The CPU (dark) moves first. Default off: the human (light) moves first. */
  cpuStarts: boolean;
}

export const DEFAULT_TOGGLES: Readonly<RuleToggles> = {
  maxCapture: true,
  flyingKingsShort: false,
  cpuStarts: false,
};

/** The rules one game is played under. */
export interface Rules {
  size: Size;
  /** the maximum capture is compulsory (always true on 10x10) */
  maxCapture: boolean;
  /** kings slide any distance and capture from a distance (always true on 10x10) */
  flyingKings: boolean;
  /** dark (the CPU) moves first */
  cpuStarts: boolean;
}

export const makeRules = (size: Size, t: Readonly<RuleToggles> = DEFAULT_TOGGLES): Rules => ({
  size,
  maxCapture: size === 10 ? true : t.maxCapture,
  flyingKings: size === 10 ? true : t.flyingKingsShort,
  cpuStarts: t.cpuStarts,
});

/** Rows of men per side at the start. */
export const startRows = (size: Size): number => (size === 10 ? 4 : 3);

/**
 * Draw by the king-only rule: this many consecutive plies in which only kings moved and nothing was
 * captured (25 moves by each side, as in the FMJD 25-move rule). A man move or a capture resets it.
 */
export const KING_ONLY_PLY_LIMIT = 50;
/** Draw by repetition: the same position (same side to move) this many times. */
export const REPETITION_LIMIT = 3;
/** Safety valve only: no real game gets near it (every man move and capture is irreversible). */
export const MAX_PLIES = 1000;

export const sanitizeToggles = (raw: unknown): RuleToggles => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<RuleToggles>;
  return {
    maxCapture: typeof r.maxCapture === 'boolean' ? r.maxCapture : DEFAULT_TOGGLES.maxCapture,
    flyingKingsShort:
      typeof r.flyingKingsShort === 'boolean'
        ? r.flyingKingsShort
        : DEFAULT_TOGGLES.flyingKingsShort,
    cpuStarts: typeof r.cpuStarts === 'boolean' ? r.cpuStarts : DEFAULT_TOGGLES.cpuStarts,
  };
};
