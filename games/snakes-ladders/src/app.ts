import { personaById } from './ai';
import type { Core } from '@naija/core/boot';
import {
  createScreenHost,
  type Component,
  type Difficulty,
  DIFFICULTIES,
} from '@naija/core/ui-kit';
import {
  MAX_CPUS,
  recordResult,
  scoreFor,
  turnsOf,
  type GameState,
  type MoveRecord,
  type Progress,
  type Rules,
} from './rules';
import { menuMusic } from './audio/cues';
import { createPlay, HUMAN_ID, type Play } from './view/play';
import {
  createHowToScreen,
  createMenuScreen,
  createResultsScreen,
  createRulesScreen,
} from './view/screens';

export interface AutoplayOptions {
  difficulty?: Difficulty;
  /** number of CPU opponents (1 to 3) */
  cpus?: number;
  /** instant autoplay: make the human win (default) or lose */
  win?: boolean;
  /** play 10 moves through the real UI and animations (compressed 4x), then finish instantly */
  realtime?: boolean;
}

export interface App {
  showMenu(): void;
  autoplay?: (opts?: AutoplayOptions) => Promise<GameState>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
  destroy(): void;
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
  const nextSeed = (): number => seedOverride ?? Date.now() & 0x7fffffff;
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
      onCpuCount: (n) => save({ ...progress, cpuCount: Math.max(1, Math.min(MAX_CPUS, n)) }),
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
        rules: progress.rules,
        onChange: (rules: Rules) => save({ ...progress, rules }),
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
      onMove: (s, m) => (quiet ? undefined : reportMove(s, m)),
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
    core.portal.emit('start', {
      level: d,
      cpus: x.cpus ?? progress.cpuCount,
      seed: built.seed,
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
      const s = play.getState();
      core.portal.emit('end', {
        score: scoreFor(s, HUMAN_ID),
        won: false,
        quit: true,
        level: currentDifficulty,
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
    const won = s.winner === HUMAN_ID;
    const score = scoreFor(s, HUMAN_ID);
    const { next, newBest } = recordResult(progress, s, currentDifficulty, HUMAN_ID);
    save(next);
    if (won) core.portal.emit('level_complete', { level: currentDifficulty, score });
    core.portal.emit('end', { score, won, level: currentDifficulty });
    core.audio.playSfx(won ? 'win' : 'lose');
    done.forEach((w) => w(s));

    const render = (): void => {
      const personaId = won
        ? s.turns.seats[1]?.persona
        : s.turns.seats.find((x) => x.id === s.winner)?.persona;
      const line = personaId
        ? `${t(personaById(personaId).nameKey)}: ${t(`snakes.banter.${personaId}.${won ? 'lose' : 'win'}`)}`
        : '';
      show(
        'results',
        createResultsScreen(core, {
          won,
          score,
          best: progress.best[currentDifficulty],
          newBest,
          turns: turnsOf(s, HUMAN_ID),
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
  const autoplay: App['autoplay'] = __NAIJA_TEST__
    ? async (opts = {}) => {
        const d = DIFFICULTIES.includes(opts.difficulty as Difficulty)
          ? (opts.difficulty as Difficulty)
          : currentDifficulty;
        const cpus = Math.max(1, Math.min(MAX_CPUS, Math.round(opts.cpus ?? progress.cpuCount)));
        if (opts.realtime) {
          const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
          const seed = nextSeed();
          startRound(d, { seed, cpus, test: { tempo: 0.25, bot: true, liveMoves: 10 } });
          return ended;
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
        const s = (play as Play).fastForward?.() as GameState;
        finishRound(s);
        return s;
      }
    : undefined;

  return {
    showMenu,
    ...(__NAIJA_TEST__ ? { autoplay } : {}),
    getState: () => ({
      screen: host.screenId,
      difficulty: currentDifficulty,
      seed: seedOverride,
      progress,
      round: play ? play.getState() : null,
    }),
    setSeed(n) {
      seedOverride = n >>> 0;
    },
    get screen() {
      return host.screenId;
    },
    destroy() {
      abandonRound();
      host.destroy();
      rerender = null;
    },
  };
}
