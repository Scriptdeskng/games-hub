import type { Core } from '@naija/core/boot';
import { createRng } from '@naija/core/rng';
import {
  createDifficultyPicker,
  createHowToPlay,
  createMenu,
  createResults,
  createScreenHost,
  createSettingsBar,
  h,
  type Component,
} from '@naija/core/ui-kit';
import {
  DIFFICULTIES,
  PROFILES,
  accuracy,
  hit,
  oldestTarget,
  recordResult,
  stars,
  tick,
  type Difficulty,
  type GameState,
  type Progress,
} from './rules';
import { menuMusic } from './sfx';
import { createPlay, type Play } from './view/play';

export interface App {
  showMenu(): void;
  /** Test hook: play a full round quickly. `{ win: false }` lets the clock run out. */
  autoplay(opts?: {
    difficulty?: Difficulty;
    win?: boolean;
    /** play in real time through the real render loop (perf and soak tests) */
    realtime?: boolean;
  }): Promise<GameState>;
  getState(): unknown;
  setSeed(n: number): void;
  readonly screen: string;
  destroy(): void;
}

export function createApp(core: Core, initial: Progress): App {
  const host = createScreenHost(core.root);
  let progress = initial;
  let difficulty: Difficulty = initial.lastDifficulty;
  let play: Play | null = null;
  let roundOpen = false;
  let seedOverride: number | null = null;
  let rerender: (() => void) | null = null;
  let waiters: ((s: GameState) => void)[] = [];
  const { t } = core;

  const nextSeed = (): number => seedOverride ?? Date.now() & 0x7fffffff;
  const show = (id: string, c: Component, again: () => void): void => {
    rerender = again;
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  const hint = (d: Difficulty): string => {
    const p = PROFILES[d];
    return t('game.hint', { goal: p.goal, time: Math.round(p.durationMs / 1000) });
  };

  function showMenu(): void {
    abandonRound();
    core.audio.playMusic(menuMusic);
    const hintEl = h('p', {
      class: 'hint ng-muted',
      'aria-live': 'polite',
      text: hint(difficulty),
    });
    const picker = createDifficultyPicker(core, {
      value: difficulty,
      onChange: (d) => {
        difficulty = d;
        hintEl.textContent = hint(d);
      },
    });
    const bar = createSettingsBar(core);
    const menu = createMenu(core, {
      title: t('game.title'),
      tagline: t('game.tagline'),
      art: h('img', { class: 'menu-art', alt: '', src: './assets/agogo.svg' }),
      extra: [picker.el, hintEl],
      items: [
        { id: 'play', label: t('ui.play'), onSelect: () => startRound(difficulty) },
        { id: 'howto', label: t('ui.howToPlay'), onSelect: showHowTo },
      ],
      footer: [bar.el],
    });
    show(
      'menu',
      { el: menu.el, destroy: () => [menu, picker, bar].forEach((c) => c.destroy()) },
      showMenu,
    );
  }

  function showHowTo(): void {
    const c = createHowToPlay(core, {
      steps: [1, 2, 3, 4].map((n) => t(`game.howto.${n}`)),
      onClose: showMenu,
    });
    show('howto', c, showHowTo);
  }

  function startRound(d: Difficulty): void {
    abandonRound();
    difficulty = d;
    roundOpen = true;
    const seed = nextSeed();
    play = createPlay(core, {
      difficulty: d,
      seed,
      onScore: (s) => core.portal.emit('score', { score: s.score }),
      onEnd: finishRound,
      onRestart: () => startRound(difficulty),
      onQuit: showMenu,
    });
    core.portal.emit('start', { level: d, seed });
    // The play screen keeps its own state; re-rendering mid-round would lose it.
    show('play', play, () => undefined);
    play.start();
  }

  /** Leaving a round that is still running (quit, restart) ends it for the portal too. */
  function abandonRound(): void {
    if (roundOpen && play) {
      const s = play.getState();
      core.portal.emit('end', { score: s.score, won: false, quit: true, level: s.difficulty });
    }
    roundOpen = false;
    play = null;
  }

  function finishRound(s: GameState): void {
    const done = waiters;
    waiters = [];
    done.forEach((w) => w(s));
    roundOpen = false;
    play = null;
    const won = s.status === 'won';
    const { next, newBest } = recordResult(progress, s);
    progress = next;
    void core.portal.saveProgress(progress);
    const st = stars(s);
    if (won) core.portal.emit('level_complete', { level: s.difficulty, score: s.score, stars: st });
    core.portal.emit('end', { score: s.score, won, level: s.difficulty, stars: st });
    core.audio.playSfx(won ? 'win' : 'lose');

    const render = (): void => {
      const banterRng = createRng(s.seed);
      const line = `${t('persona.name')}: ${t(`banter.${won ? 'win' : 'lose'}.${banterRng.int(0, 2)}`)}`;
      const results = createResults(core, {
        won,
        score: s.score,
        best: progress.best[s.difficulty],
        newBest,
        stars: won ? st : undefined,
        banter: line,
        rows: [
          { label: t('results.accuracy'), value: `${Math.round(accuracy(s) * 100)}%` },
          { label: t('results.combo'), value: s.bestCombo },
          { label: t('results.level'), value: t(`difficulty.${s.difficulty}`) },
        ],
        onReplay: () => startRound(s.difficulty),
        onMenu: showMenu,
      });
      show('results', results, render);
    };
    render();
  }

  return {
    showMenu,
    async autoplay(opts = {}) {
      const d = DIFFICULTIES.includes(opts.difficulty as Difficulty)
        ? (opts.difficulty as Difficulty)
        : difficulty;
      startRound(d);
      const p = play as Play;
      if (opts.realtime) {
        const ended = new Promise<GameState>((resolve) => waiters.push(resolve));
        p.setBot(opts.win !== false);
        return ended;
      }
      let s = p.getState();
      const bot = opts.win !== false;
      for (let i = 0; i < 20000 && s.status === 'playing'; i++) {
        s = tick(s, 50);
        const id = bot ? oldestTarget(s) : null;
        if (id !== null) s = hit(s, id);
      }
      p.setState(s);
      return s;
    },
    getState: () => ({
      screen: host.screenId,
      difficulty,
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
