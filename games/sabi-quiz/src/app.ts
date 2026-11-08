import { loadPack } from '@naija/core/content';
import type { Core } from '@naija/core/boot';
import { localDateKey } from '@naija/core/content';
import { createRng, randomSeed } from '@naija/core/rng';
import {
  createScreenHost,
  toast,
  DIFFICULTIES,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { CONTESTANT_OF, HOST, personaById } from './ai';
import { menuMusic } from './audio/music';
import { validateSabiPack } from './content';
import {
  PASS_MARK,
  accuracy,
  dailyDone,
  dailySeedFor,
  duelOutcome,
  recordRound,
  stars,
  total,
  won as roundWon,
  type DailyRecord,
  type GameState,
  type Mode,
  type Progress,
  type QuizQuestion,
} from './rules';
import { mountSprite } from './view/dom';
import { createPlay, type Play } from './view/play';
import {
  createDuelIntro,
  createHowToScreen,
  createMenuScreen,
  createPackError,
  createResultsScreen,
  createStatsScreen,
} from './view/screens';

/** The pack path is a literal so the build's ship check can see that it is used. */
const PACK_URL = './assets/packs/sabi-core-en.json';

export interface AutoplayOptions {
  mode?: Mode;
  difficulty?: Difficulty;
  /** make the player win (default) or lose */
  win?: boolean;
  /** play in real time through the real clock and render loop (perf and soak) */
  realtime?: boolean;
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

type Pool = readonly QuizQuestion[];

export function createApp(core: Core, initial: Progress, initialDaily: DailyRecord | null): App {
  const host = createScreenHost(core.root);
  const { t } = core;
  const unmountSprite = mountSprite();
  let progress = initial;
  let dailyRec = initialDaily;
  let difficulty: Difficulty = initial.lastDifficulty;
  let category = initial.lastCategory;
  let play: Play | null = null;
  let roundOpen = false;
  let starting = false;
  let pool: Pool | null = null;
  let packTask: Promise<Pool | null> | null = null;
  let failReason = 'unknown';
  let seedOverride: number | null = null;
  let rerender: (() => void) | null = null;
  let waiters: ((s: GameState) => void)[] = [];
  let ctx = { practice: false, mode: 'classic' as Mode };
  const auto = { rounds: 0, maxMs: 0, rescues: [] as string[] };
  /** test builds only: `?tempo=0.2` runs the game clock 5x faster */
  const urlTempo = __NAIJA_TEST__
    ? Number(new URLSearchParams(location.search).get('tempo')) || undefined
    : undefined;

  const save = (next: Progress): void => {
    progress = next;
    void core.portal.saveProgress(progress);
  };
  const show = (id: string, c: Component, again: (() => void) | null): void => {
    rerender = again;
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  // ---- question pack: failure is an expected state with a retry screen, never a console error
  function packUrl(): string {
    if (__NAIJA_TEST__) {
      const override = new URLSearchParams(location.search).get('pack');
      if (override) return override;
    }
    return PACK_URL;
  }
  function ensurePack(): Promise<Pool | null> {
    if (pool) return Promise.resolve(pool);
    packTask ??= loadPack(packUrl(), validateSabiPack).then((r) => {
      packTask = null;
      if (r.ok) {
        pool = r.pack.questions;
        return pool;
      }
      failReason = r.reason;
      return null;
    });
    return packTask;
  }
  void ensurePack(); // warm it up while the player reads the menu

  // ---- screens
  function showMenu(): void {
    abandonRound();
    core.audio.playMusic(menuMusic);
    show(
      'menu',
      createMenuScreen(core, {
        difficulty,
        category,
        progress,
        daily: dailyRec,
        dailyDone: dailyDone(dailyRec),
        onDifficulty: (d) => {
          difficulty = d;
          save({ ...progress, lastDifficulty: d });
        },
        onCategory: (c) => {
          category = c;
          save({ ...progress, lastCategory: c });
        },
        onPlay: (m) => (m === 'duel' ? showDuelIntro() : void begin(m)),
        onStats: showStats,
        onHowTo: showHowTo,
      }),
      showMenu,
    );
  }
  function showHowTo(): void {
    show('howto', createHowToScreen(core, showMenu), showHowTo);
  }
  function showStats(): void {
    show('stats', createStatsScreen(core, progress, showMenu), showStats);
  }
  function showDuelIntro(): void {
    show(
      'duel',
      createDuelIntro(core, { difficulty, onStart: () => void begin('duel'), onBack: showMenu }),
      showDuelIntro,
    );
  }
  function showPackError(retry: () => void): void {
    const again = (): void => showPackError(retry);
    show('error', createPackError(core, { onRetry: retry, onMenu: showMenu }), again);
  }

  /** Get the questions (with a retry screen on failure), then start a round. */
  async function begin(mode: Mode): Promise<void> {
    if (starting) return;
    starting = true;
    try {
      if (!pool) toast(core.root, t('menu.packLoading'), { ms: 1200 });
      const questions = await ensurePack();
      if (!questions) {
        // an expected state for the player (patchy data): told to the portal, never a console error
        core.portal.emit('error', { message: 'questions unavailable', reason: failReason });
        return showPackError(() => void begin(mode));
      }
      startRound(mode, questions);
    } finally {
      starting = false;
    }
  }

  function startRound(
    mode: Mode,
    questions: Pool,
    test?: { tempo?: number; bot?: { win: boolean; delayMs: number } },
  ): void {
    abandonRound();
    const practice = mode === 'daily' && dailyDone(dailyRec);
    ctx = { practice, mode };
    // the seed fixes every question and poll: it stays in this app and is never sent anywhere
    const seed = mode === 'daily' ? dailySeedFor() : (seedOverride ?? randomSeed());
    const run = createPlay(core, {
      pool: questions,
      mode,
      difficulty,
      categories: mode === 'daily' || category === 'all' ? undefined : [category],
      seed,
      practice,
      onScore: (s) => core.portal.emit('score', { score: s.score }),
      onEnd: (s) => finishRound(s),
      onRestart: () => startRound(mode, questions),
      onQuit: showMenu,
      test: __NAIJA_TEST__ ? { tempo: urlTempo, ...test } : undefined,
    });
    play = run;
    roundOpen = true;
    core.portal.emit('start', {
      level: mode === 'daily' ? 'medium' : difficulty,
      mode,
      ...(practice ? { practice: true } : {}),
    });
    show('play', run, null);
    run.start();
  }

  /** Leaving a round that is still running (quit, restart) ends it for the portal too. */
  function abandonRound(): void {
    if (roundOpen && play) {
      const s = play.snapshot();
      core.portal.emit('end', {
        score: s.score,
        won: false,
        quit: true,
        level: s.difficulty,
        mode: s.mode,
      });
    }
    roundOpen = false;
    play = null;
  }

  function finishRound(s: GameState): void {
    const done = waiters;
    waiters = [];
    roundOpen = false;
    play = null;
    const win = roundWon(s);
    const practice = ctx.practice;
    const { next, newBest } = recordRound(progress, s, { won: win, practice, category });
    save(next);
    const scored = s.mode === 'daily' && !practice;
    if (scored) {
      dailyRec = { date: localDateKey(), score: s.score, correct: s.correct };
      core.storage.set('daily', dailyRec);
    }
    const draw = s.mode === 'duel' && duelOutcome(s) === 'draw';
    const st = stars(s);
    if (win)
      core.portal.emit('level_complete', {
        level: s.difficulty,
        score: s.score,
        mode: s.mode,
        ...(s.mode === 'duel' ? {} : { stars: st }),
      });
    core.portal.emit('end', {
      score: s.score,
      won: win,
      draw,
      level: s.difficulty,
      mode: s.mode,
      ...(practice ? { practice: true } : {}),
    });
    core.audio.playSfx(scored ? 'dailyDone' : win ? 'roundWin' : 'roundLose');
    done.forEach((w) => w(s));

    const render = (): void => {
      const rival = s.mode === 'duel' ? personaById(CONTESTANT_OF[s.difficulty]) : HOST;
      const event = s.mode === 'duel' ? (win ? 'lose' : 'win') : win ? 'win' : 'lose';
      const keys = rival.banter[event] ?? [];
      const key = keys.length ? createRng(s.seed).pick(keys) : '';
      const banter = key ? `${t(rival.nameKey)}: ${t(key)}` : '';
      const rows =
        s.mode === 'duel'
          ? [
              {
                label: t('results.duel', { name: t(rival.nameKey) }),
                value: `${s.score} - ${s.cpu?.score ?? 0}`,
              },
              { label: t('results.correct'), value: `${s.correct}/${total(s)}` },
              {
                label: t('results.mode'),
                value: `${t('mode.duel')} / ${t(`difficulty.${s.difficulty}`)}`,
              },
            ]
          : [
              { label: t('results.correct'), value: `${s.correct}/${total(s)}` },
              { label: t('results.accuracy'), value: `${Math.round(accuracy(s) * 100)}%` },
              { label: t('results.streak'), value: s.bestStreak },
              {
                label: t('results.mode'),
                value: `${t(`mode.${s.mode}`)}${s.mode === 'daily' ? '' : ` / ${t(`difficulty.${s.difficulty}`)}`}`,
              },
            ];
      const bestNow =
        progress.best[s.mode === 'daily' ? 'daily' : `${s.mode}:${s.difficulty}`] ?? 0;
      show(
        'results',
        createResultsScreen(core, {
          won: win,
          draw,
          mode: s.mode,
          score: s.score,
          best: bestNow,
          newBest,
          stars: s.mode === 'duel' ? undefined : win ? st : undefined,
          banter,
          rows,
          note:
            s.mode !== 'daily'
              ? undefined
              : t(practice ? 'results.practice' : 'results.dailySaved'),
          onReplay: () => void begin(s.mode),
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
        const questions = await ensurePack();
        if (!questions) throw new Error('questions unavailable');
        if (opts.difficulty && DIFFICULTIES.includes(opts.difficulty)) difficulty = opts.difficulty;
        const mode = opts.mode ?? 'classic';
        const win = opts.win !== false;
        if (opts.realtime) {
          const started = Date.now();
          const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
          startRound(mode, questions, { tempo: urlTempo ?? 0.5, bot: { win, delayMs: 700 } });
          // rescue: a round that overruns two minutes is finished instantly and recorded
          const off = core.scope.timeout(() => {
            auto.rescues.push(`${mode}/${difficulty} after ${Date.now() - started} ms`);
            play?.fastForward?.(win);
          }, 120000);
          const s = await ended;
          off();
          auto.rounds++;
          auto.maxMs = Math.max(auto.maxMs, Date.now() - started);
          return s;
        }
        startRound(mode, questions);
        return (play as Play).fastForward?.(win) as GameState;
      }
    : undefined;

  const test: TestApi | undefined =
    __NAIJA_TEST__ && autoplay
      ? {
          autoplay,
          getState: () => ({
            screen: host.screenId,
            mode: ctx.mode,
            difficulty,
            category,
            seed: seedOverride,
            progress,
            daily: dailyRec,
            packLoaded: pool !== null,
            round: play ? play.snapshot() : null,
            autoplay: auto,
            passMark: PASS_MARK,
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
      unmountSprite();
      rerender = null;
    },
    ...(test ? { test } : {}),
  };
}
