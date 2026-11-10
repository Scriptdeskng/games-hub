import { MAX_AIM_X } from '../physics';

/** Keyboard aiming: arrows move the aim point, Z and X curl the ball, Space starts the power meter and Space again kicks. */
export interface AimCursor {
  x: number;
  y: number;
  curve: number;
}
export const AIM_START: AimCursor = { x: 0, y: 1.2, curve: 0 };
export const STEP_X = 0.5;
export const STEP_Y = 0.4;
export const KEY_X_MAX = 4.2;
export const KEY_Y_MIN = 0.2;
export const KEY_Y_MAX = 2.8;
/** seconds for the power meter to go 0 -> 1 -> 0 when kicking from the keyboard */
export const POWER_PERIOD = 1.4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function stepAim(c: AimCursor, key: string): AimCursor {
  switch (key) {
    case 'ArrowLeft':
      return { ...c, x: clamp(c.x - STEP_X, -KEY_X_MAX, KEY_X_MAX) };
    case 'ArrowRight':
      return { ...c, x: clamp(c.x + STEP_X, -KEY_X_MAX, KEY_X_MAX) };
    case 'ArrowUp':
      return { ...c, y: clamp(c.y + STEP_Y, KEY_Y_MIN, KEY_Y_MAX) };
    case 'ArrowDown':
      return { ...c, y: clamp(c.y - STEP_Y, KEY_Y_MIN, KEY_Y_MAX) };
    case 'z':
    case 'Z':
    case ',':
      return { ...c, curve: clamp(c.curve - 0.5, -1, 1) };
    case 'x':
    case 'X':
    case '.':
      return { ...c, curve: clamp(c.curve + 0.5, -1, 1) };
    default:
      return c;
  }
}

/** The keyboard power meter: a triangle wave 0 -> 1 -> 0 over POWER_PERIOD seconds. */
export function powerAt(t: number): number {
  if (!Number.isFinite(t) || t < 0) return 0;
  const f = (t / POWER_PERIOD) % 1;
  return 1 - Math.abs(2 * f - 1);
}

export const keyAimLimit = MAX_AIM_X;
