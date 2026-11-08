import type { Difficulty } from '@naija/core/ui-kit';
import { createRng } from '@naija/core/rng';
import { DEFAULT_RULES, type Rules } from '../rules/config';
import { apply, createGame, isOver, turnsOf, type GameState } from '../rules/engine';
import { viewFor } from '../rules/view';
import { brainsFor } from './brains';
import type { Style } from './personas';

export interface SimResult {
  winner: number;
  turns: number;
  total: number;
  state: GameState;
  /** actions that threw (must be 0) */
  illegal: number;
}

/** One full game, every seat a CPU of the given difficulty (no UI, no timers). */
export function simulate(o: {
  seed: number;
  seats: readonly Difficulty[];
  styles?: readonly Style[];
  rules?: Partial<Rules>;
  first?: number;
}): SimResult {
  const rules = { ...DEFAULT_RULES, ...o.rules };
  const ids = o.seats.map((_, i) => `s${i}`);
  let s = createGame({
    seed: o.seed,
    human: { id: 's0', name: 'A' },
    cpus: ids.slice(1).map((id) => ({ id, name: id })),
    rules,
    first: o.first ?? 0,
  });
  const brains = o.seats.map((d, i) => brainsFor(o.styles?.[i] ?? 'balanced')[d]);
  const rngs = o.seats.map((_, i) => createRng((o.seed * 31 + i * 7919 + 1) >>> 0));
  let illegal = 0;
  for (let g = 0; !isOver(s) && g < 20000; g++) {
    const i = s.turns.index;
    try {
      s = apply(s, brains[i]!.decide(viewFor(s, i), rngs[i]!));
    } catch {
      illegal++;
      break;
    }
  }
  if (!isOver(s) && illegal === 0) throw new Error(`simulated game ${o.seed} did not finish`);
  const winner = ids.indexOf(s.winner as string);
  return { winner, turns: turnsOf(s, s.winner as string), total: s.turns.turn, state: s, illegal };
}

export interface MatchStats {
  games: number;
  wins: number;
  rate: number;
  lo: number;
  hi: number;
  avgTurns: number;
  illegal: number;
}

export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: (c - m) / d, hi: (c + m) / d };
}

/** Seat 0 (`a`) against the other seats over `games` seeded games, rotating who starts. */
export function headToHead(
  a: Difficulty,
  rest: readonly Difficulty[],
  games: number,
  o: { seed?: number; rules?: Partial<Rules>; styles?: readonly Style[] } = {},
): MatchStats {
  let wins = 0;
  let turns = 0;
  let illegal = 0;
  for (let i = 0; i < games; i++) {
    const r = simulate({
      seed: (o.seed ?? 1000) + i,
      seats: [a, ...rest],
      styles: o.styles,
      rules: o.rules,
      first: i % (rest.length + 1),
    });
    if (r.winner === 0) wins++;
    turns += r.total;
    illegal += r.illegal;
  }
  return {
    games,
    wins,
    rate: wins / games,
    ...wilson(wins, games),
    avgTurns: turns / games,
    illegal,
  };
}
