import { createRng, type Rng } from '@naija/core/rng';
import {
  ZONES,
  ZONE_CENTER,
  type KeeperPlan,
  type Shot,
  type ShotInput,
  type Zone,
} from '../physics';
import type { Difficulty, Side } from '../rules/config';
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
  dive(kick: number, rng: Rng): KeeperPlan;
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
  return { shoot: (_s, k) => bot.shoot(k, rng), keep: (_s, _shot, k) => bot.dive(k, rng) };
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
