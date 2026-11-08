import { DECK, cardOf, type Shape } from '../rules/cards';
import type { PublicView } from '../rules/view';

/**
 * Card counting from PUBLIC information only: every card that is not in my own hand and not in
 * the face-up pile is "unseen" (in the market or in an opponent's hand). Nothing here reads the
 * market order or any other hand; the input type (PublicView) does not even contain them.
 */
export interface Knowledge {
  unseen: number[];
  byShape: Record<Shape, number>;
  byNumber: Record<number, number>;
}

export function knowledge(v: PublicView): Knowledge {
  const known = new Set<number>([...v.hand, ...v.discard]);
  const unseen: number[] = [];
  const byShape: Record<Shape, number> = {
    circle: 0,
    triangle: 0,
    cross: 0,
    square: 0,
    star: 0,
    whot: 0,
  };
  const byNumber: Record<number, number> = {};
  for (const c of DECK) {
    if (known.has(c.id)) continue;
    unseen.push(c.id);
    byShape[c.shape]++;
    byNumber[c.n] = (byNumber[c.n] ?? 0) + 1;
  }
  return { unseen, byShape, byNumber };
}

/** Chance that a random `h`-card hand drawn from `u` unseen cards holds at least one of `m` matching ones. */
export function pAnyOf(u: number, m: number, h: number): number {
  if (m <= 0 || h <= 0 || u <= 0) return 0;
  if (m >= u || h >= u) return 1;
  let none = 1;
  for (let i = 0; i < h; i++) none *= Math.max(0, (u - m - i) / (u - i));
  return 1 - none;
}

/** Unseen cards that could be played on a pile whose top is `shape`/`n` (or on a called shape). */
export function matchingUnseen(k: Knowledge, shape: Shape, n: number | null): number {
  if (n === null) return k.byShape[shape] + k.byShape.whot;
  let m = k.byShape.whot + (shape === 'whot' ? 0 : k.byShape[shape]) + (k.byNumber[n] ?? 0);
  // a card of that shape AND number was counted twice
  if (shape !== 'whot') {
    for (const id of k.unseen) {
      const c = cardOf(id);
      if (c.shape === shape && c.n === n) m--;
    }
  }
  return m;
}

/**
 * Has this opponent shown, in the public log, that it could not match `shape` or `n` at its last
 * voluntary draw (and has not played since)? Then it probably holds fewer such cards.
 */
export function showedLack(v: PublicView, seat: number, shape: Shape | null, n: number): boolean {
  for (let i = v.log.length - 1; i >= 0; i--) {
    const e = v.log[i];
    if (!e || e.seat !== seat) continue;
    if (e.t === 'play') return false;
    if (e.voluntary) return (shape !== null && e.need === shape) || e.needN === n;
  }
  return false;
}

/** Probability that `seat` can answer a pile with this top. */
export function pCanAnswer(
  v: PublicView,
  k: Knowledge,
  seat: number,
  shape: Shape,
  n: number | null,
): number {
  const base = pAnyOf(k.unseen.length, matchingUnseen(k, shape, n), v.sizes[seat] ?? 0);
  return showedLack(v, seat, shape, n ?? -1) ? base * 0.5 : base;
}

/** Fraction of unseen cards that could later be played on card `id` (how easy it is to get rid of). */
export function cover(k: Knowledge, id: number): number {
  const c = cardOf(id);
  if (k.unseen.length === 0) return 0.5;
  const m = matchingUnseen(k, c.shape, c.n);
  return m / k.unseen.length;
}
