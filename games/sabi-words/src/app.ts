import { loadPack, type WordPack } from '@naija/core/content';
import { createRng, randomSeed } from '@naija/core/rng';
import type { Core } from '@naija/core/boot';
import { createScreenHost, toast, type Component } from '@naija/core/ui-kit';
import { OSAS } from './ai/personas';
import { PACKS, PACK_IDS, packMeta, validateSabiWordPack } from './content';
import { menuMusic } from './audio/music';
import {
  PROFILES,
  accuracy,
  coinsEarned,
  dailyDone,
  dailyPackFor,
  dailySeedFor,
  elapsedMs,
  finishDaily,
  fitGrid,
  generateWithFallback,
  recordRound,
  score,
  spendCoins,
  startDaily,
  stars,
  won as roundWon,
  type DailyRecord,
  type Difficulty,
  type GameState,
  type Progress,
  type Puzzle,
} from './rules';
import {
  newAutoStats,
  urlClock,
  urlPackOverride,
  urlTempo,
  type AutoplayOptions,
  type TestApi,
} from './testkit';
import { mountSprite } from './view/dom';
import { viewportBox } from './view/layout';
import { createHowToScreen, createMenuScreen, createPacksScreen } from './view/menu';
import { createPlay, type Play } from './view/play';
import { createResultCues } from './view/resultcues';
import { clock, createPackError, createResultsScreen, createStatsScreen } from './view/screens';

export type { AutoplayOptions, TestApi };

export interface App {
  showMenu(): void;
  destroy(): void;
  /** present only when `__NAIJA_TEST__` is true: production builds carry no test members at all */
  readonly test?: TestApi;
}

type Mode = 'classic' | 'daily';

