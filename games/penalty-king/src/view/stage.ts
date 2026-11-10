import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { h } from '@naija/core/ui-kit';
import { createControls, type Controls, type Intents } from './controls';
import { aimFrame, backgroundOf, goalBox } from './geometry';
import { createHudParts, type HudParts } from './hud';
import { createRenderer, type Renderer } from './renderer';

export type Venue = 'community' | 'stadium';

/** The whole play screen: scene, canvas, scoreboard, controls and the persona row (art hooks: `.pk-*`). */
export interface Stage {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  hud: HudParts;
  controls: Controls;
  renderer: Renderer;
  /** a place for the persona's speech bubble */
  persona: HTMLElement;
  /** measure the stage again now (resize and rotation call this; a test can too) */
  fit(): void;
  /** swap the venue art (quarter-finals on the community pitch, later rounds in the stadium) */
  setVenue(v: Venue): void;
  destroy(): void;
}

export function createStage(core: Core, venue: Venue, intents: Intents): Stage {
  const scope = createScope();
  const canvas = h('canvas', {
    class: 'pk-canvas',
    role: 'img',
    'aria-label': core.t('game.arenaLabel'),
  });
  const stageEl = h('div', { class: 'pk-stage', 'data-autofocus': '', tabindex: -1 }, [canvas]);
  const hud = createHudParts(core);
  const controls = createControls(core, canvas, intents);
  const persona = h('div', { class: 'pk-persona' });
  const el = h('main', { class: `pk-app pk-venue--${venue}`, 'aria-label': core.t('game.title') }, [
    stageEl,
    hud.el,
    controls.el,
    persona,
  ]);
  const renderer = createRenderer(canvas);

  const fit = (): void => {
    const r = stageEl.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    renderer.resize(r.width, r.height, window.devicePixelRatio || 1);
    const l = renderer.layout;
    const bg = backgroundOf(l);
    stageEl.style.setProperty('--pk-bw', `${bg.bw.toFixed(1)}px`);
    stageEl.style.setProperty('--pk-bh', `${bg.bh.toFixed(1)}px`);
    stageEl.style.setProperty('--pk-bx', `${bg.bx.toFixed(1)}px`);
    stageEl.style.setProperty('--pk-by', `${bg.by.toFixed(1)}px`);
    canvas.style.width = `${l.w}px`;
    canvas.style.height = `${l.h}px`;
    controls.setFrame(aimFrame(l), l.w, l.h);
    controls.placeDive(goalBox(l).bottom + 10);
  };

  // rotation and resize: re-layout only; the match state lives in the flow, not in the DOM
  let pending: () => void = () => undefined;
  const schedule = (): void => {
    pending();
    pending = scope.raf(fit);
  };
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(schedule);
    ro.observe(stageEl);
    scope.add(() => ro.disconnect());
  }
  scope.on(window, 'resize', schedule);
  scope.on(window, 'orientationchange', schedule);
  scope.raf(fit);

  return {
    el,
    canvas,
    hud,
    controls,
    renderer,
    persona,
    fit,
    setVenue(v) {
      el.classList.toggle('pk-venue--community', v === 'community');
      el.classList.toggle('pk-venue--stadium', v === 'stadium');
    },
    destroy() {
      scope.destroy();
      hud.destroy();
      controls.destroy();
      renderer.destroy();
    },
  };
}
