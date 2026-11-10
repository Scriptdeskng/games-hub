import { DIFFICULTIES, type Difficulty } from '@naija/core/ui-kit';
import { botController, cpuController, createBot, simulate, type HumanBot } from './ai';
import {
  isMode,
  type Cup,
  type Mode,
  type Progress,
  type Shootout,
  YOU,
  nextOpponent,
} from './rules';
import type { Play } from './view/play';
import type { MatchExtras } from './app';

/**
 * Test builds only (everything that reaches this file is behind `__NAIJA_TEST__`, and the build strips
 * it: scripts/prod-gate.mjs checks the shipped bundle). It is what `window.__naijaTest` drives: it
 * plays the HUMAN seat with a scripted bot, so Playwright can run whole shootouts and cups.
 */
export interface AutoplayOptions {
  difficulty?: Difficulty;
  mode?: Mode;
  /** make the human win (default) or lose */
  win?: boolean;
  /** play through the real UI and render loop, at test speed (perf and soak) */
  realtime?: boolean;
}

export interface TestApi {
  autoplay(opts?: AutoplayOptions): Promise<Shootout | null>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
}

export interface KitHost {
  screenId(): string;
  difficulty(): Difficulty;
  setDifficulty(d: Difficulty): void;
  mode(): Mode;
  seed(): number | null;
  setSeed(n: number): void;
  progress(): Progress;
  play(): Play | null;
  cup(): Cup | null;
  current(): { mode: Mode; round: string | null; opp: string } | null;
  nextSeed(): number;
  startQuick(m: Mode, extra: MatchExtras): void;
  startCup(): void;
  playCupMatch(extra: MatchExtras): void;
  finish(s: Shootout): void;
  waitForEnd(): Promise<Shootout>;
}

/** A realtime match that has not ended after this long is finished at once and reported. */
const STALL_MS = 120_000;
const FAST = 0.2;

/** A bot that wins when it can (sweet shots at the corners) or loses on purpose (every shot wide). */
const botFor = (win: boolean): HumanBot =>
  win ? createBot() : createBot({ sideX: 5.5, power: 0.62 });

/** Play a shootout on the engine at once, trying seeds from `base` until the human gets the result asked for. */
function pick(base: number, d: Difficulty, win: boolean): Shootout {
  const bot = botFor(win);
  let s = simulate(base, [botController(bot, base), cpuController(d, 1)]);
  for (let i = 1; i < 16 && (s.winner === 0) !== win; i++) {
    const seed = (base + i) >>> 0;
    s = simulate(seed, [botController(bot, seed), cpuController(d, 1)]);
  }
  return s;
}

export function createTestKit(h: KitHost): TestApi {
  const log = { rounds: 0, maxMs: 0, rescues: [] as { round: number; kicks: number }[] };

  async function realtime(m: Mode, win: boolean): Promise<Shootout | null> {
    const t0 = performance.now();
    const ended = h.waitForEnd();
    const extra: MatchExtras = { tempo: FAST, bot: botFor(win), seed: h.seed() ?? undefined };
    if (m === 'cup') h.playCupMatch(extra);
    else h.startQuick(m, extra);
    let stall = 0;
    const timeout = new Promise<Shootout | null>((resolve) => {
      stall = window.setTimeout(() => {
        const p = h.play();
        log.rescues.push({ round: log.rounds, kicks: p ? p.snapshot().state.kicks.length : -1 });
        const base = h.seed() ?? h.nextSeed();
        const s = pick(base, h.difficulty(), win);
        if (p) h.finish(s);
        resolve(s);
      }, STALL_MS);
    });
    const s = await Promise.race([ended, timeout]);
    window.clearTimeout(stall);
    log.rounds++;
    log.maxMs = Math.max(log.maxMs, performance.now() - t0);
    return s;
  }

  async function autoplay(opts: AutoplayOptions = {}): Promise<Shootout | null> {
    const d = DIFFICULTIES.includes(opts.difficulty as Difficulty)
      ? (opts.difficulty as Difficulty)
      : h.difficulty();
    h.setDifficulty(d);
    const m: Mode = isMode(opts.mode) ? opts.mode : 'quick';
    const win = opts.win !== false;
    let last: Shootout | null = null;
    if (m === 'practice') {
      h.startQuick('practice', { tempo: FAST, bot: botFor(true) });
      return null;
    }
    if (m === 'cup') h.startCup();
    do {
      const base = h.seed() ?? h.nextSeed();
      if (opts.realtime) last = await realtime(m, win);
      else {
        last = pick(base, d, win);
        if (m === 'cup') h.playCupMatch({ seed: last.seed });
        else h.startQuick('quick', { seed: last.seed });
        h.finish(last);
        log.rounds++;
      }
    } while (m === 'cup' && last && last.winner === 0 && !h.cup()?.over);
    return last;
  }

  return {
    autoplay,
    getState: () => {
      const p = h.play();
      const cup = h.cup();
      return {
        screen: h.screenId(),
        difficulty: h.difficulty(),
        mode: h.mode(),
        seed: h.seed(),
        progress: h.progress(),
        cup,
        opponent: cup ? nextOpponent(cup) : null,
        match: h.current(),
        you: YOU,
        round: p ? p.snapshot() : null,
        autoplay: log,
      };
    },
    setSeed: (n) => h.setSeed(n),
    get screen() {
      return h.screenId();
    },
  };
}
