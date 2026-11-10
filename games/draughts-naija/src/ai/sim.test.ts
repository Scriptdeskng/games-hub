import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import { describe, expect, it } from 'vitest';
import { LIGHT } from '../rules/board';
import { makeRules, type Rules } from '../rules/config';
import { applyMove, createGame, isOver, legalMoves } from '../rules/engine';
import { decide, decisionSeed } from './decide';
import { headToHead as h2h, mergeStats, simulate, wilson, type MatchStats } from './sim';

/**
 * `headToHead` in chunks of 10 games with a yield between them: a long synchronous loop starves the
 * test worker's RPC channel under coverage ("Timeout calling onTaskUpdate").
 */
async function headToHead(
  a: Difficulty,
  b: Difficulty,
  games: number,
  o: { rules: Rules; seed?: number; nodes?: { a?: number; b?: number } },
): Promise<MatchStats> {
  const parts: MatchStats[] = [];
  for (let done = 0; done < games; done += 10) {
    parts.push(h2h(a, b, Math.min(10, games - done), { ...o, seed: (o.seed ?? 1000) + done }));
    await new Promise((r) => setTimeout(r, 0));
  }
  return mergeStats(parts);
}

/**
 * Difficulty is measured by simulation: seeded games between the CPU levels, both seats played by
 * the real `decide`. The shipped Hard budget (40 000 nodes: ~0.1 s on a laptop, a few tenths of a
 * second in the worker on a 4x-throttled phone) is too slow to play hundreds of full games in every
 * test run, so these tests scale the budgets down TOGETHER and keep their ratio:
 *   Hard 400, Medium 40 (shipped 40 000 : 4 000, i.e. 10 : 1), Easy unchanged (400 nodes, depth 2).
 * The full-budget numbers come from `DN_RATES=1 npx vitest run games/draughts-naija/src/ai/sim.test.ts`
 * and are recorded in the README.
 */
const HARD = 400;
const MEDIUM = 40;
const GAMES = 200;
/** games per pairing in the full-budget report (DN_GAMES, default 200: many minutes per size) */
const FULL_GAMES = Number(process.env.DN_GAMES ?? 200);

const rulesFor = (n: 10 | 8): Rules => makeRules(n);
const verdict = (r: MatchStats): string =>
  `${r.wins}W ${r.draws}D ${r.losses}L of ${r.games} (${(r.rate * 100).toFixed(0)}%, 95% interval ${(r.lo * 100).toFixed(0)}-${(r.hi * 100).toFixed(0)}%)`;

describe('legality', () => {
  it('Medium and Easy never play an illegal move (both seats, both sizes, 40 games each; Hard is checked over 200 games per size below)', async () => {
    for (const n of [10, 8] as const) {
      const r = await headToHead('medium', 'easy', 40, {
        rules: rulesFor(n),
        seed: 77,
        nodes: { a: MEDIUM },
      });
      expect(r.illegal).toBe(0);
      expect(r.games).toBe(40);
    }
  });
});

describe('difficulty raises the challenge', () => {
  for (const n of [10, 8] as const) {
    it(
      `${n}x${n}: Hard beats Easy at least 80 percent of ${GAMES} games`,
      { timeout: 600_000 },
      async () => {
        const r = await headToHead('hard', 'easy', GAMES, {
          rules: rulesFor(n),
          seed: 1000,
          nodes: { a: HARD },
        });
        expect(r.games).toBe(GAMES);
        expect(r.rate, verdict(r)).toBeGreaterThanOrEqual(0.8);
        expect(r.illegal).toBe(0);
      },
    );
    it(
      `${n}x${n}: Medium beats Easy, and Hard beats Medium more often than it loses to it`,
      { timeout: 600_000 },
      async () => {
        const me = await headToHead('medium', 'easy', 80, {
          rules: rulesFor(n),
          seed: 2000,
          nodes: { a: MEDIUM },
        });
        expect(me.rate, verdict(me)).toBeGreaterThanOrEqual(0.6);
        const hm = await headToHead('hard', 'medium', 80, {
          rules: rulesFor(n),
          seed: 3000,
          nodes: { a: HARD, b: MEDIUM },
        });
        expect(hm.wins, verdict(hm)).toBeGreaterThan(hm.losses);
      },
    );
  }
  it('even Easy is a real player: it beats a purely random mover on both sizes', () => {
    for (const n of [10, 8] as const) {
      let wins = 0;
      const games = 60;
      for (let i = 0; i < games; i++) {
        const rng = createRng(900 + i);
        let s = createGame({ seed: 900 + i, rules: rulesFor(n) });
        const easyLight = i % 2 === 0;
        while (!isOver(s)) {
          const easyMoves = (s.turn === LIGHT) === easyLight;
          s = applyMove(
            s,
            easyMoves
              ? decide(s, 'easy', decisionSeed(s.seed, s.plies)).move
              : rng.pick(legalMoves(s)),
          );
        }
        if (s.result?.winner === (easyLight ? LIGHT : 1)) wins++;
      }
      expect(wins / games, `${n}x${n}`).toBeGreaterThanOrEqual(0.6);
    }
  });
  it('the Wilson interval brackets the rate', () => {
    const w = wilson(180, 200);
    expect(w.lo).toBeLessThan(0.9);
    expect(w.hi).toBeGreaterThan(0.9);
    expect(w.lo).toBeGreaterThan(0.8);
  });
  it('simulate is reproducible', () => {
    const o = {
      seed: 31,
      rules: rulesFor(8),
      light: 'medium',
      dark: 'easy',
      budget: { light: MEDIUM },
    } as const;
    const a = simulate(o);
    const b = simulate(o);
    expect(b.state).toEqual(a.state);
  });
});

/**
 * The full-budget report (shipped node budgets, 200 games per pairing and size). Slow (many minutes):
 * run it on purpose with DN_RATES=1; it prints the table that goes into the README.
 */
describe.skipIf(!process.env.DN_RATES)('full-budget rates (DN_RATES=1)', () => {
  for (const n of [10, 8] as const) {
    it(`${n}x${n}`, { timeout: 7_200_000 }, async () => {
      const rows: string[] = [];
      for (const [a, b] of [
        ['hard', 'easy'],
        ['medium', 'easy'],
        ['hard', 'medium'],
      ] as const) {
        const r = await headToHead(a, b, FULL_GAMES, { rules: rulesFor(n), seed: 40_000 });
        rows.push(
          `${n}x${n} ${a} v ${b}: ${verdict(r)}, ${r.avgPlies.toFixed(0)} plies, ${r.nodes} nodes`,
        );
        expect(r.illegal).toBe(0);
      }
      process.stdout.write(`\n${rows.join('\n')}\n`);
    });
  }
});
