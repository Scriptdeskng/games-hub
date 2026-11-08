import type { Core } from '@naija/core/boot';
import { randomSeed } from '@naija/core/rng';
import {
  createScreenHost,
  DIFFICULTIES,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { PERSONA_OF, personaById } from './ai';
import { menuMusic, playMusic } from './audio/music';
import { recordResult, scoreFor, type GameState, type Progress } from './rules';
import { HUMAN_ID, createPlay, type Play, type PlayStats } from './view/play';
import {
  createHowToScreen,
  createMenuScreen,
  createResultsScreen,
  createRulesScreen,
  type Settings,
} from './view/screens';

export interface AutoplayOptions {
  difficulty?: Difficulty;
  /** instant autoplay: make the human win (default) or lose */
  win?: boolean;
  /** play a few moves through the real UI and animations, then finish instantly */
  realtime?: boolean;
  /** with `realtime`: how many moves to play live (default 10; a huge number plays the whole game live) */
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
      onDifficulty: (d) => {
        currentDifficulty = d;
        save({ ...progress, lastDifficulty: d });
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
        settings: { rules: progress.rules, fastPlay: progress.fastPlay },
        onChange: (s: Settings) => save({ ...progress, rules: s.rules, fastPlay: s.fastPlay }),
        onClose: showMenu,
      }),
      showRules,
    );
  }

  interface RoundExtras {
    seed?: number;
    test?: { tempo?: number; bot?: boolean; lose?: boolean; liveMoves?: number };
  }

  function buildPlay(d: Difficulty, x: RoundExtras, quiet = false): { play: Play; seed: number } {
    const seed = x.seed ?? nextSeed();
    const test = __NAIJA_TEST__ ? { tempo: urlTempo, ...x.test } : undefined;
    const p = createPlay(core, {
      difficulty: d,
      rules: progress.rules,
      seed,
      fastPlay: progress.fastPlay,
      onMove: (s) =>
        quiet ? undefined : core.portal.emit('score', { score: scoreFor(s, HUMAN_ID) }),
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
    core.portal.emit('start', { level: d });
    // the play screen keeps its own state; re-rendering mid-game would lose it
    show('play', play, null);
    play.start();
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
      stats.bestCapture,
    );
    save(next);
    if (won) core.portal.emit('level_complete', { level: currentDifficulty, score });
    core.portal.emit('end', { score, won, draw: s.draw, level: currentDifficulty });
    core.audio.playSfx(won ? 'win' : 'lose');
    done.forEach((w) => w(s));

    const render = (): void => {
      const id = PERSONA_OF[currentDifficulty];
      const event = s.draw ? 'draw' : won ? 'lose' : 'win';
      const line = `${t(personaById(id).nameKey)}: ${t(`ayo.banter.${id}.${event}`)}`;
      show(
        'results',
        createResultsScreen(core, {
          won,
          draw: s.draw,
          score,
          best: progress.best[currentDifficulty],
          newBest,
          seeds: `${s.store[0]} - ${s.store[1]}`,
          onBoard: s.pits.reduce((a, b) => a + b, 0),
          bestCapture: stats.bestCapture,
          moves: stats.moves,
          wins: progress.wins,
          plays: progress.plays,
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
        const wantWin = opts.win !== false;
        const bot = { bot: true, lose: !wantWin };
        if (opts.realtime) {
          const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
          startRound(d, {
            seed: nextSeed(),
            test: { tempo: urlTempo ?? 0.25, liveMoves: opts.liveMoves ?? 10, ...bot },
          });
          return ended;
        }
        // instant: look for the first seed (from the current one) that gives the wanted result
        const base = nextSeed();
        let seed = base;
        for (let i = 0; i < 80; i++) {
          seed = (base + i) >>> 0;
          const probe = buildPlay(d, { seed, test: bot }, true);
          const result = probe.play.fastForward?.();
          probe.play.destroy();
          if (result && (result.winner === HUMAN_ID) === wantWin && !result.draw) break;
        }
        startRound(d, { seed, test: bot });
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
