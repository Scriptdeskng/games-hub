import type { Difficulty } from '@naija/core/ui-kit';
import { DARK, LIGHT, type Side } from '../rules/board';
import type { Rules } from '../rules/config';
import { applyMove, createGame, isLegal, isOver, type GameState } from '../rules/engine';
import { decide, decisionSeed } from './decide';

export interface SimResult {
  /** LIGHT, DARK, or null for a draw */
  winner: Side | null;
  plies: number;
  /** moves the engine would have refused (must always be 0) */
  illegal: number;
  nodes: number;
  state: GameState;
}

/**
 * Play one whole game, both seats controlled by the CPU brains (no UI, no timers, no worker).
 * `budget` can lower the node budget of a seat (the 10x10 simulations cap the Hard seat).
 */
export function simulate(o: {
  seed: number;
  rules: Rules;
  light: Difficulty;
  dark: Difficulty;
  budget?: { light?: number; dark?: number };
}): SimResult {
  let s = createGame({ seed: o.seed, rules: o.rules });
  let illegal = 0;
  let nodes = 0;
  while (!isOver(s)) {
    const light = s.turn === LIGHT;
    const d = decide(
      s,
      light ? o.light : o.dark,
      decisionSeed(s.seed, s.plies),
      light ? o.budget?.light : o.budget?.dark,
    );
    nodes += d.nodes;
    if (!isLegal(s, d.move)) {
      illegal++;
      break;
    }
    s = applyMove(s, d.move);
  }
  return { winner: s.result?.winner ?? null, plies: s.plies, illegal, nodes, state: s };
}

export interface MatchStats {
  games: number;
  /** wins of `a` */
  wins: number;
  draws: number;
  losses: number;
  rate: number;
  /** 95% Wilson score interval for the win rate (draws count as not winning) */
  lo: number;
  hi: number;
  illegal: number;
  avgPlies: number;
  nodes: number;
}

/** Wilson score interval: a proper confidence interval for a win rate. */
export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: (c - m) / d, hi: (c + m) / d };
}

/**
 * `a` against `b` over `games` seeded games on `rules`: `a` plays light in even games and dark in
 * odd ones, so neither side owns the board. `nodes` lowers the node budget of `a` / `b`.
 */
export function headToHead(
  a: Difficulty,
  b: Difficulty,
  games: number,
  o: { rules: Rules; seed?: number; nodes?: { a?: number; b?: number } },
): MatchStats {
  let wins = 0;
  let draws = 0;
  let illegal = 0;
  let plies = 0;
  let nodes = 0;
  for (let i = 0; i < games; i++) {
    const aLight = i % 2 === 0;
    const r = simulate({
      seed: (o.seed ?? 1000) + i,
      rules: o.rules,
      light: aLight ? a : b,
      dark: aLight ? b : a,
      budget: aLight
        ? { light: o.nodes?.a, dark: o.nodes?.b }
        : { light: o.nodes?.b, dark: o.nodes?.a },
    });
    illegal += r.illegal;
    plies += r.plies;
    nodes += r.nodes;
    if (r.winner === null) draws++;
    else if ((r.winner === (aLight ? LIGHT : DARK)) === true) wins++;
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
    nodes,
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
    nodes: parts.reduce((n, p) => n + p.nodes, 0),
  };
}
