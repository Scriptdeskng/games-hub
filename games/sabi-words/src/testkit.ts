import type { Difficulty, GameState } from './rules';

/**
 * Test-build types and bookkeeping. Everything that uses this lives behind `__NAIJA_TEST__` in
 * app.ts, so production bundles carry none of it (scripts/prod-gate.mjs enforces that).
 */
export interface AutoplayOptions {
  difficulty?: Difficulty;
  pack?: string;
  mode?: 'classic' | 'daily';
  /** solve every word (default) or let the clock run out */
  win?: boolean;
  /** play in real time through the real clock and render loop (perf and soak) */
  realtime?: boolean;
}

/** What window.__naijaTest drives. */
export interface TestApi {
  autoplay(opts?: AutoplayOptions): Promise<GameState>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
}

export interface AutoStats {
  rounds: number;
  maxMs: number;
  rescues: string[];
}
export const newAutoStats = (): AutoStats => ({ rounds: 0, maxMs: 0, rescues: [] });

/** `?tempo=0.2` (test builds only) runs the game clock 5x faster. */
export const urlTempo = (): number | undefined =>
  Number(new URLSearchParams(location.search).get('tempo')) || undefined;

/** `?pack=<url>` (test builds only) swaps the pack, to test failure and validation screens. */
export const urlPackOverride = (): string | null =>
  new URLSearchParams(location.search).get('pack');

/** `?clock=9000` (test builds only) starts every round with that many ms on the clock. */
export const urlClock = (): number | undefined =>
  Number(new URLSearchParams(location.search).get('clock')) || undefined;
