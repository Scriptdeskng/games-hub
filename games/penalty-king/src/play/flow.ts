import { thinkDelayMs } from '@naija/core/ai-kit';
import { createRng, type Rng } from '@naija/core/rng';
import { cpuController, personaFor, type Controller } from '../ai';
import {
  MOTOR_LAG,
  afterInto,
  keeperPoseInto,
  makeShot,
  poseInto,
  resolveKick,
  zoneOf,
  type KeeperPlan,
  type KeeperPose,
  type Pose,
  type Resolution,
  type Shot,
  type ShotInput,
  type Zone,
} from '../physics';
import type { Difficulty, Mode, Side } from '../rules/config';
import {
  createShootout,
  isOver,
  curveClass,
  isSudden,
  launch,
  settle,
  type KickRecord,
  type Shootout,
} from '../rules/shootout';
import type { TeamId } from '../rules/teams';

export type Phase = 'intro' | 'ready' | 'runup' | 'flight' | 'result' | 'done';

/** Seconds. The whole match is driven by `update(dt)`: no timers, so it is deterministic and testable with `advance(n)`. */
export const T = {
  intro: 1.1,
  runup: 0.7,
  /** a human keeper may still dive this long after the ball is struck */
  window: 0.25,
  result: 1.5,
  done: 1.6,
  /** the human has been slow to shoot */
  idle: 7,
} as const;

export interface FlowOptions {
  mode: Mode;
  difficulty: Difficulty;
  seed: number;
  teams: readonly [TeamId, TeamId];
  habit: Readonly<Record<Zone, number>>;
  first?: Side;
  /** the persona's think range is read from ai/personas; this switch skips the wait (tests) */
  instantCpu?: boolean;
  emit(e: FlowEvent): void;
}

export type FlowEvent =
  | { type: 'phase'; phase: Phase; striker: Side }
  | { type: 'runup'; striker: Side }
  | { type: 'strike'; shot: Shot; striker: Side }
  | { type: 'dive'; zone: Zone | null }
  | { type: 'impact'; record: KickRecord; striker: Side }
  | { type: 'sudden' }
  | { type: 'idle' }
  | { type: 'over'; winner: Side | null };

/** Everything the renderer needs, updated in place (no allocation per frame). */
export interface Frame {
  phase: Phase;
  striker: Side;
  /** seconds in this phase */
  phaseT: number;
  /** seconds since the strike (negative during the run-up) */
  t: number;
  /** seconds since the ball reached the goal plane (0 before) */
  impactT: number;
  ball: Pose;
  keeper: KeeperPose;
  keeperZone: Zone | null;
  shot: Shot | null;
  record: KickRecord | null;
}

export interface PracticeStats {
  kicks: number;
  goals: number;
  saves: number;
}

export interface Flow {
  readonly frame: Frame;
  update(dt: number): void;
  /** the human's shot (when the human is the striker and the ball is on the spot) */
  shoot(input: ShotInput): boolean;
  /** the human's dive (when the human is the keeper, from the whistle until a quarter second after the strike) */
  dive(zone: Zone): boolean;
  /**
   * Watchdog: move the match on. Returns false when it did nothing. Without `force` it never touches a kick in progress
   * (the run-up and the flight always involve the human: his committed shot, or his dive and the window to make one), and
   * never makes a human shoot. With `force` (the caller has seen the stall outlast its guard) it finishes the kick: a human
   * keeper's committed dive is used as it is, and an open window is closed (the kick records no dive).
   */
  skip(force?: boolean): boolean;
  state(): Shootout;
  practice(): PracticeStats;
  /** the human may act now */
  canShoot(): boolean;
  canDive(): boolean;
  readonly mode: Mode;
  readonly difficulty: Difficulty;
}

const HOLD_PLAN: KeeperPlan = { zone: null, startT: 0 };

