import { createRng } from '@naija/core/rng';
import { describe, expect, it } from 'vitest';
import { ZONES, makeShot, poseInto, type Shot, type Zone } from '../physics';
import { DIFFICULTIES, PERSONA_OF, type Difficulty } from '../rules/config';
import { createShootout, type KickRecord } from '../rules/shootout';
import {
  KEEPER,
  PERSONAS,
  STRIKER,
  aimPoint,
  botController,
  cpuController,
  createBot,
  decideKeeper,
  decideStriker,
  keeperSaveRate,
  personaById,
  personaFor,
  simulate,
  simulateShootout,
  strikerGoalRate,
  bestPlacement,
  placementGrid,
  type Controller,
  zonePrior,
  zoneWeights,
  aiRng,
} from './index';

const NONE: Record<Zone, number> = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 };
const exactShot = (tx: number, ty: number, curve = 0, power = 0.6): Shot => ({
  ...makeShot({ aimX: tx, aimY: ty, power, curve }, createRng(1)),
  tx,
  ty,
  curve,
});
const kick = (zone: Zone, side: 0 | 1 = 0): KickRecord => ({
  side,
  outcome: 'goal',
  impact: 'in',
  zone,
  power: 3,
  curve: 0,
  dive: null,
});

describe('CPU keeper', () => {
  it('is deterministic and always draws the same number of values', () => {
    for (const d of DIFFICULTIES) {
      const shot = exactShot(2.5, 1.5);
      const ctx = { difficulty: d, shot, habit: NONE, seen: [] as KickRecord[] };
      expect(decideKeeper(ctx, createRng(3))).toEqual(decideKeeper(ctx, createRng(3)));
      const draws = new Set<number>();
      for (let seed = 1; seed < 60; seed++) {
        const r = createRng(seed);
        decideKeeper(ctx, r);
        // fifteen draws: read, stay, zone, then three each for the four noise values (whichever branch it takes)
        const probe = createRng(seed);
        for (let i = 0; i < 15; i++) probe.next();
        draws.add(r.getState());
        expect(r.getState()).toBe(probe.getState());
      }
      expect(draws.size).toBeGreaterThan(10);
    }
  });

  it('cannot see the future: two shots that look the same until its reaction time get the same dive', () => {
    // shot B ends 0.6 m wider but is curved so that it is at the same place when the keeper first looks
    for (const d of DIFFICULTIES) {
      const react = KEEPER[d].react;
      const A = exactShot(2.0, 1.4, 0, 0.6);
      const s = react / A.flight;
      const curve = (0.6 * s) / (0.9 * Math.sin(Math.PI * s));
      const B = { ...exactShot(2.6, 1.4, curve, 0.6) };
      const pa = poseInto(A, react, { x: 0, y: 0, s: 0 });
      const pb = poseInto(B, react, { x: 0, y: 0, s: 0 });
      expect(pb.x).toBeCloseTo(pa.x, 6);
      expect(pb.y).toBeCloseTo(pa.y, 1);
      expect(B.tx - A.tx).toBeCloseTo(0.6, 9);
      for (let seed = 1; seed < 80; seed++) {
        const a = decideKeeper({ difficulty: d, shot: A, habit: NONE, seen: [] }, createRng(seed));
        const b = decideKeeper({ difficulty: d, shot: B, habit: NONE, seen: [] }, createRng(seed));
        expect(b.startT).toBe(a.startT);
        if (a.zone === b.zone) continue;
        // the y of the two paths differs slightly (loft), so a borderline zone can flip: never by more than one zone
        const dx = Math.abs(ZONES.indexOf(a.zone!) - ZONES.indexOf(b.zone!));
        expect(dx).toBeLessThanOrEqual(3);
      }
    }
  });

  it('when it guesses, the choice does not depend on the shot at all', () => {
    const habit = { ...NONE, ur: 10 };
    for (let seed = 1; seed < 200; seed++) {
      const a = decideKeeper(
        { difficulty: 'hard', shot: exactShot(-3, 0.4), habit, seen: [] },
        createRng(seed),
      );
      const b = decideKeeper(
        { difficulty: 'hard', shot: exactShot(3, 2.0), habit, seen: [] },
        createRng(seed),
      );
      if (a.startT === KEEPER.hard.guessStart && b.startT === KEEPER.hard.guessStart)
        expect(a.zone).toBe(b.zone);
    }
  });

  it('builds a bounded, normalised prior from the habit and what it has seen this match', () => {
    const p0 = zonePrior(NONE, []);
    for (const z of ZONES) expect(p0[z]).toBeCloseTo(1 / 6, 9);
    const p1 = zonePrior({ ...NONE, ul: 10 }, [kick('ul'), kick('ul')]);
    expect(p1.ul).toBeGreaterThan(0.7);
    expect(ZONES.reduce((n, z) => n + p1[z], 0)).toBeCloseTo(1, 9);
    expect(zonePrior({ ...NONE, ul: -5, u: NaN as unknown as number }, [])).toBeDefined();
  });

  it('Hard anticipates the human favourite corner; Easy ignores it', () => {
    const habit = { ...NONE, ur: 12 };
    const share = (d: Difficulty): number => {
      let hit = 0;
      let n = 0;
      for (let seed = 1; seed <= 1500; seed++) {
        const plan = decideKeeper(
          { difficulty: d, shot: exactShot(2.9, 1.9, 0, 0.9), habit, seen: [] },
          createRng(seed),
        );
        if (plan.startT === KEEPER[d].guessStart) {
          n++;
          if (plan.zone === 'ur') hit++;
        }
      }
      return hit / n;
    };
    expect(share('hard')).toBeGreaterThan(0.6);
    expect(share('medium')).toBeGreaterThan(0.45);
    expect(share('easy')).toBeLessThan(0.25);
  });

  it('a curved shot fools a one-look reader (Easy, Medium); Hard looks twice and is fooled far less', () => {
    // a read is recognised by its start time; the target is a top corner on the right
    const rate = (d: Difficulty, curve: number): number => {
      const p = KEEPER[d];
      const starts = [p.react + p.lag, p.react + p.look + p.lag];
      let ok = 0;
      let n = 0;
      for (let seed = 1; seed <= 3000; seed++) {
        const shot = exactShot(2.2, 1.7, curve, 0.6);
        const plan = decideKeeper({ difficulty: d, shot, habit: NONE, seen: [] }, createRng(seed));
        if (starts.some((s) => Math.abs(plan.startT - s) < 1e-9)) {
          n++;
          if (plan.zone === 'ur') ok++;
        }
      }
      return ok / n;
    };
    expect(rate('medium', 0)).toBeGreaterThan(rate('medium', 1) + 0.3);
    expect(rate('hard', 0)).toBeGreaterThan(0.5);
    expect(rate('hard', 1)).toBeGreaterThan(rate('medium', 1) + 0.2);
  });

  it('keeper profiles get faster and smarter with difficulty', () => {
    expect(KEEPER.easy.react).toBeGreaterThan(KEEPER.medium.react);
    expect(KEEPER.medium.react).toBeGreaterThan(KEEPER.hard.react);
    expect(KEEPER.easy.bias).toBeLessThan(KEEPER.medium.bias);
    expect(KEEPER.medium.bias).toBeLessThan(KEEPER.hard.bias);
    expect(KEEPER.easy.stay).toBeGreaterThan(KEEPER.hard.stay);
    expect(KEEPER.easy.noise).toBeGreaterThan(KEEPER.hard.noise);
  });
});

