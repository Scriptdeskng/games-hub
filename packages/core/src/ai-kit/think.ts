import type { Scope } from '../lifecycle';
import type { Rng } from '../rng';
import type { DifficultyProfile, Persona } from './types';

export const THINK_MIN_MS = 400;
export const THINK_MAX_MS = 1200;

/**
 * A natural "thinking" pause for a CPU: seeded, 0.4 to 1.2 s, shaped by the persona's own range
 * and the difficulty's thinkScale. Always inside the 400..1200 window.
 */
export function thinkDelayMs(rng: Rng, persona?: Persona, profile?: DifficultyProfile): number {
  const [lo, hi] = persona?.think ?? [THINK_MIN_MS, THINK_MAX_MS];
  const a = Math.min(THINK_MAX_MS, Math.max(THINK_MIN_MS, Math.min(lo, hi)));
  const b = Math.min(THINK_MAX_MS, Math.max(THINK_MIN_MS, Math.max(lo, hi)));
  const ms = (a + rng.next() * (b - a)) * (profile?.thinkScale ?? 1);
  return Math.round(Math.min(THINK_MAX_MS, Math.max(THINK_MIN_MS, ms)));
}

export interface Thinker {
  /** Run `fn` after `ms`; with `instant()` true it runs synchronously. Returns a cancel function. */
  after(ms: number, fn: () => void): () => void;
}

/** Schedules CPU actions through a core scope so destroy() cancels a pending move. */
export function createThinker(scope: Scope, instant: () => boolean = () => false): Thinker {
  return {
    after(ms, fn) {
      if (instant()) {
        fn();
        return () => undefined;
      }
      return scope.timeout(fn, ms);
    },
  };
}
