/**
 * Rules as DATA. Nothing in this folder touches the DOM, timers or Math.random.
 * The defaults are the "Lagos house rules" of docs/GAMES.md section 1.
 */
export interface Rules {
  /** A 2 can be played on a Pick Two: the penalty grows by 2 and passes on (default on). */
  stackTwo: boolean;
  /** A 5 can be played on a Pick Three: the penalty grows by 3 and passes on (default on). */
  defendFive: boolean;
  /** A Whot 20 may be played on a pending pick and cancels it (default off). */
  whotOnPending: boolean;
  /**
   * Winning on a power card. On (default): you may go out on any card (a finishing 1, 8, 14, 2, 5
   * or Whot simply ends the game). Off: your last card cannot be a power card, so a lone power
   * card cannot be played and you must draw.
   */
  finishOnSpecial: boolean;
  /** General Market (14): after everybody else draws one, the player plays again (default on). */
  marketAgain: boolean;
  /** "Last card" must be announced when you are down to one card; caught costs 2 cards (default on). */
  lastCard: boolean;
  /** Optional "Semi-last card" at two cards (needs lastCard; default off). */
  semiLast: boolean;
  /** Count-up variant: the game ends when the market (draw pile) runs out; the lowest hand wins. */
  marketEnds: boolean;
  /**
   * Calm late game (default on): a very long game cannot go on for ever, so once `CALM_TURN`
   * turns have been played, a 2, 5 or 14 played on an ordinary card is just a card (no new
   * penalty, no General Market). A penalty already running still plays out. 1, 8 and Whot are
   * unchanged. Turn it off for the classic, never-calming game (the 600-turn safety net remains).
   */
  calmLate: boolean;
}

export const DEFAULT_RULES: Readonly<Rules> = {
  stackTwo: true,
  defendFive: true,
  whotOnPending: false,
  finishOnSpecial: true,
  marketAgain: true,
  lastCard: true,
  semiLast: false,
  marketEnds: false,
  calmLate: true,
};

export const RULE_KEYS = Object.keys(DEFAULT_RULES) as (keyof Rules)[];

/** Repair rules loaded from storage or the portal: never trust them. */
export function sanitizeRules(raw: unknown): Rules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Rules, unknown>>;
  const out = { ...DEFAULT_RULES };
  for (const k of RULE_KEYS) if (typeof r[k] === 'boolean') out[k] = r[k] as boolean;
  // the semi-last call only exists inside the last-card rule
  if (!out.lastCard) out.semiLast = false;
  return out;
}

export const HAND_SIZE = 5;
/** cards drawn by a player who is caught without calling */
export const CATCH_PENALTY = 2;
/** 1, 2 or 3 CPU opponents */
export const CPU_COUNTS: readonly number[] = [1, 2, 3];
export const MAX_CPUS = 3;
/** Safety net: a game that is still going after this many turns ends by count-up. */
export const MAX_TURNS = 600;
/** With the `calmLate` rule, power cards 2, 5 and 14 stop hurting after this many turns. */
export const CALM_TURN = 240;