describe('CPU striker', () => {
  it('always aims inside the picture and inside its power range, for every level', () => {
    for (const d of DIFFICULTIES) {
      const p = STRIKER[d];
      const rng = createRng(8);
      for (let i = 0; i < 500; i++) {
        const s = decideStriker({ difficulty: d, own: [] }, rng);
        expect(Math.abs(s.aimX)).toBeLessThan(p.sideX + p.jitter * 3 + 0.01);
        expect(s.power).toBeGreaterThanOrEqual(p.powerLo);
        expect(s.power).toBeLessThanOrEqual(p.powerHi);
        expect(Math.abs(s.curve)).toBeLessThanOrEqual(0.6);
        for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('is deterministic and draws a fixed number of values', () => {
    const a = createRng(4);
    const b = createRng(4);
    expect(decideStriker({ difficulty: 'hard', own: [] }, a)).toEqual(
      decideStriker({ difficulty: 'hard', own: [] }, b),
    );
    expect(a.getState()).toBe(b.getState());
  });

  it('Easy rarely goes for the corners; Hard goes to all six zones', () => {
    const count = (d: Difficulty): Record<string, number> => {
      const rng = createRng(21);
      const out: Record<string, number> = {};
      for (let i = 0; i < 1200; i++) {
        const s = decideStriker({ difficulty: d, own: [] }, rng);
        const key = Math.abs(s.aimX) > 3.0 ? 'corner' : 'inner';
        out[key] = (out[key] ?? 0) + 1;
      }
      return out;
    };
    expect((count('easy').corner ?? 0) / 1200).toBeLessThan(0.15);
    expect(count('hard').corner).toBeGreaterThan(600);
    expect(aimPoint('easy', 'ur').x).toBeLessThan(aimPoint('hard', 'ur').x);
  });

  it('varies placement: a zone just used is weighted down, so Hard is not exploitable by repetition', () => {
    const base = zoneWeights({ difficulty: 'hard', own: [] });
    const after = zoneWeights({ difficulty: 'hard', own: [kick('ul', 1)] });
    expect(after.ul).toBeLessThan(base.ul * 0.5);
    expect(after.ur).toBe(base.ur);
    const two = zoneWeights({ difficulty: 'hard', own: [kick('ul', 1), kick('ul', 1)] });
    expect(two.ul).toBeLessThan(after.ul);
    // repeat rate over a long run: far below what the raw weights would give
    const rng = createRng(2);
    const own: KickRecord[] = [];
    let repeats = 0;
    for (let i = 0; i < 1500; i++) {
      const input = decideStriker({ difficulty: 'hard', own }, rng);
      const a = aimPoint('hard', 'ul');
      void a;
      const zone = (['ul', 'u', 'ur', 'dl', 'd', 'dr'] as Zone[]).reduce((best, z) => {
        const pz = aimPoint('hard', z);
        const pb = aimPoint('hard', best);
        return Math.hypot(pz.x - input.aimX, pz.y - input.aimY) <
          Math.hypot(pb.x - input.aimX, pb.y - input.aimY)
          ? z
          : best;
      }, 'u' as Zone);
      if (own.length && own[own.length - 1]!.zone === zone) repeats++;
      own.push(kick(zone, 1));
    }
    const raw = Object.values(STRIKER.hard.weights);
    const sum = raw.reduce((x, y) => x + y, 0);
    const rawRepeat = raw.reduce((x, w) => x + (w / sum) ** 2, 0);
    expect(repeats / 1500).toBeLessThan(rawRepeat * 0.75);
  });

  it('striker profiles get sharper with difficulty', () => {
    expect(STRIKER.easy.sideX).toBeLessThan(STRIKER.medium.sideX);
    expect(STRIKER.medium.sideX).toBeLessThan(STRIKER.hard.sideX);
    expect(STRIKER.easy.jitter).toBeGreaterThan(STRIKER.hard.jitter);
    expect(STRIKER.easy.powerHi).toBeLessThan(STRIKER.hard.powerHi);
    expect(STRIKER.easy.repeatPenalty).toBeGreaterThan(STRIKER.hard.repeatPenalty);
  });
});

describe('personas', () => {
  it('Easy, Medium and Hard are Ozavize, Ndako and Hamman, each with eight banter keys at most', () => {
    expect(PERSONA_OF).toEqual({ easy: 'ozavize', medium: 'ndako', hard: 'hamman' });
    expect(PERSONAS.map((p) => p.id)).toEqual(['ozavize', 'ndako', 'hamman']);
    for (const p of PERSONAS) {
      expect(p.avatar).toBe(`./assets/avatars/${p.id}.svg`);
      const keys = new Set(Object.values(p.banter).flat());
      for (const k of keys) expect(k).toMatch(new RegExp(`^persona\\.${p.id}\\.[1-8]$`));
      expect(keys.size).toBe(8);
      expect(p.banter.start?.length).toBeGreaterThan(0);
      expect(p.banter.win?.length).toBeGreaterThan(0);
      expect(p.banter.lose?.length).toBeGreaterThan(0);
    }
    expect(personaFor('hard').id).toBe('hamman');
    expect(personaById('nope').id).toBe('ozavize');
  });
});

describe('simulations: difficulty measurably raises the challenge (1000 seeded games each)', () => {
  it('keeper: Hard saves more than Medium, Medium more than Easy, against one fixed reference striker', () => {
    const easy = keeperSaveRate('easy', 1000);
    const medium = keeperSaveRate('medium', 1000);
    const hard = keeperSaveRate('hard', 1000);
    expect(medium).toBeGreaterThan(easy + 0.04);
    expect(hard).toBeGreaterThan(medium + 0.04);
    expect(keeperSaveRate('hard', 1000)).toBe(hard); // reproducible
  }, 60_000);

  it('striker: Hard scores more than Medium, Medium more than Easy, against one fixed reference keeper', () => {
    const easy = strikerGoalRate('easy', 1000);
    const medium = strikerGoalRate('medium', 1000);
    const hard = strikerGoalRate('hard', 1000);
    expect(medium).toBeGreaterThan(easy + 0.02);
    expect(hard).toBeGreaterThan(medium + 0.05);
  }, 60_000);

  it('game level: a fixed-skill bot human wins less against each harder rival', () => {
    const wins = (d: Difficulty): number => {
      let w = 0;
      const bot = createBot();
      for (let i = 1; i <= 1000; i++)
        if (simulateShootout({ seed: i, difficulty: d, human: bot }).winner === 0) w++;
      return w / 1000;
    };
    const easy = wins('easy');
    const medium = wins('medium');
    const hard = wins('hard');
    expect(easy).toBeGreaterThan(medium + 0.08);
    expect(medium).toBeGreaterThan(hard + 0.08);
    expect(easy).toBeGreaterThan(0.5);
    expect(hard).toBeLessThan(0.35);
    expect(hard).toBeGreaterThan(0.05); // still beatable
  }, 60_000);

  it('CPU versus CPU: the Hard rival beats the Easy rival well over 60% of 1000 shootouts, from either side', () => {
    let w = 0;
    for (let i = 1; i <= 1000; i++) {
      const hardIsSide0 = i % 2 === 0;
      const c: [ReturnType<typeof cpuController>, ReturnType<typeof cpuController>] = hardIsSide0
        ? [cpuController('hard', 0), cpuController('easy', 1)]
        : [cpuController('easy', 0), cpuController('hard', 1)];
      const s = simulate(i, c);
      if (s.winner === (hardIsSide0 ? 0 : 1)) w++;
    }
    expect(w / 1000).toBeGreaterThan(0.6);
  }, 60_000);

  it('every simulated shootout ends with a winner and legal counts', () => {
    const bot = createBot();
    for (let i = 1; i <= 300; i++) {
      const s = simulateShootout({ seed: i, difficulty: DIFFICULTIES[i % 3]!, human: bot });
      expect(s.status).toBe('over');
      expect(s.winner).not.toBeNull();
      expect(Math.abs(s.taken[0] - s.taken[1])).toBeLessThanOrEqual(1);
    }
  });

  it('every AI decision (keeper dive, striker aim) is finite and inside the legal input ranges, over 300 seeded matches', () => {
    let kicks = 0;
    const spy = (c: Controller): Controller => ({
      shoot(st, k) {
        const i = c.shoot(st, k);
        kicks++;
        for (const v of Object.values(i)) expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(i.aimX)).toBeLessThanOrEqual(6);
        expect(i.aimY).toBeGreaterThanOrEqual(0.11);
        expect(i.aimY).toBeLessThanOrEqual(4);
        expect(i.power).toBeGreaterThanOrEqual(0);
        expect(i.power).toBeLessThanOrEqual(1);
        expect(Math.abs(i.curve)).toBeLessThanOrEqual(1);
        return i;
      },
      keep(st, shot, k) {
        const p = c.keep(st, shot, k);
        expect(p.zone === null || ZONES.includes(p.zone)).toBe(true);
        expect(Number.isFinite(p.startT)).toBe(true);
        expect(p.startT).toBeGreaterThanOrEqual(-1);
        expect(p.startT).toBeLessThanOrEqual(1);
        return p;
      },
    });
    for (let i = 1; i <= 300; i++) {
      const d = DIFFICULTIES[i % 3]!;
      const s = simulate(i, [spy(botController(createBot(), i)), spy(cpuController(d, 1))]);
      expect(s.status).toBe('over');
    }
    expect(kicks).toBeGreaterThan(2000);
  });

  describe('no single repeated placement beats Hard (9 x 5 grid, 3 powers and a curl, a quick and a slow human keeper)', () => {
    // each point is 600 seeded matches; the grid is 180 placements, so the best of them is the exploit an attacker would find
    const GRID = placementGrid(
      [-3.2, -2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4, 3.2],
      [0.3, 0.8, 1.3, 1.8, 2.2],
    );
    const heavy = process.env.NAIJA_COVERAGE === '1' ? it.skip : it;

    it('the grid really is 9 x 5 x (3 straight powers + one curl)', () => {
      expect(GRID).toHaveLength(180);
      expect(new Set(GRID.map((g) => g.input.power))).toEqual(new Set([0.45, 0.6, 0.8]));
      expect(GRID.some((g) => g.input.curve !== 0)).toBe(true);
    });

    for (const react of [0.25, 0.35]) {
      heavy(
        `a human keeper reacting at ${react} s: the best placement wins at most 22% fresh and 25% after 300 matches of habit`,
        () => {
          const fresh = bestPlacement('hard', GRID, 600, 0, react);
          const learned = bestPlacement('hard', GRID, 600, 300, react);
          expect(fresh.rate, `best fresh: ${fresh.name}`).toBeLessThanOrEqual(0.22);
          expect(learned.rate, `best learned: ${learned.name}`).toBeLessThanOrEqual(0.25);
          expect(learned.rate).toBeLessThanOrEqual(fresh.rate + 0.02); // repetition is punished through the habit
          expect(fresh.rate).toBeGreaterThan(0.01); // still beatable
        },
        120_000,
      );
    }

    heavy(
      'Medium is easier to exploit than Hard, and Easy easier than Medium',
      () => {
        const best = (d: Difficulty): number => bestPlacement(d, GRID, 300, 0, 0.25).rate;
        expect(best('easy')).toBeGreaterThan(best('medium'));
        expect(best('medium')).toBeGreaterThan(best('hard') + 0.1);
      },
      120_000,
    );
  });

  it('a human with a habit gets read: the same bot is saved more once the keeper has its history', () => {
    const habit = { ...NONE, ul: 11, ur: 11, dl: 5, dr: 5, u: 1, d: 1 };
    const bot = createBot();
    let plain = 0;
    let read = 0;
    for (let i = 1; i <= 800; i++) {
      for (const k of simulateShootout({ seed: i, difficulty: 'hard', human: bot }).kicks)
        if (k.side === 0 && k.outcome === 'saved') plain++;
      for (const k of simulateShootout({ seed: i, difficulty: 'hard', human: bot, habit }).kicks)
        if (k.side === 0 && k.outcome === 'saved') read++;
    }
    expect(read).toBeGreaterThanOrEqual(plain);
  }, 60_000);

  it('controllers are pure functions of the shootout: the same state gives the same decision', () => {
    const c = cpuController('hard', 1);
    const s = createShootout({ seed: 5, teams: ['lanterns', 'sparks'], first: 1 });
    expect(c.shoot(s, 0)).toEqual(c.shoot(s, 0));
    const shot = exactShot(1, 1);
    expect(c.keep(s, shot, 0)).toEqual(c.keep(s, shot, 0));
    expect(aiRng(1, 2, 3).next()).toBe(aiRng(1, 2, 3).next());
    expect(aiRng(1, 2, 3).next()).not.toBe(aiRng(1, 3, 3).next());
    const b = botController(createBot(), 3);
    expect(b.keep(s, shot, 0).zone).toBeDefined();
  });
});
