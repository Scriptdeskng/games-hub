import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { createBot } from '../ai';
import { MOTOR_LAG, ZONES, type ShotInput } from '../physics';
import { createFlow, T, type Flow, type FlowEvent, type FlowOptions } from './flow';

const EMPTY = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 };
const mk = (over: Partial<FlowOptions> = {}): { flow: Flow; events: FlowEvent[] } => {
  const events: FlowEvent[] = [];
  const flow = createFlow({
    mode: 'quick',
    difficulty: 'medium',
    seed: 7,
    teams: ['lanterns', 'sparks'],
    habit: EMPTY,
    emit: (e) => events.push(e),
    ...over,
  });
  return { flow, events };
};
const STEP = 1 / 60;
const run = (f: Flow, seconds: number): void => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) f.update(STEP);
};
const until = (f: Flow, cond: () => boolean, max = 60): void => {
  for (let i = 0; i < max / STEP && !cond(); i++) f.update(STEP);
};
const SHOT: ShotInput = { aimX: 2.8, aimY: 1.9, power: 0.6, curve: 0 };
const phases = (ev: FlowEvent[]): string[] =>
  ev.filter((e) => e.type === 'phase').map((e) => (e as { phase: string }).phase);

describe('one kick, human striker', () => {
  it('goes intro -> ready -> runup -> flight -> result and records the kick', () => {
    const { flow, events } = mk({ first: 0 });
    expect(flow.frame.phase).toBe('intro');
    expect(flow.canShoot()).toBe(false);
    expect(flow.shoot(SHOT)).toBe(false); // not yet
    run(flow, T.intro + 0.05);
    expect(flow.frame.phase).toBe('ready');
    expect(flow.canShoot()).toBe(true);
    run(flow, 3); // a human may take as long as they like
    expect(flow.frame.phase).toBe('ready');
    expect(flow.shoot(SHOT)).toBe(true);
    expect(flow.shoot(SHOT)).toBe(false); // only once
    expect(flow.frame.phase).toBe('runup');
    until(flow, () => flow.frame.phase === 'result');
    expect(phases(events)).toEqual(['ready', 'runup', 'flight', 'result']);
    expect(events.map((e) => e.type).filter((t) => t !== 'dive')).toEqual([
      'phase',
      'runup',
      'phase',
      'strike',
      'phase',
      'impact',
      'phase',
    ]);
    expect(flow.state().kicks).toHaveLength(1);
    expect(flow.frame.record).toEqual(flow.state().kicks[0]);
    expect(flow.frame.shot!.aimX).toBe(2.8);
  });

  it('after the result, the CPU is up (think delay, then it shoots) and the keeper dive window opens', () => {
    const { flow, events } = mk({ first: 0 });
    run(flow, T.intro + 0.05);
    flow.shoot(SHOT);
    until(flow, () => flow.frame.phase === 'ready');
    expect(flow.frame.striker).toBe(1);
    expect(flow.canShoot()).toBe(false);
    expect(flow.canDive()).toBe(false); // the CPU has not started its run-up yet
    until(flow, () => flow.frame.phase === 'runup');
    expect(flow.canDive()).toBe(true);
    expect(events.filter((e) => e.type === 'runup')).toHaveLength(2);
  });

  it('the ball moves along the shot path during flight and ends at the target', () => {
    const { flow } = mk({ first: 0 });
    run(flow, T.intro + 0.05);
    flow.shoot({ ...SHOT, power: 0.2 });
    until(flow, () => flow.frame.phase === 'flight');
    let prev = -1;
    while (flow.frame.phase === 'flight') {
      flow.update(STEP);
      expect(flow.frame.ball.s).toBeGreaterThanOrEqual(prev);
      prev = flow.frame.ball.s;
    }
    expect(flow.frame.phase).toBe('result');
    for (const v of [flow.frame.ball.x, flow.frame.ball.y, flow.frame.ball.s])
      expect(Number.isFinite(v)).toBe(true);
  });
});

