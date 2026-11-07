/**
 * Rules and board layout as DATA. Nothing here touches the DOM, timers or Math.random.
 * Every toggle is a setting (persisted by the game, edited in the settings screen).
 */
export interface Rules {
  /** You must land on 100 exactly. Overshooting means you stay put. Off: any roll past 100 wins. */
  exactFinish: boolean;
  /** Once per game each player may re-roll a die they just rolled (and must keep the new roll). */
  reroll: boolean;
  /** On every `choiceEvery`-th turn of a player's own, roll two dice and keep one. */
  choiceDice: boolean;
  choiceEvery: number;
}

export const DEFAULT_RULES: Readonly<Rules> = {
  exactFinish: true,
  reroll: true,
  choiceDice: true,
  choiceEvery: 5,
};

/** Repair rules loaded from storage or the portal: never trust them. */
export function sanitizeRules(raw: unknown): Rules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Rules>;
  const flag = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  return {
    exactFinish: flag(r.exactFinish, DEFAULT_RULES.exactFinish),
    reroll: flag(r.reroll, DEFAULT_RULES.reroll),
    choiceDice: flag(r.choiceDice, DEFAULT_RULES.choiceDice),
    choiceEvery:
      typeof r.choiceEvery === 'number' && Number.isInteger(r.choiceEvery) && r.choiceEvery >= 2
        ? Math.min(r.choiceEvery, 20)
        : DEFAULT_RULES.choiceEvery,
  };
}

export const BOARD_SIZE = 10;
export const SQUARES = BOARD_SIZE * BOARD_SIZE;
export const MAX_ROLL = 6;
export const MAX_CPUS = 3;

/** A ladder (up) or a snake (down). `id` links the entry to its caption and artwork. */
export interface Jump {
  id: string;
  from: number;
  to: number;
  /** look and sound: brt, okada, keke, bridge (ladders); pothole, goslow, nepa, tollqueue (snakes) */
  theme?: string;
}

export interface BoardLayout {
  size: number;
  ladders: readonly Jump[];
  snakes: readonly Jump[];
}

export class LayoutError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`invalid board layout: ${problems.join('; ')}`);
    this.name = 'LayoutError';
  }
}
