import { createRng, type Rng } from '@naija/core/rng';
import {
  BALL_START_Y,
  ZONES,
  ZONE_CENTER,
  nearestZone,
  poseInto,
  type KeeperPlan,
  type Shot,
  type ShotInput,
  type Zone,
} from '../physics';
import type { Difficulty, Side } from '../rules/config';
import { noteShot } from '../rules/progress';
import { createShootout, launch, settle, type Shootout } from '../rules/shootout';
import type { TeamId } from '../rules/teams';
import { aiRng, decideKeeper } from './keeper';
import { decideStriker } from './striker';

/** One side's brain: what it shoots when it is up, how it dives when the other side is up. */
export interface Controller {
  shoot(s: Shootout, kick: number): ShotInput;
  keep(s: Shootout, shot: Shot, kick: number): KeeperPlan;
}

const NO_HABIT: Readonly<Record<Zone, number>> = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 };

/** The CPU rival of a difficulty: keeper and striker, each a pure function of the shootout so far. */
export function cpuController(
  d: Difficulty,
  mySide: Side,
  habit: Readonly<Record<Zone, number>> = NO_HABIT,
): Controller {
  return {
    shoot: (s, k) =>
      decideStriker(
        { difficulty: d, own: s.kicks.filter((x) => x.side === mySide) },
        aiRng(s.seed, k, 2 + mySide),
      ),
    keep: (s, shot, k) =>
      decideKeeper(
        { difficulty: d, shot, habit, seen: s.kicks.filter((x) => x.side !== mySide) },
        aiRng(s.seed, k, 4 + mySide),
      ),
  };
}

/** A scripted human: fixed skill, no UI. Used by the simulations, the autoplay test hook and the soak. */
export interface HumanBot {
  shoot(kick: number, rng: Rng): ShotInput;
  /** `shot` is the struck ball: a human keeper may look at it (only at his own reaction time, via `reactKeeper`) */
  dive(kick: number, rng: Rng, shot?: Shot): KeeperPlan;
}

/** A human with favourite corners (`weights`, per zone) who always hits it sweetly and dives by pure guess. */
export function createBot(
  opts: {
    weights?: Readonly<Record<Zone, number>>;
    power?: number;
    diveStart?: number;
    sideX?: number;
  } = {},
): HumanBot {
  const w = opts.weights ?? { ul: 3, u: 0.5, ur: 3, dl: 1.5, d: 0.5, dr: 1.5 };
  const power = opts.power ?? 0.62;
  const sideX = opts.sideX ?? 2.9;
  return {
    shoot(_k, rng) {
      let total = 0;
      for (const z of ZONES) total += w[z];
      let u = rng.next() * total;
      let zone: Zone = 'u';
      for (const z of ZONES) {
        u -= w[z];
        if (u < 0) {
          zone = z;
          break;
        }
      }
      const c = ZONE_CENTER[zone];
      return {
        aimX: c.x === 0 ? 0 : Math.sign(c.x) * sideX,
        aimY: c.y > 1 ? 1.95 : 0.4,
        power,
        curve: 0,
      };
    },
    dive: (_k, rng) => ({
      zone: ZONES[rng.int(0, ZONES.length - 1)] as Zone,
      startT: opts.diveStart ?? 0.02,
    }),
  };
}

export function botController(bot: HumanBot, seed: number): Controller {
  const rng = createRng(seed ^ 0x600d);
  return { shoot: (_s, k) => bot.shoot(k, rng), keep: (_s, shot, k) => bot.dive(k, rng, shot) };
}

/** Play one whole shootout on the engine between two controllers (side 0 and side 1). */
export function simulate(
  seed: number,
  c: readonly [Controller, Controller],
  teams: readonly [TeamId, TeamId] = ['lanterns', 'sparks'],
  first?: Side,
): Shootout {
  let s = createShootout({ seed, teams, first });
  for (let i = 0; i < 400 && s.status === 'playing'; i++) {
    const k = s.kicks.length;
    const striker = s.turn;
    const keeper: Side = striker === 0 ? 1 : 0;
    const l = launch(s, c[striker].shoot(s, k));
    s = settle(l.state, l.shot, c[keeper].keep(s, l.shot, k)).state;
  }
  return s;
}

/** The human bot (side 0) against the CPU rival of `difficulty` (side 1). */
export const simulateShootout = (o: {
  seed: number;
  difficulty: Difficulty;
  human: HumanBot;
  habit?: Readonly<Record<Zone, number>>;
}): Shootout =>
  simulate(o.seed, [botController(o.human, o.seed), cpuController(o.difficulty, 1, o.habit)]);

/** Share of the bot's kicks that the CPU keeper of `d` saves (the bot is the fixed reference striker). */
export function keeperSaveRate(d: Difficulty, games: number, bot: HumanBot = createBot()): number {
  let saved = 0;
  let kicks = 0;
  for (let i = 1; i <= games; i++) {
    for (const k of simulateShootout({ seed: i, difficulty: d, human: bot }).kicks) {
      if (k.side !== 0) continue;
      kicks++;
      if (k.outcome === 'saved') saved++;
    }
  }
  return saved / kicks;
}

/**
 * Share of kicks the CPU striker of `d` scores against a fixed reference keeper (the Medium keeper,
 * which reads the striker's history). Five kicks per game, the striker always kicking.
 */