describe('human keeper', () => {
  const toCpuRunup = (flow: Flow): void => {
    run(flow, T.intro + 0.05);
    until(flow, () => flow.frame.phase === 'runup');
  };

  it('can dive from the run-up until a quarter second after the strike, once, with the motor lag', () => {
    const { flow, events } = mk({ first: 1, instantCpu: true });
    toCpuRunup(flow);
    expect(flow.frame.striker).toBe(1);
    run(flow, 0.3);
    expect(flow.dive('ul')).toBe(true);
    expect(flow.dive('ur')).toBe(false);
    until(flow, () => flow.frame.phase === 'result');
    expect(events.some((e) => e.type === 'dive')).toBe(true);
    expect(flow.state().kicks[0]!.dive).toBe('ul');
    expect(flow.frame.keeperZone).toBe('ul');
  });

  it('a dive tapped too late is refused, and a keeper who never dives stays put', () => {
    const { flow } = mk({ first: 1, instantCpu: true });
    toCpuRunup(flow);
    until(flow, () => flow.frame.phase === 'flight');
    run(flow, T.window + 0.05);
    expect(flow.canDive()).toBe(false);
    expect(flow.dive('u')).toBe(false);
    until(flow, () => flow.frame.phase === 'result');
    expect(flow.state().kicks[0]!.dive).toBeNull();
  });

  it('an earlier tap gives an earlier start (the plan uses time relative to the strike)', () => {
    const early = mk({ first: 1, instantCpu: true });
    toCpuRunup(early.flow);
    early.flow.dive('dl');
    const t0 = early.flow.frame.t;
    expect(t0).toBeLessThan(0);
    const late = mk({ first: 1, instantCpu: true });
    toCpuRunup(late.flow);
    until(late.flow, () => late.flow.frame.phase === 'flight');
    run(late.flow, 0.1);
    expect(late.flow.frame.t).toBeGreaterThan(t0 + MOTOR_LAG);
  });
});

describe('practice mode', () => {
  it('is striker only, never ends, and counts kicks, goals and saves without touching the shootout', () => {
    const { flow, events } = mk({ mode: 'practice', difficulty: 'easy' });
    run(flow, T.intro + 0.05);
    const before = flow.state();
    for (let i = 0; i < 12; i++) {
      expect(flow.frame.striker).toBe(0);
      expect(flow.shoot({ ...SHOT, aimX: (i % 3) - 1 })).toBe(true);
      until(flow, () => flow.frame.phase === 'ready');
    }
    const p = flow.practice();
    expect(p.kicks).toBe(12);
    expect(p.goals + p.saves).toBeLessThanOrEqual(12);
    expect(flow.state()).toBe(before);
    expect(events.some((e) => e.type === 'over')).toBe(false);
    expect(flow.canDive()).toBe(false);
  });
});

