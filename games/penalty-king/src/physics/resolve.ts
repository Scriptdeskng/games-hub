import { BALL_R, GOAL_H, GOAL_HALF_W, POST_TOUCH } from './constants';
import { inReach, keeperPoseInto, type KeeperPlan, type KeeperPose } from './keeper';
import type { Shot } from './shot';

export type KickOutcome = 'goal' | 'saved' | 'miss' | 'post';
/** What happened to the ball at the goal plane. */
export type Impact = 'in' | 'wide' | 'over' | 'post' | 'bar';

export interface Resolution {
  outcome: KickOutcome;
  impact: Impact;
  /** where the keeper's hands were when the ball arrived */
  keeper: KeeperPose;
}

/** Where a shot meets the goal plane: in, wide, over, or on the woodwork. Pure geometry. */
export function impactOf(tx: number, ty: number): Impact {
  const ax = Math.abs(tx);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return 'wide';
  if (ax > GOAL_HALF_W + POST_TOUCH) return 'wide';
  if (ty > GOAL_H + POST_TOUCH) return 'over';
  if (ax > GOAL_HALF_W - POST_TOUCH) return 'post';
  if (ty > GOAL_H - POST_TOUCH) return 'bar';
  return 'in';
}

/** Wood is a no-goal: the ball rebounds into play. A save needs a shot that is on target. */
export function resolveKick(shot: Shot, plan: KeeperPlan): Resolution {
  const keeper = keeperPoseInto(plan, shot.flight, { x: 0, y: 0, p: 0 });
  const impact = impactOf(shot.tx, shot.ty);
  let outcome: KickOutcome;
  if (impact === 'in') {
    outcome = inReach(keeper, plan.zone, shot.tx, Math.max(shot.ty, BALL_R), keeper.p)
      ? 'saved'
      : 'goal';
  } else if (impact === 'post' || impact === 'bar') outcome = 'post';
  else outcome = 'miss';
  return { outcome, impact, keeper };
}
