import type { Core } from '@naija/core/boot';
import { randomSeed } from '@naija/core/rng';
import { createScreenHost, type Component, type Difficulty } from '@naija/core/ui-kit';
import { PERSONA_OF, personaById, type WorkerLike } from './ai';
import { menuMusic, playMusic } from './audio/music';
import { LIGHT } from './rules/board';
import { makeRules, type Rules, type Size } from './rules/config';
import type { GameState } from './rules/engine';
import type { Move } from './rules/movegen';
import { recordResult, scoreFor, type Progress } from './rules/progress';
import { createTestKit, type TestApi } from './testkit';
import { createPlay, type Play, type PlayStats } from './view/play';
import {
  createHowToScreen,
  createMenuScreen,
  createResultsScreen,
  createRulesScreen,
  type RuleSettings,
} from './view/screens';

export type { AutoplayOptions, TestApi } from './testkit';

export interface App {
  showMenu(): void;
  destroy(): void;
  /** present only when `__NAIJA_TEST__` is true: production builds carry no test members at all */
  readonly test?: TestApi;
}

/** What the test kit may ask of a round (test builds only). */
export interface RoundExtras {
  seed?: number;
  test?: { tempo?: number; player?: (s: GameState) => Move };
}

export function createApp(
  core: Core,
  initial: Progress,
  deps: { createWorker?: () => WorkerLike } = {},
): App {
  const host = createScreenHost(core.root);
  const { t } = core;
  let progress = initial;
  let play: Play | null = null;
  let roundOpen = false;
  let difficulty: Difficulty = progress.lastDifficulty;
  let size: Size = progress.lastSize;
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
  const rulesNow = (): Rules => makeRules(size, progress.toggles);
  const show = (id: string, c: Component, again: (() => void) | null): void => {
    rerender = again;
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  function showMenu(): void {
    abandonRound();
    core.audio.playMusic(menuMusic);
    show(
      'menu',
      createMenuScreen(core, {
        difficulty,
        size,
        onDifficulty: (d) => {
          difficulty = d;
          save({ ...progress, lastDifficulty: d });
        },
        onSize: (s) => {
          size = s;
          save({ ...progress, lastSize: s });
        },
        onPlay: () => startRound(difficulty),
        onHowTo: showHowTo,
        onRules: showRules,
      }),
      showMenu,
    );
  }

  function showHowTo(): void {
    show('howto', createHowToScreen(core, showMenu), showHowTo);
  }

  function showRules(): void {
    show(
      'rules',
      createRulesScreen(core, {
        settings: { toggles: progress.toggles, fastPlay: progress.fastPlay },
        onChange: (s: RuleSettings) =>
          save({ ...progress, toggles: s.toggles, fastPlay: s.fastPlay }),
        onClose: showMenu,
      }),
      showRules,
    );
  }

  function buildPlay(d: Difficulty, x: RoundExtras): Play {
    return createPlay(core, {
      difficulty: d,
      rules: rulesNow(),
      seed: x.seed ?? nextSeed(),
      fastPlay: progress.fastPlay,
      createWorker: deps.createWorker,
      onMove: (s, st) => core.portal.emit('score', { score: scoreFor(s, st.hints) }),
      onEnd: finishRound,
      onRestart: () => startRound(d),
      onQuit: showMenu,
      test: __NAIJA_TEST__ ? { tempo: urlTempo, ...x.test } : undefined,
    });
  }

  function startRound(d: Difficulty, x: RoundExtras = {}): void {
    abandonRound();
    difficulty = d;
    play = buildPlay(d, x);
    roundOpen = true;
    save({ ...progress, games: progress.games + 1, lastDifficulty: d, lastSize: size });
    core.audio.playMusic(playMusic);
    // no seed, no token: the portal only learns the level and the board size
    core.portal.emit('start', { level: d, board: `${size}x${size}` });
    // the play screen keeps its own state; re-rendering mid-game would lose it
    show('play', play, null);
    play.start();
  }

  /** Leaving a game that is still running (quit, restart) ends it for the portal too. */
  function abandonRound(): void {
    if (roundOpen && play) {
      core.portal.emit('end', {
        score: scoreFor(play.snapshot(), play.stats().hints),
        won: false,
        quit: true,
        level: difficulty,
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
    const r = s.result as NonNullable<GameState['result']>;
    const won = r.winner === LIGHT;
    const draw = r.winner === null;
    const score = scoreFor(s, stats.hints);
    const { next, newBest } = recordResult(progress, s, difficulty, score, stats.bestCapture);
    save(next);
    if (won) core.portal.emit('level_complete', { level: difficulty, score });
    core.portal.emit('end', { score, won, draw, level: difficulty, board: `${size}x${size}` });
    core.audio.playSfx(won ? 'matchWin' : draw ? 'matchDraw' : 'matchLose');
    done.forEach((w) => w(s));

    const render = (): void => {
      const id = PERSONA_OF[difficulty];
      const persona = personaById(id);
      // the persona's closing line: the eighth line for a result, the seventh when she lost
      const line = persona.banter[draw ? 'draw' : won ? 'lose' : 'win']?.[0] ?? `persona.${id}.8`;
      show(
        'results',
        createResultsScreen(core, {
          won,
          draw,
          score,
          best: progress.best[s.rules.size][difficulty],
          newBest,
          taken: stats.captured,
          lost: stats.lost,
          kings: stats.kings,
          moves: stats.moves,
          hints: stats.hints,
          wins: progress.wins,
          plays: progress.plays,
          banter: `${t(persona.nameKey)}: ${t(line)}`,
          onReplay: () => startRound(difficulty),
          onMenu: showMenu,
        }),
        render,
      );
    };
    render();
  }

  // Test-only: `__NAIJA_TEST__` is false in production builds, so the kit and everything it names
  // are removed from the shipped bundle. scripts/prod-gate.mjs enforces it.
  const test: TestApi | undefined = __NAIJA_TEST__
    ? createTestKit({
        screenId: () => host.screenId,
        difficulty: () => difficulty,
        size: () => size,
        setSize: (s) => void (size = s),
        seed: () => seedOverride,
        setSeed: (n) => void (seedOverride = n >>> 0),
        progress: () => progress,
        play: () => play,
        rules: rulesNow,
        nextSeed,
        start: startRound,
        finish: finishRound,
        waitForEnd: () => new Promise<GameState>((resolve) => waiters.push(resolve)),
      })
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