export function createApp(core: Core, initial: Progress, initialDaily: DailyRecord | null): App {
  const host = createScreenHost(core.root);
  const { t } = core;
  const unmountSprite = mountSprite();
  let progress = initial;
  let dailyRec = initialDaily;
  let difficulty: Difficulty = initial.lastDifficulty;
  let packId = initial.lastPack;
  let play: Play | null = null;
  let roundOpen = false;
  let starting = false;
  let failReason = 'unknown';
  let seedOverride: number | null = null;
  let rerender: (() => void) | null = null;
  let waiters: ((s: GameState) => void)[] = [];
  let ctx = { practice: false, mode: 'classic' as Mode };
  const auto = newAutoStats();
  const cues = createResultCues(core);
  /** packs fetched so far; owned by this app instance, gone with it */
  const packs = new Map<string, WordPack>();
  const tasks = new Map<string, Promise<WordPack | null>>();

  const save = (next: Progress): void => {
    progress = next;
    void core.portal.saveProgress(progress);
  };
  const show = (id: string, c: Component, again: (() => void) | null): void => {
    rerender = again;
    cues.stop();
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  // ---- word packs: a failure is an expected state with a retry screen, never a console error
  function ensurePack(id: string): Promise<WordPack | null> {
    const have = packs.get(id);
    if (have) return Promise.resolve(have);
    let task = tasks.get(id);
    if (!task) {
      const url = (__NAIJA_TEST__ ? urlPackOverride() : null) ?? packMeta(id).url;
      task = loadPack(url, validateSabiWordPack).then((r) => {
        tasks.delete(id);
        if (r.ok) {
          packs.set(id, r.pack);
          return r.pack;
        }
        failReason = r.reason;
        return null;
      });
      tasks.set(id, task);
    }
    return task;
  }
  void ensurePack(packId); // warm up the chosen pack while the player reads the menu

  // ---- screens
  function showMenu(): void {
    abandonRound();
    core.audio.playMusic(menuMusic);
    show(
      'menu',
      createMenuScreen(core, {
        difficulty,
        packId,
        progress,
        daily: dailyRec,
        dailyDone: dailyDone(dailyRec),
        onDifficulty: (d) => {
          difficulty = d;
          save({ ...progress, lastDifficulty: d });
        },
        onPlay: () => void begin('classic'),
        onDaily: () => void begin('daily'),
        onPacks: showPacks,
        onStats: showStats,
        onHowTo: showHowTo,
      }),
      showMenu,
    );
  }
  function showPacks(): void {
    show(
      'packs',
      createPacksScreen(core, {
        current: packId,
        onPick: (id) => {
          packId = id;
          save({ ...progress, lastPack: id });
          void ensurePack(id);
          showMenu();
        },
        onBack: showMenu,
      }),
      showPacks,
    );
  }
  const showHowTo = (): void => show('howto', createHowToScreen(core, showMenu), showHowTo);
  const showStats = (): void =>
    show('stats', createStatsScreen(core, progress, showMenu), showStats);
  function showPackError(retry: () => void): void {
    const again = (): void => showPackError(retry);
    show('error', createPackError(core, { onRetry: retry, onMenu: showMenu }), again);
  }

  /** Build the puzzle for a round (the size follows the screen), or null if it cannot be made. */
  function buildPuzzle(pack: WordPack, mode: Mode, seed: number): Puzzle | null {
    const d: Difficulty = mode === 'daily' ? 'medium' : difficulty;
    // the Daily is the same grid for everybody, so it never steps down for a small screen
    const box = viewportBox(PROFILES[d].words);
    const size = mode === 'daily' ? PROFILES.medium.size : fitGrid(d, box.w, box.h).size;
    const r = generateWithFallback({ pack, difficulty: d, seed, size });
    return r.ok ? r.puzzle : null;
  }

  /** Get the pack (with a retry screen on failure), build a puzzle, start a round. */
  async function begin(mode: Mode, test?: Parameters<typeof startRound>[2]): Promise<void> {
    if (starting) return;
    starting = true;
    try {
      const id = mode === 'daily' ? dailyPackFor(PACK_IDS) : packId;
      if (!packs.has(id)) toast(core.root, t('menu.packLoading'), { ms: 1200 });
      const pack = await ensurePack(id);
      const puzzle = pack
        ? buildPuzzle(
            pack,
            mode,
            mode === 'daily' ? dailySeedFor() : (seedOverride ?? randomSeed()),
          )
        : null;
      if (!pack || !puzzle) {
        // an expected state for the player (patchy data): told to the portal, never a console error
        core.portal.emit('error', {
          message: 'words unavailable',
          reason: pack ? 'puzzle' : failReason,
        });
        return showPackError(() => void begin(mode));
      }
      startRound(mode, puzzle, test);
    } finally {
      starting = false;
    }
  }

  function startRound(
    mode: Mode,
    puzzle: Puzzle,
    test?: { tempo?: number; clockMs?: number; bot?: { win: boolean; everyMs: number } },
  ): void {
    abandonRound();
    let practice = false;
    if (mode === 'daily') {
      // the first start of the day is the scored attempt; mark the day used now
      const d = startDaily(dailyRec, new Date());
      practice = d.practice;
      if (!practice) {
        dailyRec = d.record;
        core.storage.set('daily', dailyRec);
      }
    }
    ctx = { practice, mode };
    difficulty = mode === 'daily' ? difficulty : puzzle.difficulty;
    const run = createPlay(core, {
      puzzle,
      practice,
      coins: () => progress.coins,
      spend: (cost) => {
        const next = spendCoins(progress, cost);
        if (!next) return null;
        save(next);
        return next.coins;
      },
      // a practice replay of the Daily is never reported as a scored level
      onScore: (s) =>
        practice
          ? undefined
          : core.portal.emit('score', { score: score(s), words: s.found.length }),
      onEnd: (s) => finishRound(s),
      onRestart: () => void begin(mode),
      onQuit: showMenu,
      test: __NAIJA_TEST__ ? { tempo: urlTempo(), clockMs: urlClock(), ...test } : undefined,
    });
    play = run;
    roundOpen = true;
    core.portal.emit('start', {
      level: puzzle.difficulty,
      pack: puzzle.packId,
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
        won: false,
        quit: true,
        level: s.difficulty,
        ...(ctx.practice ? { practice: true } : { score: score(s) }),
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
    const sc = score(s);
    const st = stars(s);
    const { next, newBest, coins } = recordRound(progress, s, { practice });
    save(next);
    if (ctx.mode === 'daily' && !practice) {
      dailyRec = finishDaily(dailyRec as DailyRecord, { score: sc, stars: st }, false);
      core.storage.set('daily', dailyRec);
    }
    if (win && !practice) {
      core.portal.emit('level_complete', { level: s.difficulty, score: sc, stars: st });
    }
    core.portal.emit(
      'end',
      practice
        ? { won: win, level: s.difficulty, practice: true }
        : { score: sc, won: win, level: s.difficulty, stars: st, words: s.found.length },
    );
    core.audio.playSfx(win ? 'levelComplete' : 'levelFail');
    done.forEach((w) => w(s));

    const render = (): void => {
      const line = createRng(s.puzzle.seed).pick(OSAS.banter[win ? 'win' : 'lose'] ?? []);
      show(
        'results',
        createResultsScreen(core, {
          won: win,
          puzzle: s.puzzle,
          found: s.found,
          score: sc,
          best: progress.best[s.difficulty].score,
          newBest,
          stars: win ? st : undefined,
          banter: line ? `${t(OSAS.nameKey)}: ${t(line)}` : '',
          rows: [
            { label: t('results.words'), value: `${s.found.length}/${s.puzzle.words.length}` },
            { label: t('results.time'), value: clock(elapsedMs(s)) },
            { label: t('results.accuracy'), value: `${Math.round(accuracy(s) * 100)}%` },
            { label: t('results.coins'), value: `+${practice ? 0 : coins || coinsEarned(s)}` },
          ],
          note: [
            `${t(`difficulty.${s.difficulty}`)} / ${t(`pack.${s.puzzle.packId}.name`)}`,
            practice ? t('results.practice') : ctx.mode === 'daily' ? t('results.dailySaved') : '',
          ]
            .filter(Boolean)
            .join(' - '),
          onReplay: () => void begin(ctx.mode),
          onMenu: showMenu,
        }),
        render,
      );
    };
    render();
    if (!practice) cues.play({ stars: win ? st : 0, coins });
  }

  // Test-only: `__NAIJA_TEST__` is false in production builds, so this whole function (and the
  // word "autoplay") is removed from the shipped bundle. scripts/prod-gate.mjs enforces it.
  const autoplay: TestApi['autoplay'] | undefined = __NAIJA_TEST__
    ? async (opts: AutoplayOptions = {}) => {
        if (opts.difficulty && opts.difficulty in PROFILES) difficulty = opts.difficulty;
        if (opts.pack && PACKS.some((p) => p.id === opts.pack)) packId = opts.pack;
        const mode = opts.mode ?? 'classic';
        const win = opts.win !== false;
        const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
        if (opts.realtime) {
          const started = Date.now();
          await begin(mode, { tempo: urlTempo() ?? 0.5, bot: { win, everyMs: 700 } });
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
        await begin(mode);
        (play as Play).fastForward?.(win);
        return ended;
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
            packId,
            seed: seedOverride,
            progress,
            daily: dailyRec,
            packsLoaded: [...packs.keys()],
            round: play ? play.snapshot() : null,
            autoplay: auto,
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
      cues.stop();
      host.destroy();
      unmountSprite();
      rerender = null;
    },
    ...(test ? { test } : {}),
  };
}
