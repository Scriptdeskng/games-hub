import { createCpu } from '@naija/core/ai-kit';
import type { Difficulty } from '@naija/core/ui-kit';
import { DEFAULT_RULES, type Rules } from '../rules/config';
import { apply, createGame, isOver, turnsOf, type Action, type GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { personaById } from './personas';

export interface SimResult {
  /** index into `seats` of the winner */
  winner: number;
  /** the winner's own rolls */
  turns: number;
  /** total rolls by everybody */
  total: number;
}

/**
 * Play one full game with every seat controlled by a CPU of the given difficulty (no UI, no
 * timers). 2 seats sit opposite each other, 4 seats fill the board. `first` picks who starts.
 */
export function simulate(o: {
  seed: number;
  seats: readonly Difficulty[];
  rules?: Partial<Rules>;
  first?: number;
}): SimResult {
  const rules = { ...DEFAULT_RULES, ...o.rules };
  const ids = o.seats.map((_, i) => `s${i}`);
  let s: GameState = createGame({
    seed: o.seed,
    human: { id: ids[0] as string, name: 'A' },
    cpus: ids.slice(1).map((id) => ({ id, name: id })) as [{ id: string; name: string }],
    rules,
  });
  const cpus = o.seats.map((difficulty, i) =>
    createCpu<GameState, Action>({
      id: ids[i] as string,
      persona: personaById('funmi'),
      difficulty,
      seed: (o.seed * 31 + i * 7919 + 1) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() },
    }),
  );
  s = { ...s, turns: { ...s.turns, index: o.first ?? 0 } };
  for (let guard = 0; !isOver(s) && guard < 50000; guard++) {
    s = apply(s, (cpus[s.turns.index] as (typeof cpus)[number]).decide(s));
  }
  if (!isOver(s)) throw new Error(`simulated game ${o.seed} did not finish`);
  const winner = ids.indexOf(s.winner as string);
  return { winner, turns: turnsOf(s, s.winner as string), total: s.turns.turn };
}

export interface MatchStats {
  games: number;
  /** wins of seat 0 */
  wins: number;
  rate: number;
  /** 95% Wilson score interval for the win rate */
  lo: number;
  hi: number;
  /** mean rolls by the winner */
  avgTurns: number;
}

/** Wilson score interval: a proper confidence interval for a win rate. */
export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: (c - m) / d, hi: (c + m) / d };
}

/** Seat 0 (`a`) against the other seats (`rest`) over `games` seeded games, rotating who starts. */
export function headToHead(
  a: Difficulty,
  rest: readonly Difficulty[],
  games: number,
  o: { seed?: number; rules?: Partial<Rules> } = {},
): MatchStats {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < games; i++) {
    const r = simulate({
      seed: (o.seed ?? 1000) + i,
      seats: [a, ...rest],
      rules: o.rules,
      first: i % (rest.length + 1),
    });
    if (r.winner === 0) wins++;
    turns += r.turns;
  }
  return { games, wins, rate: wins / games, ...wilson(wins, games), avgTurns: turns / games };
}
