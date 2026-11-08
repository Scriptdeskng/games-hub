import type { Rng } from '@naija/core/rng';
import { cardOf, type ShapeName } from '../rules/cards';
import type { Action } from '../rules/legal';
import type { PublicView } from '../rules/view';
import type { Style } from './personas';

/**
 * What a persona style changes in how a CPU plays (asset brief section 8). The same traits feed
 * all three difficulties, so Mama Nkechi, Tari and Aisha play recognisably at Easy, Medium and
 * Hard; only how well they play changes with the difficulty.
 */
export interface Traits {
  /** Easy: weight of leading with a 2, 5 or 14 (no penalty pending); 1 = no preference */
  power: number;
  /** Easy: weight of leading with an 8 */
  eight: number;
  /** Easy: weight of a Whot 20 while the hand is bigger than `whotFree` cards */
  whot: number;
  /** a Whot is held back while the hand has more than this many cards */
  whotFree: number;
  /** Medium and Hard: score added to leading with a 2, 5, 14 or 8 (negative = avoids it) */
  lead: number;
  /** the lead score only applies while the hand has more than this many cards ("early") */
  leadAbove: number;
  /** a Whot names the shape the other player just played (Tari) instead of the shape held most */
  callLast: boolean;
}

export const TRAITS: Record<Style, Traits> = {
  balanced: {
    power: 1,
    eight: 1,
    whot: 1,
    whotFree: 3,
    lead: 0,
    leadAbove: 0,
    callLast: false,
  },
  // Mama Nkechi: plays safe cards first, avoids leading with 2, 5 and 14, keeps a Whot back
  cautious: {
    power: 0.3,
    eight: 1,
    whot: 0.4,
    whotFree: 2,
    lead: -45,
    leadAbove: 0,
    callLast: false,
  },
  // Tari: attacks early with 2, 5, 14 and 8, and calls the shape the other player just played
  aggressive: {
    power: 2,
    eight: 2,
    whot: 1,
    whotFree: 3,
    lead: 30,
    leadAbove: 3,
    callLast: true,
  },
  // Aisha: keeps every Whot 20 until she has three cards or fewer
  hoarder: {
    power: 1,
    eight: 1,
    whot: 0.15,
    whotFree: 3,
    lead: 0,
    leadAbove: 0,
    callLast: false,
  },
};

/** The shape of the most recent card another seat played (the human is seat 0), if any. */
export function lastPlayedShape(v: PublicView): ShapeName | null {
  for (let i = v.log.length - 1; i >= 0; i--) {
    const e = v.log[i];
    if (!e || e.t !== 'play' || e.seat === v.seat) continue;
    const c = cardOf(e.card);
    if (c.shape !== 'whot') return c.shape;
  }
  return null;
}

/** Is `card` a 2, 5 or 14 played as an ordinary lead (not as a defence against a pick)? */
export const isPowerLead = (v: PublicView, card: number): boolean => {
  const n = cardOf(card).n;
  return v.pending === null && (n === 2 || n === 5 || n === 14);
};

/** How much a style likes this action when choosing at random (Easy). Draw and plain cards: 1. */
export function easyWeight(v: PublicView, a: Action, style: Style): number {
  if (a.type !== 'play') return 1;
  const t = TRAITS[style];
  const c = cardOf(a.card);
  if (c.shape === 'whot') {
    const held = v.hand.length > t.whotFree ? t.whot : 1;
    return t.callLast && a.call && a.call === lastPlayedShape(v) ? held * 4 : held;
  }
  if (v.pending) return 1;
  if (c.n === 2 || c.n === 5 || c.n === 14) return t.power;
  return c.n === 8 ? t.eight : 1;
}

/** Pick one action with probability proportional to its weight (one rng draw). */
export function weightedPick(
  actions: readonly Action[],
  weights: readonly number[],
  rng: Rng,
): Action {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng.next() * total;
  for (let i = 0; i < actions.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return actions[i] as Action;
  }
  return actions[actions.length - 1] as Action;
}
