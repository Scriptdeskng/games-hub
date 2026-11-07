import type { Rng } from '../rng';
import type { Difficulty } from '../ui-kit/difficulty';

/** `Difficulty` and `DIFFICULTIES` live in ui-kit (the picker) and are reused here. */

/**
 * What a game can say through a persona's bubble. A game picks its own event names; these are
 * the conventional ones: `start`, `good` / `bad` (this CPU had a good or bad turn),
 * `humanGood` / `humanBad`, `idle` (chatter while the player thinks), `win` (this CPU won) and
 * `lose` (the human won).
 */
export type BanterEvent = string;

/** A named CPU character. All text lives in i18n; this is data only. */
export interface Persona {
  id: string;
  /** i18n key of the display name */
  nameKey: string;
  /** URL of the avatar image (SVG), relative to the game page */
  avatar: string;
  /** thinking delay range in ms; clamped to 400..1200 (default 400..1200) */
  think?: readonly [number, number];
  /** banter lines per event: lists of i18n keys */
  banter: Partial<Record<BanterEvent, readonly string[]>>;
}

/**
 * Generic difficulty profile. Games read what they need; the numbers are shared so "Easy"
 * means the same kind of thing everywhere.
 */
export interface DifficultyProfile {
  /** 0 = chooses at random, 1 = perfect play */
  skill: number;
  /** chance of replacing the best option with a random one, per decision */
  mistakeRate: number;
  /** multiplier on the thinking delay (Hard thinks a little longer) */
  thinkScale: number;
}

export const PROFILES: Readonly<Record<Difficulty, DifficultyProfile>> = {
  easy: { skill: 0, mistakeRate: 1, thinkScale: 0.8 },
  medium: { skill: 0.6, mistakeRate: 0.2, thinkScale: 1 },
  hard: { skill: 1, mistakeRate: 0, thinkScale: 1.1 },
};

export const isDifficulty = (v: unknown): v is Difficulty =>
  v === 'easy' || v === 'medium' || v === 'hard';

/**
 * A CPU opponent's brain for one kind of decision: pure, deterministic given the rng.
 * `Ctx` is whatever the game gives it (usually the game state plus the options).
 */
export interface Brain<Ctx, Decision> {
  decide(ctx: Ctx, rng: Rng): Decision;
}

/** A seated CPU opponent: persona + difficulty + brains. */
export interface CpuOpponent<Ctx, Decision> {
  readonly id: string;
  readonly persona: Persona;
  readonly difficulty: Difficulty;
  readonly profile: DifficultyProfile;
  decide(ctx: Ctx): Decision;
  /** how long to "think" before acting, in ms (seeded) */
  thinkMs(): number;
  /** the opponent's own rng state, for save/restore */
  getRngState(): number;
}
