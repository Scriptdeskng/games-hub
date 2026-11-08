import type { Core } from '@naija/core/boot';
import { randomSeed } from '@naija/core/rng';
import {
  createScreenHost,
  type Component,
  type Difficulty,
  DIFFICULTIES,
} from '@naija/core/ui-kit';
import { personaById, pickPersonas } from './ai';
import { menuMusic, playMusic } from './audio/music';
import { CPU_COUNTS, handOf, recordResult, scoreFor, type GameState, type Progress } from './rules';
import { createPlay, HUMAN_ID, type Play, type PlayDiag, type PlayStats } from './view/play';
import {
  createHowToScreen,
  createMenuScreen,
  createResultsScreen,
  createRulesScreen,
  type Settings,
} from './view/screens';

export interface AutoplayOptions {
  difficulty?: Difficulty;
  /** number of CPU opponents (1, 2 or 3) */
  cpus?: number;
  /** instant autoplay: make the human win (default) or lose */
  win?: boolean;
  /** play a few steps through the real UI and animations, then finish instantly */
  realtime?: boolean;
  /** with `realtime`: how many steps to play live (default 14; a huge number plays the whole game live) */
  liveMoves?: number;
  /** with `realtime`: wall-clock limit for one round before the guard finishes it (default 120 s) */
  budgetMs?: number;
}

/** Test builds only: what the autoplay rounds did, so a slow or stuck round can be explained. */
export interface AutoplayDiag {
  rounds: number;
  maxMs: number;
  lastMs: number;
  /** rounds that hit the wall-clock guard: each one is a stall (the flow was held somewhere) */
  rescues: {
    ms: number;
    /** wall-clock time minus monotonic time: how long the machine slept during the round */
    sleptMs: number;
    screen: string;
    hidden: boolean;
    flow: PlayDiag | null;
  }[];
}

/** Test builds only: what window.__naijaTest drives. Not part of the production app object. */
export interface TestApi {
  autoplay(opts?: AutoplayOptions): Promise<GameState>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
}

export interface App {
  showMenu(): void;
  destroy(): void;
  /** present only when `__NAIJA_TEST__` is true: production builds carry no test members at all */
  readonly test?: TestApi;
}