export function createFlow(o: FlowOptions): Flow {
  const practice = o.mode === 'practice';
  let st = createShootout({ seed: o.seed, teams: o.teams, first: practice ? 0 : o.first });
  const stats: PracticeStats = { kicks: 0, goals: 0, saves: 0 };
  let pracKicks: KickRecord[] = [];
  const pracRng = createRng(o.seed ^ 0x51ed);
  const cpu: Controller = cpuController(o.difficulty, 1, o.habit);
  const persona = personaFor(o.difficulty);
  const thinkRng: Rng = createRng(o.seed ^ 0x7a1c);

  const frame: Frame = {
    phase: 'intro',
    striker: st.turn,
    phaseT: 0,
    t: -T.runup,
    impactT: 0,
    ball: { x: 0, y: 0.11, s: 0 },
    keeper: { x: 0, y: 1, p: 0 },
    keeperZone: null,
    shot: null,
    record: null,
  };
  let plan: KeeperPlan | null = null;
  /** the human is the keeper for this kick and has not dived yet */
  let humanKeeps = false;
  let thinkFor = 0;
  let res: Resolution | null = null;
  let idleSent = false;
  let doneSent = false;
  let diveSent = false;
  let kickNo = 0;

  const setPhase = (p: Phase): void => {
    frame.phase = p;
    frame.phaseT = 0;
    o.emit({ type: 'phase', phase: p, striker: frame.striker });
  };

  const beginReady = (): void => {
    frame.striker = practice ? 0 : st.turn;
    frame.shot = null;
    frame.record = null;
    frame.t = -T.runup;
    frame.impactT = 0;
    frame.keeperZone = null;
    frame.ball.x = 0;
    frame.ball.y = 0.11;
    frame.ball.s = 0;
    frame.keeper.x = 0;
    frame.keeper.y = 1;
    frame.keeper.p = 0;
    plan = null;
    res = null;
    idleSent = false;
    diveSent = false;
    thinkFor = frame.striker === 1 ? thinkDelayMs(thinkRng, persona) / 1000 : 0;
    setPhase('ready');
  };

  const pseudo = (): Shootout => (practice ? { ...st, kicks: pracKicks } : st);

  /** The kick begins: the shot is drawn from the seeded RNG, the CPU keeper decides, the striker runs up. */
  const startKick = (input: ShotInput): void => {
    let shot: Shot;
    if (practice) {
      shot = makeShot(input, pracRng);
    } else {
      const l = launch(st, input);
      st = l.state;
      shot = l.shot;
    }
    frame.shot = shot;
    frame.t = -T.runup;
    humanKeeps = frame.striker === 1;
    // the CPU keeper decides now (from its history and, if it reads, the ball at its reaction time); the human taps
    plan = humanKeeps ? null : cpu.keep(pseudo(), shot, kickNo);
    o.emit({ type: 'runup', striker: frame.striker });
    setPhase('runup');
  };

  const impact = (): void => {
    const shot = frame.shot as Shot;
    const p = plan ?? HOLD_PLAN;
    const r = resolveKick(shot, p);
    res = r;
    let record: KickRecord;
    if (practice) {
      record = {
        side: 0,
        outcome: r.outcome,
        impact: r.impact,
        zone: zoneOf(shot.tx, shot.ty),
        power: shot.zone,
        curve: curveClass(shot.curve),
        dive: p.zone,
      };
      pracKicks = [...pracKicks.slice(-11), record];
      stats.kicks++;
      if (r.outcome === 'goal') stats.goals++;
      if (r.outcome === 'saved') stats.saves++;
    } else {
      const s = settle(st, shot, p);
      st = s.state;
      record = s.record;
    }
    frame.record = record;
    frame.impactT = 0;
    kickNo++;
    o.emit({ type: 'impact', record, striker: frame.striker });
    if (
      !practice &&
      !isOver(st) &&
      isSudden(st) &&
      st.taken[0] === st.taken[1] &&
      st.taken[0] === st.quota - 1
    )
      o.emit({ type: 'sudden' });
    setPhase('result');
  };

  const poseNow = (): void => {
    const shot = frame.shot;
    if (!shot) return;
    keeperPoseInto(plan ?? HOLD_PLAN, frame.t, frame.keeper);
    frame.keeperZone = plan?.zone ?? null;
    if (plan?.zone && !diveSent && frame.t >= plan.startT) {
      diveSent = true;
      o.emit({ type: 'dive', zone: plan.zone });
    }
    if (frame.phase === 'result' && res) afterInto(shot, res, frame.impactT, frame.ball);
    else if (frame.t >= 0) poseInto(shot, frame.t, frame.ball);
  };

  function advancePhase(): void {
    switch (frame.phase) {
      case 'intro':
        beginReady();
        break;
      case 'ready':
        // think delay over (or the watchdog): the CPU shoots. A human is never forced to shoot.
        if (frame.striker === 1) startKick(cpu.shoot(st, kickNo));
        break;
      case 'runup':
        frame.t = 0;
        o.emit({ type: 'strike', shot: frame.shot as Shot, striker: frame.striker });
        setPhase('flight');
        break;
      case 'flight':
        frame.t = (frame.shot as Shot).flight;
        impact();
        break;
      case 'result':
        if (!practice && isOver(st)) {
          setPhase('done');
        } else beginReady();
        break;
      case 'done':
        if (!doneSent) {
          doneSent = true;
          o.emit({ type: 'over', winner: st.winner });
        }
        break;
    }
  }

  const f: Flow = {
    frame,
    mode: o.mode,
    difficulty: o.difficulty,
    update(dt) {
      if (!(dt > 0)) return;
      frame.phaseT += dt;
      switch (frame.phase) {
        case 'intro':
          if (frame.phaseT >= T.intro) advancePhase();
          break;
        case 'ready':
          if (frame.striker === 1 && frame.phaseT >= (o.instantCpu ? 0 : thinkFor)) advancePhase();
          else if (frame.striker === 0 && !idleSent && frame.phaseT >= T.idle) {
            idleSent = true;
            o.emit({ type: 'idle' });
          }
          break;
        case 'runup':
          frame.t = frame.phaseT - T.runup;
          if (frame.phaseT >= T.runup) advancePhase();
          break;
        case 'flight':
          frame.t = frame.phaseT;
          if (frame.t >= (frame.shot as Shot).flight) advancePhase();
          break;
        case 'result':
          frame.t = (frame.shot as Shot).flight + frame.phaseT;
          frame.impactT = frame.phaseT;
          if (frame.phaseT >= T.result) advancePhase();
          break;
        case 'done':
          if (frame.phaseT >= T.done) advancePhase();
          break;
      }
      poseNow();
    },
    shoot(input) {
      if (!f.canShoot()) return false;
      startKick(input);
      poseNow();
      return true;
    },
    dive(zone) {
      if (!f.canDive()) return false;
      plan = { zone, startT: frame.t + MOTOR_LAG };
      humanKeeps = false;
      return true;
    },
    canShoot: () => frame.phase === 'ready' && frame.striker === 0,
    canDive: () =>
      humanKeeps &&
      plan === null &&
      (frame.phase === 'runup' || (frame.phase === 'flight' && frame.t <= T.window)),
    skip(force = false) {
      if (f.canShoot()) return false; // a human who is thinking is never forced to shoot
      if (frame.phase === 'done' && doneSent) return false;
      const kickInProgress = frame.phase === 'runup' || frame.phase === 'flight';
      if (kickInProgress && !force) return false;
      advancePhase();
      if (frame.phase === 'runup' && force) advancePhase();
      if (frame.phase === 'flight' && force) advancePhase();
      poseNow();
      return true;
    },
    state: () => st,
    practice: () => ({ ...stats }),
  };
  return f;
}
