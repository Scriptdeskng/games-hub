/**
 * Rules as DATA. Nothing in this folder touches the DOM, timers or Math.random.
 *
 * Board model (the standard 15x15 cross):
 *  - a shared track of 52 squares, indexed 0..51 clockwise;
 *  - four colour "slots" sit clockwise (slot 0 = the human); slot `s` enters the track at
 *    square `13 * s` (its start square), and a seed travels 51 track squares (progress 0..50);
 *  - then it turns into its own 6-square home column (progress 51..56: five coloured squares and
 *    the home triangle itself, progress 56). Home columns are private, so nothing there can be captured;
 *  - progress -1 means "in the yard".
 */
export type StackRule = 'safe' | 'block' | 'off';

export interface Rules {
  /** Capturing a lone opponent seed earns another roll. */
  captureBonus: boolean;
  /** A seed must reach home with an exact roll. Off: any roll that reaches or passes home gets it home. */
  exactHome: boolean;
  /** Three 6s in a row forfeit the turn (the third roll moves nothing). */
  threeSixes: boolean;
  /**
   * Two or more same-colour seeds on one track square (a stack):
   * `safe` (default, the casual house rule): the stack cannot be captured, everybody may share the square;
   * `block`: the stack is a blockade nobody else may land on or pass (it also blocks a release onto a start square it sits on);
   * `off`: no protection, a landing captures every opponent seed on the square.
   */
  stacks: StackRule;
  /** Quick mode: 2 seeds each instead of 4. */
  quick: boolean;
  /** Quick mode win condition: the first seed home wins (default) or both seeds home. */
  quickFirstHome: boolean;
}

export const DEFAULT_RULES: Readonly<Rules> = {
  captureBonus: true,
  exactHome: true,
  threeSixes: true,
  stacks: 'safe',
  quick: false,
  quickFirstHome: true,
};

export const STACK_RULES: readonly StackRule[] = ['safe', 'block', 'off'];

/** Repair rules loaded from storage or the portal: never trust them. */
export function sanitizeRules(raw: unknown): Rules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Rules>;
  const flag = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  return {
    captureBonus: flag(r.captureBonus, DEFAULT_RULES.captureBonus),
    exactHome: flag(r.exactHome, DEFAULT_RULES.exactHome),
    threeSixes: flag(r.threeSixes, DEFAULT_RULES.threeSixes),
    stacks: STACK_RULES.includes(r.stacks as StackRule)
      ? (r.stacks as StackRule)
      : DEFAULT_RULES.stacks,
    quick: flag(r.quick, DEFAULT_RULES.quick),
    quickFirstHome: flag(r.quickFirstHome, DEFAULT_RULES.quickFirstHome),
  };
}

export const TRACK_SIZE = 52;
/** squares between two colours' start squares */
export const ARM = 13;
export const YARD = -1;
/** last progress value on the shared track */
export const LAST_TRACK = 50;
/** progress of the home triangle (the end of the 6-square home column 51..56) */
export const HOME = 56;
export const MAX_ROLL = 6;
export const SEEDS_CLASSIC = 4;
export const SEEDS_QUICK = 2;
/** 1 CPU sits opposite the human; 3 CPUs fill the other corners. Never 2. */
export const CPU_COUNTS: readonly number[] = [1, 3];
export const MAX_CPUS = 3;

export const seedsPer = (rules: Rules): number => (rules.quick ? SEEDS_QUICK : SEEDS_CLASSIC);
