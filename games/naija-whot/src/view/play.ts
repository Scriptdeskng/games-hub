import type { Core } from '@naija/core/boot';
import { createInput } from '@naija/core/input';
import { createScope } from '@naija/core/lifecycle';
import { createLoop } from '@naija/core/loop';
import { button, createHud, createPause, h, type Component, type Modal } from '@naija/core/ui-kit';
import {
  PROFILES,
  createGame,
  hit,
  missTap,
  oldestTarget,
  tick,
  type Difficulty,
  type GameState,
} from '../rules';
import { createArena } from './arena';

export interface PlayOptions {
  difficulty: Difficulty;
  seed: number;
  onScore(state: GameState): void;
  onEnd(state: GameState): void;
  onRestart(): void;
  onQuit(): void;
}

export interface Play extends Component {
  getState(): GameState;
  /** Replace the state (autoplay fast-forward). Ends the round if the state is final. */
  setState(s: GameState): void;
  start(): void;
  /** Test hook: hit the oldest bell every ~200 ms in real time (drives the real render loop). */
  setBot?: (on: boolean) => void;
}

export function createPlay(core: Core, o: PlayOptions): Play {
  const scope = createScope();
  const profile = PROFILES[o.difficulty];
  let state = createGame(o.difficulty, o.seed);
  let modal: Modal | null = null;
  let over = false;
  let lastSecond = -1;
  let bot = false;
  let botTicks = 0;

  const hud = createHud([
    { id: 'score', label: core.t('hud.score'), value: '0' },
    { id: 'time', label: core.t('hud.time'), value: String(Math.ceil(profile.durationMs / 1000)) },
    { id: 'goal', label: core.t('hud.goal'), value: `0/${profile.goal}` },
    { id: 'combo', label: core.t('hud.combo'), value: '0' },
  ]);
  const pauseBtn = button(core, scope, {
    label: core.t('ui.pause'),
    icon: 'pause',
    ariaLabel: core.t('ui.pause'),
    variant: 'icon',
    onClick: () => pause(),
  });
  hud.addControl(pauseBtn);

  const arena = createArena(core, {
    sizePx: profile.sizePx,
    lifetimeMs: profile.lifetimeMs,
    maxTargets: profile.maxTargets,
    src: './assets/agogo.svg',
  });

  const paint = (): void => {
    hud.set('score', state.score);
    const sec = Math.ceil(state.timeLeftMs / 1000);
    hud.set('time', sec);
    hud.set('goal', `${state.hits}/${profile.goal}`);
    hud.set('combo', state.combo);
    arena.sync(state.targets);
    if (sec !== lastSecond) {
      lastSecond = sec;
      if (sec > 0 && sec <= 5 && state.status === 'playing') core.audio.playSfx('tick');
    }
  };

  const apply = (next: GameState): void => {
    const prev = state;
    state = next;
    if (next.hits > prev.hits) {
      core.audio.playSfx('coin', { pitch: 1 + Math.min(next.combo, 8) * 0.06, key: 'hit' });
      o.onScore(next);
    } else if (next.misses > prev.misses && next.combo === 0 && prev.combo > 0) {
      core.audio.playSfx('fail', { gain: 0.6, key: 'miss' });
    }
    paint();
    if (next.status !== 'playing' && !over) {
      over = true;
      loop.stop();
      o.onEnd(next);
    }
  };

  const loop = createLoop({
    update: (dt) => {
      apply(tick(state, dt * 1000));
      if (__NAIJA_TEST__ && bot && !over && ++botTicks % 12 === 0) {
        const id = oldestTarget(state);
        if (id !== null) apply(hit(state, id));
      }
    },
    perf: core.perf,
    onHidden: () => pause(),
  });

  const resume = (): void => {
    modal = null;
    if (!over) loop.resume();
  };
  function pause(): void {
    if (over || modal) return;
    loop.pause();
    modal = createPause(core, {
      mount: core.root,
      onResume: resume,
      onRestart: o.onRestart,
      onQuit: o.onQuit,
    });
  }

  const hitOldest = (e: KeyboardEvent): void => {
    e.preventDefault(); // Space must not also click a focused button
    if (modal || over) return;
    const id = oldestTarget(state);
    if (id !== null) apply(hit(state, id));
  };
  const togglePause = (): void => {
    if (modal) {
      modal.close();
      resume();
    } else pause();
  };
  const input = createInput(arena.el, {
    keys: { ' ': hitOldest, ArrowDown: hitOldest, p: togglePause, Escape: togglePause },
  });
  arena.onHit((id) => {
    if (!modal && !over) apply(hit(state, id));
  });
  arena.onEmptyTap(() => {
    if (!modal && !over) apply(missTap(state));
  });

  const el = h('section', { class: 'ng-screen ng-play', 'aria-label': core.t('game.title') }, [
    hud.el,
    arena.el,
  ]);
  paint();

  return {
    el,
    getState: () => state,
    setState: apply,
    ...(__NAIJA_TEST__ ? { setBot: (on: boolean) => void (bot = on) } : {}),
    start() {
      core.audio.playSfx('start');
      loop.start();
    },
    destroy() {
      modal?.close();
      loop.destroy();
      input.destroy();
      arena.destroy();
      scope.destroy();
    },
  };
}
