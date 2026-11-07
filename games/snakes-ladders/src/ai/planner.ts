import { MAX_ROLL, type BoardLayout, type Rules } from '../rules/config';
import { resolveLanding } from '../rules/board';
import { jumpMap } from '../rules/layout';

/**
 * Exact expected-turns-to-finish tables for the Hard CPU (a small MDP solved by value iteration).
 *
 * State = (square, own-turn index within the choice cycle, re-roll still unspent). The cycle is
 * `choiceEvery` turns long when the pick-one-of-two rule is on, else 1. Costs are whole turns,
 * the goal is the last square. Because pawns never interact in this game, minimizing your own
 * expected turns is the right objective for every decision a player really has:
 *   - which of two dice to keep,
 *   - whether to spend the once-per-game re-roll now or keep it for a better moment.
 * Solved once per layout and rules (a few ms), then every decision is a table lookup.
 */
export interface Planner {
  /** Expected own turns still needed from `pos` (0 = last square). */
  turnsLeft(pos: number, turnIndex: number, rerollLeft: boolean): number;
  /** Expected turns if the pawn takes `roll` from `pos` now (the turn itself included). */
  afterRoll(pos: number, turnIndex: number, rerollLeft: boolean, roll: number): number;
  /** Expected turns if the re-roll is spent now (the new die must be kept). */
  afterReroll(pos: number, turnIndex: number): number;
  /** Which of two dice to keep: 0 or 1 (ties keep the first). */
  pick(pos: number, turnIndex: number, rerollLeft: boolean, dice: readonly [number, number]): 0 | 1;
  /** Spend the re-roll on this roll? */
  shouldReroll(pos: number, turnIndex: number, roll: number): boolean;
  readonly period: number;
}

const EPS = 1e-9;

export function createPlanner(layout: BoardLayout, rules: Rules): Planner {
  const last = layout.size * layout.size;
  const period = rules.choiceDice ? Math.max(2, rules.choiceEvery) : 1;
  const jumps = jumpMap(layout);
  // dest[p * 6 + (r - 1)] = square reached from p with roll r
  const dest = new Int32Array((last + 1) * MAX_ROLL);
  for (let p = 0; p < last; p++) {
    for (let r = 1; r <= MAX_ROLL; r++) {
      dest[p * MAX_ROLL + r - 1] = resolveLanding(layout, rules, p, r, jumps).to;
    }
  }
  const size = last + 1;
  const v0 = Array.from({ length: period }, () => new Float64Array(size));
  const v1 = Array.from({ length: period }, () => new Float64Array(size));
  const choiceAt = (k: number): boolean => period > 1 && k === period - 1;
  const hasReroll = rules.reroll;

  for (let iter = 0; iter < 6000; iter++) {
    let delta = 0;
    for (let k = 0; k < period; k++) {
      const k2 = (k + 1) % period;
      const n0 = v0[k2] as Float64Array;
      const n1 = v1[k2] as Float64Array;
      const cur0 = v0[k] as Float64Array;
      const cur1 = v1[k] as Float64Array;
      for (let p = 0; p < last; p++) {
        const base = p * MAX_ROLL;
        let sum = 0;
        for (let r = 0; r < MAX_ROLL; r++) sum += n0[dest[base + r] as number] as number;
        const rr = sum / MAX_ROLL; // spend the re-roll: one fresh die, kept
        let e0: number;
        let e1: number;
        if (choiceAt(k)) {
          let s0 = 0;
          let s1 = 0;
          for (let a = 0; a < MAX_ROLL; a++) {
            const da = dest[base + a] as number;
            for (let b = 0; b < MAX_ROLL; b++) {
              const db = dest[base + b] as number;
              s0 += Math.min(n0[da] as number, n0[db] as number);
              s1 += Math.min(n1[da] as number, n1[db] as number, rr);
            }
          }
          e0 = s0 / 36;
          e1 = s1 / 36;
        } else {
          let s1 = 0;
          for (let r = 0; r < MAX_ROLL; r++) {
            s1 += Math.min(n1[dest[base + r] as number] as number, rr);
          }
          e0 = rr;
          e1 = s1 / MAX_ROLL;
        }
        const x0 = 1 + e0;
        const x1 = hasReroll ? 1 + e1 : x0;
        delta = Math.max(
          delta,
          Math.abs(x0 - (cur0[p] as number)),
          Math.abs(x1 - (cur1[p] as number)),
        );
        cur0[p] = x0;
        cur1[p] = x1;
      }
    }
    if (delta < 1e-8) break;
  }

  const table = (rerollLeft: boolean, k: number): Float64Array =>
    (rerollLeft && hasReroll ? v1 : v0)[k] as Float64Array;
  const afterRoll: Planner['afterRoll'] = (pos, k, f, roll) =>
    (table(f, (k + 1) % period)[dest[pos * MAX_ROLL + roll - 1] as number] as number) + 1;
  const afterReroll: Planner['afterReroll'] = (pos, k) => {
    const n0 = v0[(k + 1) % period] as Float64Array;
    let sum = 0;
    for (let r = 0; r < MAX_ROLL; r++) sum += n0[dest[pos * MAX_ROLL + r] as number] as number;
    return 1 + sum / MAX_ROLL;
  };

  return {
    period,
    turnsLeft: (pos, k, f) => table(f, k % period)[pos] as number,
    afterRoll,
    afterReroll,
    pick(pos, k, f, dice) {
      return afterRoll(pos, k, f, dice[1]) < afterRoll(pos, k, f, dice[0]) - EPS ? 1 : 0;
    },
    shouldReroll(pos, k, roll) {
      return afterReroll(pos, k) < afterRoll(pos, k, true, roll) - EPS;
    },
  };
}

const solved = new Map<string, Planner>();

/**
 * The planner for a layout and rule set, solved once and then reused by every game and every Hard
 * CPU (a pure memo of a deterministic function: there are only a handful of rule combinations).
 * Solving takes a few ms natively; `warmPlanner` lets the menu do it while the player is choosing.
 */
export function getPlanner(layout: BoardLayout, rules: Rules): Planner {
  const key = JSON.stringify([
    layout,
    rules.exactFinish,
    rules.reroll,
    rules.choiceDice,
    rules.choiceEvery,
  ]);
  let p = solved.get(key);
  if (!p) {
    if (solved.size >= 16) solved.clear();
    p = createPlanner(layout, rules);
    solved.set(key, p);
  }
  return p;
}

export const warmPlanner = (layout: BoardLayout, rules: Rules): void =>
  void getPlanner(layout, rules);