describe('whole matches', () => {
  const playOut = (
    opts: Partial<FlowOptions>,
    seed: number,
  ): { flow: Flow; events: FlowEvent[]; secs: number } => {
    const { flow, events } = mk({ ...opts, seed, instantCpu: false });
    const bot = createBot();
    const rng = createRng(seed ^ 0x600d);
    let secs = 0;
    for (let i = 0; i < 60 * 600 && !events.some((e) => e.type === 'over'); i++) {
      if (flow.canShoot()) flow.shoot(bot.shoot(i, rng));
      if (flow.canDive()) flow.dive(bot.dive(i, rng).zone!);
      flow.update(STEP);
      secs += STEP;
    }
    return { flow, events, secs };
  };

  it('every match ends: a winner, an over event exactly once, in bounded time', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { flow, events, secs } = playOut(
        { difficulty: (['easy', 'medium', 'hard'] as const)[seed % 3] },
        seed,
      );
      const overs = events.filter((e) => e.type === 'over');
      expect(overs).toHaveLength(1);
      const s = flow.state();
      expect(s.status).toBe('over');
      expect((overs[0] as { winner: number }).winner).toBe(s.winner);
      expect(secs).toBeLessThan(400);
      expect(flow.frame.phase).toBe('done');
    }
  });

  it('is deterministic: the same seed and inputs give the same events', () => {
    const a = playOut({}, 31);
    const b = playOut({}, 31);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    expect(a.flow.state()).toEqual(b.flow.state());
  });

  it('announces sudden death when a shootout goes to it', () => {
    let found = false;
    for (let seed = 1; seed <= 120 && !found; seed++) {
      const { events, flow } = playOut({ difficulty: 'hard' }, seed);
      const sudden = events.filter((e) => e.type === 'sudden').length;
      if (flow.state().quota > 5) {
        found = true;
        expect(sudden).toBe(flow.state().quota - 5);
      } else expect(sudden).toBe(0);
    }
    expect(found).toBe(true);
  });

  it('keeper and ball poses are finite in every frame of a match', () => {
    const { flow } = mk({ seed: 3 });
    const bot = createBot();
    const rng = createRng(1);
    for (let i = 0; i < 60 * 120; i++) {
      if (flow.canShoot()) flow.shoot(bot.shoot(i, rng));
      if (flow.canDive()) flow.dive(ZONES[i % 6]!);
      flow.update(STEP);
      const f = flow.frame;
      for (const v of [
        f.ball.x,
        f.ball.y,
        f.ball.s,
        f.keeper.x,
        f.keeper.y,
        f.keeper.p,
        f.t,
        f.phaseT,
      ])
        expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('watchdog skip', () => {
  it('moves intro, the CPU think and the result on, but never touches a kick in progress without force', () => {
    const { flow, events } = mk({ first: 1 });
    expect(flow.skip()).toBe(true); // intro -> ready
    expect(flow.frame.phase).toBe('ready');
    expect(flow.skip()).toBe(true); // the CPU takes its kick and starts its run-up
    expect(flow.frame.phase).toBe('runup');
    expect(flow.canDive()).toBe(true);
    for (let i = 0; i < 5; i++) expect(flow.skip()).toBe(false); // the human keeper may still dive
    expect(flow.frame.phase).toBe('runup');
    expect(flow.state().kicks).toHaveLength(0);
    expect(events.filter((e) => e.type === 'over')).toHaveLength(0);
  });

  it('a committed human dive is never advanced by a plain skip, in the run-up or in the flight', () => {
    const { flow } = mk({ first: 1, instantCpu: true });
    run(flow, T.intro + 0.05);
    until(flow, () => flow.frame.phase === 'runup');
    expect(flow.dive('dl')).toBe(true);
    expect(flow.skip()).toBe(false);
    until(flow, () => flow.frame.phase === 'flight');
    expect(flow.skip()).toBe(false);
    expect(flow.frame.phase).toBe('flight');
    expect(flow.frame.keeperZone).toBe('dl');
    until(flow, () => flow.frame.phase === 'result');
    expect(flow.state().kicks[0]!.dive).toBe('dl');
    expect(flow.skip()).toBe(true); // the result is shown long enough: on to the next kick
  });

  it('a human shot that is committed is not skipped without force either', () => {
    const { flow } = mk({ first: 0 });
    run(flow, T.intro + 0.05);
    flow.shoot(SHOT);
    expect(flow.frame.phase).toBe('runup');
    expect(flow.skip()).toBe(false);
    until(flow, () => flow.frame.phase === 'flight');
    expect(flow.skip()).toBe(false);
    expect(flow.state().kicks).toHaveLength(0);
  });

  it('force (a stall that outlasted the guard) closes the dive window: no dive is recorded; a committed dive is kept', () => {
    const open = mk({ first: 1, instantCpu: true });
    run(open.flow, T.intro + 0.05);
    until(open.flow, () => open.flow.frame.phase === 'runup');
    expect(open.flow.canDive()).toBe(true);
    expect(open.flow.skip(true)).toBe(true);
    expect(open.flow.frame.phase).toBe('result');
    expect(open.flow.state().kicks[0]!.dive).toBeNull();
    expect(open.flow.canDive()).toBe(false);
    const made = mk({ first: 1, instantCpu: true });
    run(made.flow, T.intro + 0.05);
    until(made.flow, () => made.flow.frame.phase === 'runup');
    made.flow.dive('ur');
    expect(made.flow.skip(true)).toBe(true);
    expect(made.flow.state().kicks[0]!.dive).toBe('ur'); // his dive, not a timeout's
  });

  it('force never makes a human shoot, and never passes the end', () => {
    const { flow, events } = mk({ first: 0 });
    run(flow, T.intro + 0.05);
    expect(flow.skip(true)).toBe(false);
    expect(flow.frame.phase).toBe('ready');
    let guard = 0;
    while (!events.some((e) => e.type === 'over') && guard++ < 800) {
      if (flow.canShoot()) flow.shoot(SHOT);
      else if (flow.canDive()) flow.dive('u');
      flow.skip(true);
    }
    expect(events.filter((e) => e.type === 'over')).toHaveLength(1);
    expect(flow.skip(true)).toBe(false);
    expect(events.filter((e) => e.type === 'over')).toHaveLength(1);
  });

  it('a dive window that has closed no longer blocks, but a plain skip still waits for the flight to end by itself', () => {
    const { flow } = mk({ first: 1, instantCpu: true });
    run(flow, T.intro + 0.05);
    until(flow, () => flow.frame.phase === 'flight');
    run(flow, T.window + 0.05);
    expect(flow.canDive()).toBe(false);
    expect(flow.skip()).toBe(false);
    expect(flow.skip(true)).toBe(true);
    expect(flow.state().kicks[0]!.dive).toBeNull();
  });

  it('a long frame (tab restored, throttled CPU) does not skip a phase silently: one phase per update', () => {
    const { flow } = mk({ first: 0 });
    flow.update(30);
    expect(flow.frame.phase).toBe('ready');
    flow.shoot(SHOT);
    flow.update(30);
    expect(['flight', 'runup']).toContain(flow.frame.phase);
  });

  it('ignores non-positive and NaN steps', () => {
    const { flow } = mk();
    flow.update(0);
    flow.update(-1);
    flow.update(NaN);
    expect(flow.frame.phaseT).toBe(0);
  });
});
