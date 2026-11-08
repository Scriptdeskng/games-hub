/**
 * The 54-card Whot deck (docs/GAMES.md section 1). Cards are plain ids 0..53 everywhere in the
 * game state; this module is the single table that turns an id into a shape and a number.
 */
export type ShapeName = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
export type Shape = ShapeName | 'whot';

export const SHAPES: readonly ShapeName[] = ['circle', 'triangle', 'cross', 'square', 'star'];

export interface Card {
  id: number;
  shape: Shape;
  /** the number on the card; the Whot is 20 */
  n: number;
}

const RUNS: Record<ShapeName, readonly number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};
export const WHOT_COUNT = 5;
export const WHOT_NUMBER = 20;

/** Built once at load, never mutated. */
export const DECK: readonly Card[] = (() => {
  const out: Card[] = [];
  for (const shape of SHAPES) for (const n of RUNS[shape]) out.push({ id: out.length, shape, n });
  for (let i = 0; i < WHOT_COUNT; i++) {
    out.push({ id: out.length, shape: 'whot', n: WHOT_NUMBER });
  }
  return out;
})();

export const DECK_SIZE = DECK.length;
export const cardOf = (id: number): Card => DECK[id] as Card;
export const isWhot = (id: number): boolean => cardOf(id).shape === 'whot';

/** Cards with a power: 1 Hold On, 2 Pick Two, 5 Pick Three, 8 Suspension, 14 General Market, 20 Whot. */
export const SPECIAL_NUMBERS: readonly number[] = [1, 2, 5, 8, 14, WHOT_NUMBER];
export const isSpecial = (id: number): boolean => SPECIAL_NUMBERS.includes(cardOf(id).n);

/** Count-up value of a card: its number (the Whot counts 20). */
export const cardValue = (id: number): number => cardOf(id).n;
export const handValue = (hand: readonly number[]): number =>
  hand.reduce((sum, id) => sum + cardValue(id), 0);
