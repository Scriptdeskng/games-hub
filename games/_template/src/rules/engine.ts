import { createRng } from '@naija/core/rng';
import { BASE_POINTS, COMBO_BONUS, COMBO_BONUS_CAP, PROFILES, type Difficulty } from './config';

/** A bell on screen. x and y are fractions (0..1) of the free arena space. */
export interface Target {
  id: number;
  x: number;
  y: number;
  /** remaining life (ms) */
  ttlMs: number;
}

export type Status = 'playing' | 'won' | 'lost';

/** Fully serializable game state (JSON-safe). */
export interface GameState {
  difficulty: Difficulty;
  seed: number;
  /** RNG state, so a save restores the exact same future */
  rng: number;
  status: Status;
  timeLeftMs: number;
  spawnInMs: number;
  nextId: number;
  targets: Target[];
  score: number;
  hits: number;
  misses: number;
  combo: number;
  bestCombo: number;
}

export function createGame(difficulty: Difficulty, seed: number): GameState {
  const p = PROFILES[difficulty];
  return {
    difficulty,
    seed,
    rng: createRng(seed).getState(),
    status: 'playing',
    timeLeftMs: p.durationMs,
    spawnInMs: 300,
    nextId: 1,
    targets: [],
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
  };
}

const finish = (s: GameState): GameState =>
  s.hits >= PROFILES[s.difficulty].goal
    ? { ...s, status: 'won' }
    : s.timeLeftMs <= 0
      ? { ...s, status: 'lost', timeLeftMs: 0, targets: [] }
      : s;

/** Advance time by dtMs: bells age and expire (a miss), new bells spawn, the clock runs. */
export function tick(s: GameState, dtMs: number): GameState {
  if (s.status !== 'playing') return s;
  const p = PROFILES[s.difficulty];
  const rng = createRng(0);
  rng.setState(s.rng);

  let targets = s.targets;
  let misses = s.misses;
  let combo = s.combo;
  if (targets.length) {
    const aged = targets.map((t) => ({ ...t, ttlMs: t.ttlMs - dtMs }));
    const alive = aged.filter((t) => t.ttlMs > 0);
    if (alive.length !== aged.length) {
      misses += aged.length - alive.length;
      combo = 0;
    }
    targets = alive;
  }

  let spawnInMs = s.spawnInMs - dtMs;
  let nextId = s.nextId;
  // never leave the arena empty for long: an empty arena respawns on the next tick
  if (targets.length === 0 && spawnInMs > 120) spawnInMs = 120;
  if (spawnInMs <= 0) {
    if (targets.length < p.maxTargets) {
      targets = [...targets, { id: nextId++, x: rng.next(), y: rng.next(), ttlMs: p.lifetimeMs }];
    }
    spawnInMs += p.spawnGapMs * rng.range(0.8, 1.2);
    if (spawnInMs < 0) spawnInMs = p.spawnGapMs;
  }

  return finish({
    ...s,
    rng: rng.getState(),
    timeLeftMs: Math.max(0, s.timeLeftMs - dtMs),
    spawnInMs,
    nextId,
    targets,
    misses,
    combo,
  });
}

/** The player tapped bell `id`. Unknown ids (already vanished) are ignored. */
export function hit(s: GameState, id: number): GameState {
  if (s.status !== 'playing' || !s.targets.some((t) => t.id === id)) return s;
  const combo = s.combo + 1;
  return finish({
    ...s,
    targets: s.targets.filter((t) => t.id !== id),
    hits: s.hits + 1,
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
    score: s.score + BASE_POINTS + Math.min(s.combo, COMBO_BONUS_CAP) * COMBO_BONUS,
  });
}

/** The player tapped empty space: a miss that breaks the combo. */
export function missTap(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  return { ...s, misses: s.misses + 1, combo: 0 };
}

/** The bell that has been waiting longest (lowest ttl), or null. Used by keyboard and autoplay. */
export function oldestTarget(s: GameState): number | null {
  let best: Target | null = null;
  for (const t of s.targets) if (!best || t.ttlMs < best.ttlMs) best = t;
  return best ? best.id : null;
}

/** hits / (hits + misses), 0..1 */
export function accuracy(s: GameState): number {
  const n = s.hits + s.misses;
  return n === 0 ? 0 : s.hits / n;
}

/** 0 = lost, 1 = won, 2 = won with >= 70% accuracy, 3 = also finished with >= 25% time left. */
export function stars(s: GameState): 0 | 1 | 2 | 3 {
  if (s.status !== 'won') return 0;
  if (accuracy(s) < 0.7) return 1;
  return s.timeLeftMs >= PROFILES[s.difficulty].durationMs * 0.25 ? 3 : 2;
}
