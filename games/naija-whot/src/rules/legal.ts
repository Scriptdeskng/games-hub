import { SHAPES, cardOf, isSpecial, type Shape, type ShapeName } from './cards';
import type { Rules } from './config';

/** A pick penalty waiting for the current player: draw `count` cards, or defend where the rules allow. */
export interface Pending {
  kind: 'two' | 'three';
  count: number;
}

/** What a player has announced: nothing, "Semi-last card" (two cards) or "Last card" (one card). */
export type CallLevel = 'none' | 'semi' | 'last';

export type Action =
  /** play a card; a Whot 20 must name the shape; `announce` also calls Last / Semi-last card */
  | { type: 'play'; card: number; call?: ShapeName; announce?: boolean }
  /** take a card from the market (or the whole pending penalty) */
  | { type: 'draw' }
  /** the current player catches another player who forgot to call; it does not use up the turn */
  | { type: 'catch'; target: number };

/** What decides whether a card can be played: shared by the full state and a player's public view. */
export interface PlayContext {
  rules: Rules;
  /** the face-up pile, top card last */
  discard: readonly number[];
  /** the shape named by the Whot 20 on top, otherwise null */
  called: ShapeName | null;
  pending: Pending | null;
}

export const topId = (c: Pick<PlayContext, 'discard'>): number =>
  c.discard[c.discard.length - 1] as number;

/** Does `id` match the top card (shape or number; a Whot always; after a Whot, the called shape)? */
export function matchesTop(c: PlayContext, id: number): boolean {
  const card = cardOf(id);
  if (card.shape === 'whot') return true;
  const top = cardOf(topId(c));
  if (top.shape === 'whot') return c.called === card.shape;
  return card.shape === top.shape || card.n === top.n;
}

/** Can the owner of `hand` play card `id` right now? */
export function canPlayCard(c: PlayContext, hand: readonly number[], id: number): boolean {
  if (!hand.includes(id)) return false;
  const card = cardOf(id);
  // without the finishOnSpecial rule a lone power card can never be the last card played
  if (!c.rules.finishOnSpecial && hand.length === 1 && isSpecial(id)) return false;
  if (c.pending) {
    if (card.shape === 'whot') return c.rules.whotOnPending;
    if (c.pending.kind === 'two') return card.n === 2 && c.rules.stackTwo;
    return card.n === 5 && c.rules.defendFive;
  }
  return matchesTop(c, id);
}

export const playableCards = (c: PlayContext, hand: readonly number[]): number[] =>
  hand.filter((id) => canPlayCard(c, hand, id));

/** Drawing is allowed when a penalty is pending, or when no card can be played. */
export function canDraw(c: PlayContext, hand: readonly number[]): boolean {
  return c.pending !== null || playableCards(c, hand).length === 0;
}

/** Every legal play (a Whot expands to one action per shape) and the draw, for AI and tests. */
export function legalActions(c: PlayContext, hand: readonly number[]): Action[] {
  const out: Action[] = [];
  const seenWhot = new Set<number>();
  for (const id of playableCards(c, hand)) {
    if (cardOf(id).shape !== 'whot') out.push({ type: 'play', card: id });
    else if (!seenWhot.has(id)) {
      seenWhot.add(id);
      for (const call of SHAPES) out.push({ type: 'play', card: id, call });
    }
  }
  if (canDraw(c, hand)) out.push({ type: 'draw' });
  return out;
}

export const isShapeName = (v: unknown): v is ShapeName => SHAPES.includes(v as ShapeName);
export const calledShape = (shape: Shape, call?: ShapeName): ShapeName | null =>
  shape === 'whot' ? (call ?? null) : null;

// ---- Last card / Semi-last card ----

const RANK: Record<CallLevel, number> = { none: 0, semi: 1, last: 2 };

/** The announcement a hand of `len` cards owes: Last card at one, Semi-last at two (if on). */
export function requiredCall(rules: Rules, len: number): CallLevel {
  if (!rules.lastCard) return 'none';
  if (len === 1) return 'last';
  if (len === 2 && rules.semiLast) return 'semi';
  return 'none';
}

/** True when the owner of a `len`-card hand has not made the announcement the hand owes. */
export const isExposed = (rules: Rules, len: number, call: CallLevel): boolean =>
  RANK[call] < RANK[requiredCall(rules, len)];

/** What pressing the Last card button says: Semi-last at two cards (if on), otherwise Last card. */
export const announceLevel = (rules: Rules, len: number): CallLevel =>
  len === 2 && rules.semiLast ? 'semi' : 'last';

export const canAnnounceWith = (rules: Rules, len: number, call: CallLevel): boolean =>
  rules.lastCard && len >= 1 && len <= 2 && RANK[call] < RANK[announceLevel(rules, len)];
