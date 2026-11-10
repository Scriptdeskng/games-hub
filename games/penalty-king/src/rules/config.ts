export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/** cup: eight-team knockout; quick: one shootout against a chosen rival; practice: striker only, unscored. */
export type Mode = 'cup' | 'quick' | 'practice';
export const MODES: readonly Mode[] = ['cup', 'quick', 'practice'];

/** Kicks each side takes before sudden death. */
export const KICKS = 5;
/** Side 0 is always the human's team, side 1 the CPU's. */
export type Side = 0 | 1;

/** The rival who plays each level (asset brief section 6). */
export const PERSONA_OF: Readonly<Record<Difficulty, string>> = {
  easy: 'ozavize',
  medium: 'ndako',
  hard: 'hamman',
};

export const isDifficulty = (d: unknown): d is Difficulty => DIFFICULTIES.includes(d as Difficulty);
export const isMode = (m: unknown): m is Mode => MODES.includes(m as Mode);
