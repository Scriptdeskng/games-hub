import type { Difficulty } from '../rules/config';
import type { Zone } from '../physics';

/**
 * How a CPU keeper decides. It does not know where the shot will end: it either GUESSES before it can see
 * anything (weighted by the human's favourite corners, `bias`) or READS the ball's TRUE position at
 * `react` seconds after the strike and extrapolates a straight line (so a curve fools it).
 */
export interface KeeperProfile {
  /** seconds after the strike when it first sees the ball (its reaction time) */
  react: number;
  /** extra seconds to start moving once it has decided */
  lag: number;
  /** metres of noise on what it sees (amplified by 1 / progress when it extrapolates) */
  noise: number;
  /** chance that it reads the ball instead of guessing */
  read: number;
  /** 0 guesses uniformly, 1 follows the human's history of corners */
  bias: number;
  /** when a guess dive starts, seconds after the strike (negative: before the ball is hit) */
  guessStart: number;
  /** chance that it does not dive at all */
  stay: number;
  /** seconds after `react` of a second look (0: one look, a straight-line guess); two looks tell a curl from a straight ball */
  look: number;
  /** how much one shot seen in this match counts in its picture of where the human shoots */
  seenWeight: number;
}

export const KEEPER: Readonly<Record<Difficulty, KeeperProfile>> = {
  easy: {
    react: 0.3,
    lag: 0.06,
    noise: 0.5,
    read: 0.2,
    bias: 0,
    guessStart: 0.1,
    stay: 0.2,
    look: 0,
    seenWeight: 1.5,
  },
  medium: {
    react: 0.2,
    lag: 0.04,
    noise: 0.3,
    read: 0.2,
    bias: 0.6,
    guessStart: 0.07,
    stay: 0.04,
    look: 0,
    seenWeight: 1.5,
  },
  hard: {
    react: 0.12,
    lag: 0.03,
    noise: 0.15,
    read: 0.33,
    bias: 0.95,
    guessStart: 0.04,
    stay: 0,
    look: 0.1,
    seenWeight: 4,
  },
};

/** How a CPU striker aims: which zones, how close to the post, how hard, and how much it varies. */
export interface StrikerProfile {
  weights: Readonly<Record<Zone, number>>;
  /** aim x of a side zone, metres (the post is at 3.66) */
  sideX: number;
  lowY: number;
  highY: number;
  /** power range */
  powerLo: number;
  powerHi: number;
  /** extra aim jitter in metres, on top of the physics scatter */
  jitter: number;
  /** chance of curling the shot */
  curve: number;
  /** a zone used this many kicks ago is weighted down by this factor each time (anti-exploit) */
  repeatPenalty: number;
}

export const STRIKER: Readonly<Record<Difficulty, StrikerProfile>> = {
  easy: {
    weights: { ul: 1.5, u: 1, ur: 1.5, dl: 2, d: 1, dr: 2 },
    sideX: 2.5,
    lowY: 0.6,
    highY: 1.5,
    powerLo: 0.45,
    powerHi: 0.72,
    jitter: 0.45,
    curve: 0,
    repeatPenalty: 1,
  },
  medium: {
    weights: { ul: 2.2, u: 1, ur: 2.2, dl: 1.6, d: 0.8, dr: 1.6 },
    sideX: 2.8,
    lowY: 0.4,
    highY: 1.95,
    powerLo: 0.45,
    powerHi: 0.7,
    jitter: 0.2,
    curve: 0.15,
    repeatPenalty: 0.5,
  },
  hard: {
    weights: { ul: 2, u: 1, ur: 2, dl: 2, d: 0.8, dr: 2 },
    sideX: 3.25,
    lowY: 0.35,
    highY: 2.0,
    powerLo: 0.52,
    powerHi: 0.78,
    jitter: 0.05,
    curve: 0.6,
    repeatPenalty: 0.35,
  },
};
