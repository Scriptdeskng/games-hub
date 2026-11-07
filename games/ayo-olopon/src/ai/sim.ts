import { createCpu } from '@naija/core/ai-kit';
import type { Difficulty } from '@naija/core/ui-kit';
import { DEFAULT_RULES, type Rules } from '../rules/config';
import {
  apply,
  createGame,
  isLegal,
  isOver,
  type Action,
  type GameState,
  type Side,
} from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { personaById } from './personas';

export interface SimResult {
  /** 0 or 1 (the first seat is `a`), or null for a draw */
  winner: Side | null;
  plies: number;
  /** moves that were not legal (must always be 0) */
  illegal: number;
  state: GameState;
}

/**
 * Play one full game, every seat controlled by a CPU brain (no UI, no timers). `seats[0]` sits
 * at the human side, `seats[1]` at the CPU side; `first` picks who moves first.
 */
export function simulate(o: {
  seed: number;
  seats: readonly [Difficulty, Difficulty];
  rules?: Partial<Rules>;
  first?: Side;
}): SimResult {
  let s = createGame({
    seed: o.seed,
    human: { id: 'a', name: 'A' },
    cpu: { id: 'b', name: 'B' },
    rules: { ...DEFAULT_RULES, ...o.rules },
    first: o.first ?? 0,
  });
  const cpus = o.seats.map((difficulty, i) =>
    createCpu<GameState, Action>({
      id: i === 0 ? 'a' : 'b',
      persona: personaById('efe'),
      difficulty,
      seed: (o.seed * 31 + i * 7919 + 1) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() },
    }),
  );
  let illegal = 0;
  while (!isOver(s)) {
    const a = cpus[s.turns.index]!.decide(s);
    if (!isLegal(s, a.pit)) {
      illegal++;
      break;
    }
    s = apply(s, a);
  }
  const winner = s.winner === null ? null : s.winner === 'a' ? 0 : 1;
  return { winner, plies: s.plies, illegal, state: s };
}

export interface MatchStats {
  games: number;
  /** wins of seat `a` */
  wins: number;
  draws: number;
  losses: number;
  /** wins / games */
  rate: number;
  /** 95% Wilson score interval for the win rate (draws count as not winning) */
  lo: number;
  hi: number;
  illegal: number;
  /** mean moves per game */
  avgPlies: number;
}

/** Wilson score interval: a proper confidence interval for a win rate. */
export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: (c - m) / d, hi: (c + m) / d };
}

/** `a` against `b` over `games` seeded games; the first mover alternates. */
export function headToHead(
  a: Difficulty,
  b: Difficulty,
  games: number,
  o: { seed?: number; rules?: Partial<Rules> } = {},
): MatchStats {
  let wins = 0;
  let draws = 0;
  let illegal = 0;
  let plies = 0;
  for (let i = 0; i < games; i++) {
    // `a` sits at seat 0 in even games and at seat 1 in odd games, so neither side owns the board
    const flip = i % 2 === 1;
    const r = simulate({
      seed: (o.seed ?? 1000) + i,
      seats: flip ? [b, a] : [a, b],
      rules: o.rules,
      first: (i % 4 < 2 ? 0 : 1) as Side,
    });
    illegal += r.illegal;
    plies += r.plies;
    if (r.winner === null) draws++;
    else if ((r.winner === 0) !== flip) wins++;
  }
  return {
    games,
    wins,
    draws,
    losses: games - wins - draws,
    rate: wins / games,
    ...wilson(wins, games),
    illegal,
    avgPlies: plies / games,
  };
}

/** Combine the stats of several runs (a long match is played in chunks so the event loop can breathe). */
export function mergeStats(parts: readonly MatchStats[]): MatchStats {
  const games = parts.reduce((n, p) => n + p.games, 0);
  const wins = parts.reduce((n, p) => n + p.wins, 0);
  const draws = parts.reduce((n, p) => n + p.draws, 0);
  return {
    games,
    wins,
    draws,
    losses: games - wins - draws,
    rate: wins / games,
    ...wilson(wins, games),
    illegal: parts.reduce((n, p) => n + p.illegal, 0),
    avgPlies: parts.reduce((n, p) => n + p.avgPlies * p.games, 0) / games,
  };
}
