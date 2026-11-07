import type { Rng } from '../rng';

/**
 * Seeded dice. Pure data in, pure data out: a roll is just numbers, so a game state that
 * stores the RNG state (`rng.getState()`) replays identically on every device.
 * Dice are a board-game mechanic here (move a pawn); there are no wagers anywhere.
 */

/** One die with `sides` faces (default 6): 1..sides. */
export function rollDie(rng: Rng, sides = 6): number {
  return rng.int(1, sides);
}

/** Two independent dice. */
export function rollTwoDice(rng: Rng, sides = 6): [number, number] {
  const a = rollDie(rng, sides);
  return [a, rollDie(rng, sides)];
}

/** Sum of `n` dice. */
export function rollSum(rng: Rng, n: number, sides = 6): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += rollDie(rng, sides);
  return total;
}

/**
 * "Pick one of two": roll two dice and let the player (or a CPU) keep one.
 * The choice is plain data so it can sit inside a serializable game state.
 */
export interface DiceChoice {
  options: readonly [number, number];
}

export const rollChoice = (rng: Rng, sides = 6): DiceChoice => ({
  options: rollTwoDice(rng, sides),
});

/** The die at `index` (0 or 1). Throws on any other index so a bad UI call never goes unnoticed. */
export function takeChoice(choice: DiceChoice, index: number): number {
  if (index !== 0 && index !== 1) throw new RangeError(`dice choice index must be 0 or 1`);
  return choice.options[index];
}

/** Every outcome of one die with its probability, for expectation maths in CPU brains. */
export const dieOutcomes = (sides = 6): readonly number[] =>
  Array.from({ length: sides }, (_, i) => i + 1);
