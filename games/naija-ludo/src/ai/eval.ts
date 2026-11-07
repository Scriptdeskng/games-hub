import { isSafeSquare, trackDistance, trackIndex } from '../rules/board';
import { LAST_TRACK, MAX_ROLL, type Rules } from '../rules/config';
import { apply, currentPlayer, type GameState, type Move, type Player } from '../rules/engine';

/**
 * Everything here reads the PUBLIC state only: seed positions and the die that was already
 * rolled. The dice rng state in `state.rng` is never looked at, so no CPU can peek at the next roll.
 */

/** What a seed is worth: the steps it would lose when captured, plus the 6 it needs to come out again. */
export const seedValue = (progress: number): number => progress + 12;

/** The square (0..51) of a seed on the shared track, or -1 when it is not on it. */
const squareOf = (p: Player, progress: number): number =>
  progress >= 0 && progress <= LAST_TRACK ? trackIndex(p.slot, progress) : -1;

/**
 * Chance (0..1) that an opponent can capture the seed of `me` standing at `progress` with
 * their next single roll: every opponent seed 1..6 squares behind it, and still on the track at
 * that distance, counts 1/6. Safe squares, home columns and protected stacks cannot be hit.
 */
export function danger(s: GameState, me: Player, progress: number): number {
  const idx = squareOf(me, progress);
  if (idx < 0 || isSafeSquare(idx)) return 0;
  if (s.rules.stacks !== 'off' && me.seeds.filter((x) => x === progress).length >= 2) return 0;
  let hits = 0;
  for (const o of s.players) {
    if (o === me) continue;
    for (const q of o.seeds) {
      if (q < 0 || q > LAST_TRACK) continue;
      const d = trackDistance(trackIndex(o.slot, q), idx);
      if (d >= 1 && d <= MAX_ROLL && q + d <= LAST_TRACK) hits++;
    }
  }
  return Math.min(1, hits / MAX_ROLL);
}

/** Total expected loss over all of a player's seeds if the opponents roll next. */
export function exposure(s: GameState, me: Player): number {
  let total = 0;
  for (const x of me.seeds) if (x >= 0) total += danger(s, me, x) * seedValue(x);
  return total;
}

/** Opponent seeds 1..6 squares ahead of a seed that could be captured by it next turn. */
function prey(s: GameState, me: Player, progress: number): number {
  const idx = squareOf(me, progress);
  if (idx < 0) return 0;
  let value = 0;
  for (const o of s.players) {
    if (o === me) continue;
    for (const q of o.seeds) {
      const at = squareOf(o, q);
      if (at < 0 || isSafeSquare(at)) continue;
      if (s.rules.stacks !== 'off' && o.seeds.filter((x) => x === q).length >= 2) continue;
      const d = trackDistance(idx, at);
      if (d >= 1 && d <= MAX_ROLL) value += seedValue(q) / MAX_ROLL;
    }
  }
  return value;
}

const outCount = (p: Player): number => p.seeds.filter((x) => x >= 0 && x < 56).length;

/**
 * Hard's evaluation of one legal move: the seeds it captures (and the bonus roll), getting a
 * seed out of the yard or home, progress, how much less (or more) exposed my seeds are afterwards,
 * and the chances it creates to capture on the next turn.
 */
export function scoreMove(s: GameState, m: Move): number {
  const me = currentPlayer(s);
  const next = apply(s, { type: 'move', seed: m.seed });
  const meAfter = next.players[s.turns.index] as Player;
  let v = 0;
  for (const c of m.captures) v += 30 + c.from * 0.9;
  if (m.captures.length && s.rules.captureBonus) v += 8;
  if (m.release) v += outCount(me) === 0 ? 34 : 22;
  if (m.home) v += 35;
  v += (m.to - m.from) * 1.0;
  v += (exposure(s, me) - exposure(next, meAfter)) * 1.0;
  v += prey(next, meAfter, m.to) * 0.6;
  // a seed that is safe where it lands (or in its column) is worth keeping there
  if (m.to > LAST_TRACK) v += 3;
  // keep the front runner moving a little: it wins the race
  v += m.to * 0.05;
  return v;
}

export const rulesKey = (r: Rules): string => JSON.stringify(r);