export function createApp(core: Core, initial: Progress): App {
  const host = createScreenHost(core.root);
  const { t } = core;
  let progress = initial;
  let play: Play | null = null;
  let roundOpen = false;
  let currentDifficulty: Difficulty = progress.lastDifficulty;
  let seedOverride: number | null = null;
  let rerender: (() => void) | null = null;
  let waiters: ((s: GameState) => void)[] = [];
  /** test builds only: `?tempo=0.2` speeds every animation and CPU pause up */
  const diag: AutoplayDiag = { rounds: 0, maxMs: 0, lastMs: 0, rescues: [] };
  const urlTempo = __NAIJA_TEST__
    ? Number(new URLSearchParams(location.search).get('tempo')) || undefined
    : undefined;

  const save = (next: Progress): void => {
    progress = next;
    void core.portal.saveProgress(progress);
  };
  const nextSeed = (): number => seedOverride ?? randomSeed();
  const show = (id: string, c: Component, again: (() => void) | null): void => {
    rerender = again;
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  function showMenu(): void {
    abandonRound();
    core.audio.playMusic(menuMusic);
    const c = createMenuScreen(core, {
      difficulty: currentDifficulty,
      cpuCount: progress.cpuCount,
      onDifficulty: (d) => {
        currentDifficulty = d;
        save({ ...progress, lastDifficulty: d });
      },
      onCpuCount: (n) => {
        if (CPU_COUNTS.includes(n)) save({ ...progress, cpuCount: n });
      },
      onPlay: () => startRound(currentDifficulty),
      onHowTo: showHowTo,
      onRules: showRules,
    });
    show('menu', c, showMenu);
  }

  function showHowTo(): void {
    show('howto', createHowToScreen(core, showMenu), showHowTo);
  }

  function showRules(): void {
    show(
      'rules',
      createRulesScreen(core, {
        settings: {
          rules: progress.rules,
          autoDraw: progress.autoDraw,
          fastPlay: progress.fastPlay,
        },
        onChange: (s: Settings) =>
          save({ ...progress, rules: s.rules, autoDraw: s.autoDraw, fastPlay: s.fastPlay }),
        onClose: showMenu,
      }),
      showRules,
    );
  }

  interface RoundExtras {
    seed?: number;
    cpus?: number;
    test?: { tempo?: number; bot?: boolean; liveMoves?: number };
  }

  function buildPlay(d: Difficulty, x: RoundExtras, quiet = false): { play: Play; seed: number } {
    const seed = x.seed ?? nextSeed();
    const test = __NAIJA_TEST__ ? { tempo: urlTempo, ...x.test } : undefined;
    const p = createPlay(core, {
      difficulty: d,
      cpuCount: x.cpus ?? progress.cpuCount,
      rules: progress.rules,
      seed,
      autoDraw: progress.autoDraw,
      fastPlay: progress.fastPlay,
      onMove: (s) => (quiet ? undefined : reportMove(s)),
      onEnd: finishRound,
      onRestart: () => startRound(d),
      onQuit: showMenu,
      test,
    });
    return { play: p, seed };
  }

  function startRound(d: Difficulty, x: RoundExtras = {}): void {
    abandonRound();
    currentDifficulty = d;
    const built = buildPlay(d, x);
    play = built.play;
    roundOpen = true;
    save({ ...progress, games: progress.games + 1 });
    core.audio.playMusic(playMusic);
    core.portal.emit('start', {
      level: d,
      cpus: x.cpus ?? progress.cpuCount,
    });
    // the play screen keeps its own state; re-rendering mid-game would lose it
    show('play', play, null);
    play.start();
  }

  function reportMove(s: GameState): void {
    core.portal.emit('score', { score: scoreFor(s, HUMAN_ID) });
  }

  /** Leaving a game that is still running (quit, restart) ends it for the portal too. */
  function abandonRound(): void {
    if (roundOpen && play) {
      core.portal.emit('end', {
        score: scoreFor(play.snapshot(), HUMAN_ID),
        won: false,
        quit: true,
        level: currentDifficulty,
      });
    }
    roundOpen = false;
    play = null;
  }

  function finishRound(s: GameState, stats: PlayStats): void {
    const done = waiters;
    waiters = [];
    roundOpen = false;
    play = null;
    const won = s.winner === HUMAN_ID;
    const score = scoreFor(s, HUMAN_ID);
    const { next, newBest } = recordResult(progress, s, currentDifficulty, HUMAN_ID, stats.catches);
    save(next);
    if (won) core.portal.emit('level_complete', { level: currentDifficulty, score });
    core.portal.emit('end', { score, won, level: currentDifficulty });
    core.audio.playSfx(won ? 'win' : 'lose');
    done.forEach((w) => w(s));

    const render = (): void => {
      // the winner speaks on a loss; on a win Mama Nkechi concedes
      const seat = won ? s.turns.seats[1] : s.turns.seats.find((x) => x.id === s.winner);
      const personaId = seat?.persona ?? (pickPersonas(s.turns.seats.length - 1)[0] as string);
      const line = `${t(personaById(personaId).nameKey)}: ${t(`whot.banter.${personaId}.${won ? 'lose' : 'win'}`)}`;
      show(
        'results',
        createResultsScreen(core, {
          won,
          score,
          best: progress.best[currentDifficulty],
          newBest,
          cardsLeft: handOf(s, HUMAN_ID).length,
          catches: stats.catches,
          wins: progress.wins,
          plays: progress.plays,
          streak: progress.streak,
          banter: line,
          endedBy: s.endedBy,
          onReplay: () => startRound(currentDifficulty),
          onMenu: showMenu,
        }),
        render,
      );
    };
    render();
  }

  /**
   * Test builds: a round must always end. If `ended` has not settled after `budgetMs`, record
   * what the flow was doing (paused dialog? tab hidden? whose turn?) and play the rest at once;
   * with no round left to finish, reject. A normal round takes seconds, so this only ever fires
   * on a real stall, and the soak fails on every rescue.
   */
  const guarded = __NAIJA_TEST__
    ? (ended: Promise<GameState>, budgetMs: number): Promise<GameState> => {
        const t0 = performance.now();
        const wall0 = Date.now();
        let timer = 0;
        const rescue = new Promise<GameState>((resolve, reject) => {
          timer = window.setTimeout(() => {
            const live = play;
            diag.rescues.push({
              ms: Math.round(performance.now() - t0),
              sleptMs: Math.max(0, Math.round(Date.now() - wall0 - (performance.now() - t0))),
              screen: host.screenId,
              hidden: document.hidden,
              flow: live?.diag?.() ?? null,
            });
            const s = live?.fastForward?.();
            if (!live || !s)
              return reject(new Error('autoplay round stalled and has no game to finish'));
            finishRound(s, live.stats());
            resolve(s);
          }, budgetMs);
        });
        return Promise.race([ended, rescue]).finally(() => {
          window.clearTimeout(timer);
          diag.rounds++;
          diag.lastMs = Math.round(performance.now() - t0);
          diag.maxMs = Math.max(diag.maxMs, diag.lastMs);
        });
      }
    : undefined;

  // Test-only: `__NAIJA_TEST__` is false in production builds, so this whole function (and the
  // word "autoplay") is removed from the shipped bundle. scripts/prod-gate.mjs enforces it.
  const autoplay: TestApi['autoplay'] | undefined = __NAIJA_TEST__
    ? async (opts = {}) => {
        const d = DIFFICULTIES.includes(opts.difficulty as Difficulty)
          ? (opts.difficulty as Difficulty)
          : currentDifficulty;
        const cpus = CPU_COUNTS.includes(opts.cpus as number)
          ? (opts.cpus as number)
          : progress.cpuCount;
        if (opts.realtime) {
          const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
          startRound(d, {
            seed: nextSeed(),
            cpus,
            test: { tempo: urlTempo ?? 0.25, bot: true, liveMoves: opts.liveMoves ?? 14 },
          });
          return (guarded as NonNullable<typeof guarded>)(ended, opts.budgetMs ?? 120_000);
        }
        // instant: look for the first seed (from the current one) that gives the wanted result
        const wantWin = opts.win !== false;
        const base = nextSeed();
        let seed = base;
        for (let i = 0; i < 80; i++) {
          seed = (base + i) >>> 0;
          const probe = buildPlay(d, { seed, cpus }, true);
          const result = probe.play.fastForward?.();
          probe.play.destroy();
          if (result && (result.winner === HUMAN_ID) === wantWin) break;
        }
        startRound(d, { seed, cpus });
        const live = play as Play;
        const s = live.fastForward?.() as GameState;
        finishRound(s, live.stats());
        return s;
      }
    : undefined;

  const test: TestApi | undefined =
    __NAIJA_TEST__ && autoplay
      ? {
          autoplay,
          getState: () => ({
            screen: host.screenId,
            difficulty: currentDifficulty,
            seed: seedOverride,
            progress,
            round: play ? play.snapshot() : null,
            autoplay: diag,
          }),
          setSeed(n) {
            seedOverride = n >>> 0;
          },
          get screen() {
            return host.screenId;
          },
        }
      : undefined;

  return {
    showMenu,
    destroy() {
      abandonRound();
      host.destroy();
      rerender = null;
    },
    ...(test ? { test } : {}),
  };
}
