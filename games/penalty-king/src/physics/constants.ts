/** Real-world sizes in metres: the goal plane is x in [-3.66, 3.66] (left to right) and y in [0, 2.44] (up). */
export const GOAL_HALF_W = 3.66;
export const GOAL_H = 2.44;
export const BALL_R = 0.11;
/** from the spot to the goal line */
export const SPOT_DIST = 11;
/** how close the ball centre may come to a post or the bar and still touch it (post radius + ball radius) */
export const POST_TOUCH = 0.17;
/** where the ball sits before the kick: on the ground, in the middle */
export const BALL_START_Y = BALL_R;
/** a shot is never aimed further than this from the goal centre (it would be wide anyway) */
export const MAX_AIM_X = 6;
export const MAX_AIM_Y = 4;

/** Power zones (brief section 3): 1 Soft, 2 Good, 3 Sweet, 4 Hard, 5 Over (hit too hard: it flies high). */
export const POWER_EDGES = [0.25, 0.5, 0.75, 0.92] as const;
export type PowerZone = 1 | 2 | 3 | 4 | 5;
export const SWEET_ZONE: PowerZone = 3;
export const OVER_ZONE: PowerZone = 5;

/** metres per second at power 0 and the extra at power 1 */
export const SPEED_MIN = 13;
export const SPEED_RANGE = 17;
/** sideways bow of a full curve at mid flight (metres); it returns to the aim line at the goal */
export const BOW_MAX = 0.9;
/** how much a curve widens the scatter */
export const CURVE_SCATTER = 0.5;
export const SCATTER_X: readonly number[] = [0.28, 0.2, 0.1, 0.34, 0.55];
export const SCATTER_Y_RATIO = 0.7;
/** an Over shot is lifted by this much plus up to the same again */
export const OVER_LIFT = 1.0;
export const OVER_LIFT_RANGE = 0.8;
export const LOFT = 0.35;

/** The keeper: home position, reach (an ellipse around the hands) and how long a dive takes. */
export const KEEPER_HOME = { x: 0, y: 1.0 } as const;
export const REACH_SIDE_X = 1.05;
export const REACH_CENTRE_X = 1.15;
export const REACH_Y = 1.0;
/** a keeper needs this long after a decision to start moving (the human tap lag) */
export const MOTOR_LAG = 0.06;
