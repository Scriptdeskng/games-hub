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
import {
  CPU_COUNTS,
  homeCount,
  playerById,
  recordResult,
  scoreFor,
  seedsPer,
  type GameState,
  type MoveRecord,
  type Progress,
} from './rules';
import { createPlay, HUMAN_ID, type Play, type PlayStats } from './view/play';
import {
  createHowToScreen,
  createMenuScreen,
  createResultsScreen,
  createRulesScreen,
  type Settings,
} from './view/screens';

export interface AutoplayOptions {
  difficulty?: Difficulty;
  /** number of CPU opponents (1 or 3) */
  cpus?: number;
  /** quick mode (2 seeds) for this round */
  quick?: boolean;
  /** instant autoplay: make the human win (default) or lose */
  win?: boolean;
  /** play a few steps through the real UI and animations, then finish instantly */
  realtime?: boolean;
  /** with `realtime`: how many steps to play live (default 14; a huge number plays the whole game live) */
  liveMoves?: number;
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
      quick: progress.rules.quick,
      onDifficulty: (d) => {
        currentDifficulty = d;
        save({ ...progress, lastDifficulty: d });
      },
      onCpuCount: (n) => {
        if (CPU_COUNTS.includes(n)) save({ ...progress, cpuCount: n });
      },
      onMode: (quick) => save({ ...progress, rules: { ...progress.rules, quick } }),
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
          autoMove: progress.autoMove,
          fastPlay: progress.fastPlay,
        },
        onChange: (s: Settings) =>
          save({ ...progress, rules: s.rules, autoMove: s.autoMove, fastPlay: s.fastPlay }),
        onClose: showMenu,
      }),
      showRules,
    );
  }

  interface RoundExtras {
    seed?: number;
    cpus?: number;
    quick?: boolean;
    test?: { tempo?: number; bot?: boolean; liveMoves?: number };
  }

  function buildPlay(d: Difficulty, x: RoundExtras, quiet = false): { play: Play; seed: number } {
    const seed = x.seed ?? nextSeed();
    const test = __NAIJA_TEST__ ? { tempo: urlTempo, ...x.test } : undefined;
    const rules = x.quick === undefined ? progress.rules : { ...progress.rules, quick: x.quick };
    const p = createPlay(core, {
      difficulty: d,
      cpuCount: x.cpus ?? progress.cpuCount,
      rules,
      seed,
      autoMove: progress.autoMove,
      fastPlay: progress.fastPlay,
      onMove: (s, m) => (quiet ? undefined : reportMove(s, m)),
      onEnd: finishRound,
      onRestart: () => startRound(d, x.quick === undefined ? {} : { quick: x.quick }),
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
      quick: x.quick ?? progress.rules.quick,
    });
    // the play screen keeps its own state; re-rendering mid-game would lose it
    show('play', play, null);
    play.start();
  }

  function reportMove(s: GameState, _m: MoveRecord): void {
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
    const { next, newBest } = recordResult(
      progress,
      s,
      currentDifficulty,
      HUMAN_ID,
      stats.captures,
    );
    save(next);
    if (won) core.portal.emit('level_complete', { level: currentDifficulty, score });
    core.portal.emit('end', { score, won, level: currentDifficulty });
    core.audio.playSfx(won ? 'win' : 'lose');
    done.forEach((w) => w(s));

    const render = (): void => {
      // the winner speaks on a loss; on a win one of the opponents concedes
      const seat = won ? s.turns.seats[1] : s.turns.seats.find((x) => x.id === s.winner);
      const personaId =
        seat?.persona ?? (pickPersonas(s.seed, s.turns.seats.length - 1)[0] as string);
      const line = `${t(personaById(personaId).nameKey)}: ${t(`ludo.banter.${personaId}.${won ? 'lose' : 'win'}`)}`;
      const me = playerById(s, HUMAN_ID);
      show(
        'results',
        createResultsScreen(core, {
          won,
          score,
          best: progress.best[currentDifficulty],
          newBest,
          captures: stats.captures,
          home: `${homeCount(me)}/${seedsPer(s.rules)}`,
          wins: progress.wins,
          plays: progress.plays,
          streak: progress.streak,
          banter: line,
          onReplay: () => startRound(currentDifficulty),
          onMenu: showMenu,
        }),
        render,
      );
    };
    render();
  }

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
            quick: opts.quick,
            test: { tempo: urlTempo ?? 0.25, bot: true, liveMoves: opts.liveMoves ?? 14 },
          });
          return ended;
        }
        // instant: look for the first seed (from the current one) that gives the wanted result
        const wantWin = opts.win !== false;
        const base = nextSeed();
        let seed = base;
        for (let i = 0; i < 80; i++) {
          seed = (base + i) >>> 0;
          const probe = buildPlay(d, { seed, cpus, quick: opts.quick }, true);
          const result = probe.play.fastForward?.();
          probe.play.destroy();
          if (result && (result.winner === HUMAN_ID) === wantWin) break;
        }
        startRound(d, { seed, cpus, quick: opts.quick });
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
