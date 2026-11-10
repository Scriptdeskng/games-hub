import { BALL_START_Y } from './constants';
import type { Resolution } from './resolve';
import type { Pose, Shot } from './shot';

/** How long the ball's after-impact motion lasts (seconds). */
export const AFTER_S = 0.7;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);

/**
 * Where the ball goes after it reaches the goal plane, `rt` seconds later: into the net (goal), away
 * off the keeper's hands (saved), back off the wood (post), or on past the goal (miss). `s` may pass
 * 1 (behind the goal line) or fall below it (a rebound). Written into `out`.
 */
export function afterInto(
  shot: Shot,
  res: Pick<Resolution, 'outcome' | 'impact' | 'keeper'>,
  rt: number,
  out: Pose,
): Pose {
  const p = easeOut(clamp01(rt / AFTER_S));
  out.x = shot.tx;
  out.y = shot.ty;
  out.s = 1;
  switch (res.outcome) {
    case 'goal':
      out.s = 1 + 0.12 * p;
      out.y = BALL_START_Y + (shot.ty - BALL_START_Y) * (1 - 0.7 * p);
      break;
    case 'saved': {
      const side = shot.tx >= res.keeper.x ? 1 : -1;
      out.s = 1 - 0.1 * p;
      out.x = shot.tx + side * 0.9 * p;
      out.y = BALL_START_Y + (shot.ty - BALL_START_Y) * (1 - 0.9 * p);
      break;
    }
    case 'post': {
      const side = shot.tx >= 0 ? 1 : -1;
      out.s = 1 - 0.35 * p;
      out.x = shot.tx + side * 0.6 * p;
      out.y = BALL_START_Y + (shot.ty - BALL_START_Y) * (1 - 0.8 * p);
      break;
    }
    default: {
      out.s = 1 + 0.25 * p;
      out.x = shot.tx * (1 + 0.15 * p);
      out.y =
        res.impact === 'over'
          ? shot.ty + 0.8 * p
          : BALL_START_Y + (shot.ty - BALL_START_Y) * (1 - 0.6 * p);
    }
  }
  return out;
}