export function strikerGoalRate(d: Difficulty, games: number): number {
  const ref = cpuController('medium', 0);
  const me = cpuController(d, 1);
  let goals = 0;
  let kicks = 0;
  for (let i = 1; i <= games; i++) {
    let s = createShootout({ seed: i, teams: ['lanterns', 'sparks'], first: 1 });
    for (let k = 0; k < 5; k++) {
      s = { ...s, turn: 1, status: 'playing' };
      const l = launch(s, me.shoot(s, k));
      const r = settle(l.state, l.shot, ref.keep(s, l.shot, k));
      s = r.state;
      kicks++;
      if (r.record.outcome === 'goal') goals++;
    }
  }
  return goals / kicks;
}

/** A human who always shoots the same placement (the QA "one repeated placement" probe). */
export const fixedBot = (input: ShotInput, keeper: HumanBot['dive'] = guessKeeper()): HumanBot => ({
  shoot: () => ({ ...input }),
  dive: keeper,
});

/** A human keeper who guesses a zone at random at `start` seconds after the strike. */
export const guessKeeper =
  (start = 0.02): HumanBot['dive'] =>
  (_k, rng) => ({
    zone: ZONES[rng.int(0, ZONES.length - 1)] as Zone,
    startT: start,
  });

/**
 * A human keeper who watches the ball: at `react` seconds he sees its real position, extrapolates a straight line and dives
 * to the nearest zone (about 0.05 s later). 0.25 s is a typical quick human; Hard's own read is 0.12 s.
 */
export const reactKeeper =
  (react = 0.25): HumanBot['dive'] =>
  (_k, rng, shot) => {
    if (!shot) return { zone: null, startT: 0 };
    const o = poseInto(shot, react, { x: 0, y: 0, s: 0 });
    const s = Math.max(o.s, 0.05);
    return {
      zone: nearestZone(o.x / s, BALL_START_Y + (o.y - BALL_START_Y) / s),
      startT: react + 0.05 + rng.next() * 0.02,
    };
  };

/** Eight named placements (kept for quick checks and the README). */
export const PLACEMENTS: readonly { name: string; input: ShotInput }[] = [
  { name: 'outer low post left', input: { aimX: -3.2, aimY: 0.5, power: 0.6, curve: 0 } },
  { name: 'outer low post right', input: { aimX: 3.2, aimY: 0.5, power: 0.6, curve: 0 } },
  { name: 'inner post left', input: { aimX: -2.4, aimY: 0.5, power: 0.6, curve: 0 } },
  { name: 'inner post right', input: { aimX: 2.4, aimY: 0.5, power: 0.6, curve: 0 } },
  { name: 'top corner left', input: { aimX: -3.0, aimY: 2.0, power: 0.6, curve: 0 } },
  { name: 'top corner right', input: { aimX: 3.0, aimY: 2.0, power: 0.6, curve: 0 } },
  { name: 'centre low', input: { aimX: 0, aimY: 0.5, power: 0.6, curve: 0 } },
  { name: 'centre high', input: { aimX: 0, aimY: 1.6, power: 0.6, curve: 0 } },
];

/**
 * Win rate of a human who repeats one placement every kick against the rival of `d`. With `learn` > 0 the CPU
 * keeper first plays that many matches and keeps the habit it learns (decayed counts, as saved progress does).
 */
export function placementWinRate(
  d: Difficulty,
  input: ShotInput,
  games: number,
  learn = 0,
  keeper?: HumanBot['dive'],
): number {
  const bot = fixedBot(input, keeper);
  let habit = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 } as Record<Zone, number>;
  for (let i = 1; i <= learn; i++) {
    const s = simulateShootout({ seed: 90000 + i, difficulty: d, human: bot, habit });
    for (const k of s.kicks) if (k.side === 0) habit = noteShot(habit, k.zone);
  }
  let w = 0;
  for (let i = 1; i <= games; i++)
    if (simulateShootout({ seed: i, difficulty: d, human: bot, habit }).winner === 0) w++;
  return w / games;
}

/** A full grid of single placements: `xs` x `ys`, power {0.45, 0.6, 0.8} straight, plus one curved variant (power 0.6, curve 0.6). */
export function placementGrid(
  xs: readonly number[],
  ys: readonly number[],
): { name: string; input: ShotInput }[] {
  const out: { name: string; input: ShotInput }[] = [];
  for (const x of xs)
    for (const y of ys)
      for (const [power, curve] of [
        [0.45, 0],
        [0.6, 0],
        [0.8, 0],
        [0.6, 0.6],
      ] as const)
        out.push({
          name: `x${x} y${y} p${power} c${curve}`,
          input: { aimX: x, aimY: y, power, curve },
        });
  return out;
}

/** The best (highest win rate) single placement of a grid against a rival, with the keeper reacting at `react` seconds. */
export function bestPlacement(
  d: Difficulty,
  grid: readonly { name: string; input: ShotInput }[],
  games: number,
  learn: number,
  react: number,
): { name: string; rate: number } {
  let best = { name: '', rate: -1 };
  for (const g of grid) {
    const rate = placementWinRate(d, g.input, games, learn, reactKeeper(react));
    if (rate > best.rate) best = { name: g.name, rate };
  }
  return best;
}
