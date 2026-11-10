import { createRng } from '@naija/core/rng';
import {
  SWEET_ZONE,
  makeShot,
  resolveKick,
  zoneOf,
  type Impact,
  type KeeperPlan,
  type KickOutcome,
  type PowerZone,
  type Shot,
  type ShotInput,
  type Zone,
} from '../physics';
import { KICKS, type Side } from './config';
import type { TeamId } from './teams';

/** One kick, as kept in the record. Small and serialisable. */
export interface KickRecord {
  side: Side;
  outcome: KickOutcome;
  impact: Impact;
  /** the zone the ball went to */
  zone: Zone;
  power: PowerZone;
  /** -1 left, 0 straight, 1 right */
  curve: -1 | 0 | 1;
  /** the zone the keeper dived to (null: he stayed) */
  dive: Zone | null;
}

export interface Shootout {
  seed: number;
  /** state of the seeded RNG (scatter draws and the coin toss) */
  rng: number;
  teams: readonly [TeamId, TeamId];
  first: Side;
  kicks: KickRecord[];
  goals: [number, number];
  taken: [number, number];
  /** kicks each side takes in the current stage: 5, then one more for every sudden-death round */
  quota: number;
  /** the side that kicks next */
  turn: Side;
  status: 'playing' | 'over';
  winner: Side | null;
  /** the shootout ended while a side still had kicks left */
  early: boolean;
}

export interface ShootoutOptions {
  seed: number;
  teams: readonly [TeamId, TeamId];
  /** who kicks first (default: a seeded coin toss) */
  first?: Side;
}

export function createShootout(o: ShootoutOptions): Shootout {
  const rng = createRng(o.seed);
  const first: Side = o.first ?? (rng.chance(0.5) ? 0 : 1);
  return {
    seed: o.seed >>> 0,
    rng: rng.getState(),
    teams: o.teams,
    first,
    kicks: [],
    goals: [0, 0],
    taken: [0, 0],
    quota: KICKS,
    turn: first,
    status: 'playing',
    winner: null,
    early: false,
  };
}

export const isOver = (s: Shootout): boolean => s.status === 'over';
export const isSudden = (s: Shootout): boolean => s.quota > KICKS;
/** Completed sudden-death rounds. */
export const suddenRounds = (s: Shootout): number => Math.max(0, s.quota - KICKS);
export const other = (side: Side): Side => (side === 0 ? 1 : 0);

/** The shot for the side that is up. Draws the scatter from the shootout's seeded RNG. */
export function launch(s: Shootout, input: Partial<ShotInput>): { state: Shootout; shot: Shot } {
  const rng = createRng(s.rng);
  const shot = makeShot(input, rng);
  return { state: { ...s, rng: rng.getState() }, shot };
}

export const curveClass = (c: number): -1 | 0 | 1 => (c <= -0.25 ? -1 : c >= 0.25 ? 1 : 0);

/** Physics decides the kick, then the record is applied. */
export function settle(
  s: Shootout,
  shot: Shot,
  plan: KeeperPlan,
): { state: Shootout; record: KickRecord } {
  const res = resolveKick(shot, plan);
  const record: KickRecord = {
    side: s.turn,
    outcome: res.outcome,
    impact: res.impact,
    zone: zoneOf(shot.tx, shot.ty),
    power: shot.zone,
    curve: curveClass(shot.curve),
    dive: plan.zone,
  };
  return { state: applyKick(s, record), record };
}

/**
 * Apply one kick: count it, then check for the end. A side wins early when the other can no longer
 * catch up with the kicks it has left (standard rules). When both have taken all their kicks and
 * the score is level, sudden death adds one kick each; it ends after any round that is not level.
 */
export function applyKick(s: Shootout, k: KickRecord): Shootout {
  if (s.status === 'over') return s;
  const side = s.turn;
  const goals: [number, number] = [s.goals[0], s.goals[1]];
  const taken: [number, number] = [s.taken[0], s.taken[1]];
  taken[side]++;
  if (k.outcome === 'goal') goals[side]++;
  let quota = s.quota;
  const left = (x: Side): number => quota - taken[x];
  let winner: Side | null = null;
  let over = false;
  let early = false;
  if (goals[0] > goals[1] + left(1)) winner = 0;
  else if (goals[1] > goals[0] + left(0)) winner = 1;
  if (winner !== null) {
    over = true;
    early = left(0) + left(1) > 0;
  } else if (left(0) === 0 && left(1) === 0) {
    quota++; // level after every kick: sudden death
  }
  const turn: Side = taken[0] === taken[1] ? s.first : other(s.first);
  return {
    ...s,
    kicks: [...s.kicks, { ...k, side }],
    goals,
    taken,
    quota,
    turn,
    status: over ? 'over' : 'playing',
    winner,
    early,
  };
}

/** The five slots of one side's row on the scoreboard (the first five kicks; later rounds show in the total). */
export type Slot = KickOutcome | 'pending' | 'next';
export function slotsOf(s: Shootout, side: Side): Slot[] {
  const mine = s.kicks.filter((k) => k.side === side);
  const out: Slot[] = [];
  for (let i = 0; i < KICKS; i++) {
    const k = mine[i];
    if (k) out.push(k.outcome);
    else
      out.push(s.status === 'playing' && s.turn === side && i === mine.length ? 'next' : 'pending');
  }
  return out;
}

export const saves = (s: Shootout, side: Side): number =>
  s.kicks.filter((k) => k.side !== side && k.outcome === 'saved').length;
export const sweetGoals = (s: Shootout, side: Side): number =>
  s.kicks.filter((k) => k.side === side && k.outcome === 'goal' && k.power === SWEET_ZONE).length;
