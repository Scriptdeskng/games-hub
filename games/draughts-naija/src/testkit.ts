import { createRng } from '@naija/core/rng';
import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { decide, decisionSeed } from './ai/decide';
import { LIGHT } from './rules/board';
import type { Rules, Size } from './rules/config';
import { applyMove, createGame, isOver, legalMoves, type GameState } from './rules/engine';
import type { Move } from './rules/movegen';
import type { Progress } from './rules/progress';
import type { Play, PlayStats } from './view/play';

/**
 * Test builds only (everything that reaches this file is behind `__NAIJA_TEST__`, and the build
 * strips it: scripts/prod-gate.mjs checks the shipped bundle). It is what `window.__naijaTest`
 * drives: it plays the HUMAN seat through the real engine, so Playwright can run whole games.
 */
export interface AutoplayOptions {
  difficulty?: Difficulty;
  size?: Size;
  /** make the human win (default) or lose */
  win?: boolean;
  /** play through the real UI, animations and Web Worker, at test speed (perf and soak) */
  realtime?: boolean;
}

export interface TestApi {
  autoplay(opts?: AutoplayOptions): Promise<GameState>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
}

export interface KitHost {
  screenId(): string;
  difficulty(): Difficulty;
  size(): Size;
  setSize(s: Size): void;
  seed(): number | null;
  setSeed(n: number): void;
  progress(): Progress;
  play(): Play | null;
  rules(): Rules;
  nextSeed(): number;
  start(
    d: Difficulty,
    x: { seed?: number; test?: { tempo?: number; player?: (s: GameState) => Move } },
  ): void;
  finish(s: GameState, stats: PlayStats): void;
  waitForEnd(): Promise<GameState>;
}

/** A realtime round that has not ended after this long is finished at once and reported. */
const STALL_MS = 150_000;

/** The human's moves: a small search to win, plain random moves to lose. */
function humanPlayer(win: boolean, seed: number): (s: GameState) => Move {
  const rng = createRng(seed ^ 0x600d);
  return (s) =>
    win ? decide(s, 'hard', decisionSeed(s.seed, s.plies), 500).move : rng.pick(legalMoves(s));
}

/** Play a whole game on the engine at once (no UI): the human seat is `humanPlayer`, the CPU a cheap search. */
function simulate(
  rules: Rules,
  d: Difficulty,
  win: boolean,
  seed: number,
): { s: GameState; stats: PlayStats } {
  let s = createGame({ seed, rules });
  const stats: PlayStats = { moves: 0, captured: 0, lost: 0, bestCapture: 0, kings: 0, hints: 0 };
  const human = humanPlayer(win, seed);
  while (!isOver(s)) {
    const mine = s.turn === LIGHT;
    // to win, the CPU plays Easy; to lose it plays the chosen level, within a small budget
    const m = mine
      ? human(s)
      : decide(s, win ? 'easy' : d, decisionSeed(s.seed, s.plies), 400).move;
    s = applyMove(s, m);
    const rec = s.lastMove;
    if (!rec) continue;
    if (mine) {
      stats.moves++;
      stats.captured += rec.caps.length;
      stats.bestCapture = Math.max(stats.bestCapture, rec.caps.length);
      if (rec.crowned) stats.kings++;
    } else stats.lost += rec.caps.length;
  }
  return { s, stats };
}

export function createTestKit(h: KitHost): TestApi {
  const log = { rounds: 0, maxMs: 0, rescues: [] as { round: number; plies: number }[] };

  async function autoplay(opts: AutoplayOptions = {}): Promise<GameState> {
    const d = DIFFICULTIES.includes(opts.difficulty as Difficulty)
      ? (opts.difficulty as Difficulty)
      : h.difficulty();
    if (opts.size === 10 || opts.size === 8) h.setSize(opts.size);
    const win = opts.win !== false;
    const t0 = performance.now();
    if (opts.realtime) {
      const base = h.seed() ?? h.nextSeed();
      const ended = h.waitForEnd();
      h.start(d, { seed: base, test: { tempo: 0.2, player: humanPlayer(win, base) } });
      const stall = window.setTimeout(() => {
        const p = h.play();
        log.rescues.push({ round: log.rounds, plies: p ? p.snapshot().plies : -1 });
        const sim = simulate(h.rules(), d, win, base);
        h.finish(sim.s, sim.stats);
      }, STALL_MS);
      const s = await ended;
      window.clearTimeout(stall);
      log.rounds++;
      log.maxMs = Math.max(log.maxMs, performance.now() - t0);
      return s;
    }
    // instant: find a seed (from the current one) that gives the wanted result
    const base = h.seed() ?? h.nextSeed();
    let pick = simulate(h.rules(), d, win, base);
    for (let i = 1; i < 12 && (pick.s.result?.winner === LIGHT) !== win; i++) {
      pick = simulate(h.rules(), d, win, (base + i) >>> 0);
    }
    h.start(d, { seed: pick.s.seed });
    h.finish(pick.s, pick.stats);
    log.rounds++;
    return pick.s;
  }

  return {
    autoplay,
    getState: () => {
      const p = h.play();
      return {
        screen: h.screenId(),
        difficulty: h.difficulty(),
        size: h.size(),
        seed: h.seed(),
        progress: h.progress(),
        round: p ? p.snapshot() : null,
        legal: p ? legalMoves(p.snapshot()) : [],
        stats: p ? p.stats() : null,
        ai: p ? p.ai() : null,
        thinkTimes: p ? p.thinkTimes() : [],
        autoplay: log,
      };
    },
    setSeed: (n) => h.setSeed(n),
    get screen() {
      return h.screenId();
    },
  };
}
