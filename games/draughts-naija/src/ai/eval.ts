import { LIGHT, isKing, type Cells, type Side } from '../rules/board';
import type { Rules } from '../rules/config';

/** Scale: a man is worth 100. */
export const MAN = 100;

/** Value of a king: flying kings are worth about three men, one-step kings about two and a quarter. */
export const kingValue = (rules: Rules): number => (rules.flyingKings ? 310 : 225);

/**
 * Static evaluation from the point of view of `side` to move: material (men and kings),
 * advancement (a man is worth more the nearer it is to crowning), the back row guarding the crowning
 * squares, centre control and a small edge penalty. Pure and cheap: one pass over the board.
 */
export function evaluate(board: Cells, side: Side, rules: Rules): number {
  const n = rules.size;
  const kv = kingValue(rules);
  const lo = Math.floor(n / 4);
  const hi = n - 1 - lo;
  const mid = (n - 1) / 2;
  let score = 0; // light minus dark
  for (let r = 0; r < n; r++) {
    for (let c = (r + 1) & 1; c < n; c += 2) {
      const v = board[r * n + c] as number;
      if (v === 0) continue;
      const light = v > 0;
      let val: number;
      if (isKing(v)) {
        // kings like the centre: up to 8 points
        val = kv + 8 - Math.round((Math.abs(r - mid) + Math.abs(c - mid)) * (8 / n));
      } else {
        const adv = light ? n - 1 - r : r;
        val = MAN + adv * 3;
        if (adv === 0) val += 6; // back-row guard
        if (c === 0 || c === n - 1) val -= 2;
        else if (c >= lo && c <= hi && r >= lo && r <= hi) val += 3; // centre
      }
      score += light ? val : -val;
    }
  }
  return side === LIGHT ? score : -score;
}
