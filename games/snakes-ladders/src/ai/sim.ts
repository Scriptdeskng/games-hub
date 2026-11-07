import { createCpu } from '@naija/core/ai-kit';
import type { Difficulty } from '@naija/core/ui-kit';
import { DEFAULT_RULES, type Rules } from '../rules/config';
import { apply, createGame, isOver, turnsOf, type Action, type GameState } from '../rules/engine';
import { createHardBrain, easyBrain, mediumBrain } from './brains';
import { personaById } from './personas';

export interface SimResult {
  /** index into `seats` of the winner */
  winner: number;
  /** the winner's own turns */
  turns: number;
}

/**
 * Play one full game with every seat controlled by a CPU of the given difficulty (no UI, no
 * timers). Used by the tests to measure how much stronger each level is. `first` picks who starts.
 */
export function simulate(o: {
  seed: number;
  seats: readonly Difficulty[];
  rules?: Partial<Rules>;
  first?: number;
}): SimResult {
  const rules = { ...DEFAULT_RULES, ...o.rules };
  const seatIds = o.seats.map((_, i) => `s${i}`);
  let s: GameState = createGame({
    seed: o.seed,
    human: { id: seatIds[0] as string, name: 'A' },
    cpus: seatIds.slice(1).map((id) => ({ id, name: id })) as [{ id: string; name: string }],
    rules,
  });
  const cpus = o.seats.map((difficulty, i) =>
    createCpu<GameState, Action>({
      id: seatIds[i] as string,
      persona: personaById('tari'),
      difficulty,
      seed: (o.seed * 31 + i * 7919 + 1) >>> 0,
      brains: { easy: easyBrain, medium: mediumBrain, hard: createHardBrain() },
    }),
  );
  // rotate the start so the first-move advantage is shared out
  const startIndex = o.first ?? 0;
  s = { ...s, turns: { ...s.turns, index: startIndex } };
  for (let guard = 0; !isOver(s) && guard < 20000; guard++) {
    const who = s.turns.index;
    s = apply(s, (cpus[who] as (typeof cpus)[number]).decide(s));
  }
  const winner = seatIds.indexOf(s.winner as string);
  return { winner, turns: turnsOf(s, s.winner as string) };
}

export interface MatchStats {
  games: number;
  /** wins of seat 0 */
  wins: number;
  rate: number;
  /** 95% Wilson score interval for the win rate */
  lo: number;
  hi: number;
  avgTurns: number;
}

/** Wilson score interval: a proper confidence interval for a win rate (not the normal approximation). */
export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: (c - m) / d, hi: (c + m) / d };
}

/** Seat 0 (`a`) against seat 1 (`b`) over `games` seeded games, alternating who starts. */
export function headToHead(
  a: Difficulty,
  b: Difficulty,
  games: number,
  o: { seed?: number; rules?: Partial<Rules> } = {},
): MatchStats {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < games; i++) {
    const r = simulate({
      seed: (o.seed ?? 1000) + i,
      seats: [a, b],
      rules: o.rules,
      first: i % 2,
    });
    if (r.winner === 0) wins++;
    turns += r.turns;
  }
  return { games, wins, rate: wins / games, ...wilson(wins, games), avgTurns: turns / games };
}
