import { createScope } from '@naija/core/lifecycle';
import type { Component, UiContext } from '@naija/core/ui-kit';
import type { Target } from '../rules';

export interface Arena extends Component {
  /** Reconcile bells on screen with the game state (transform/opacity only). */
  sync(targets: readonly Target[]): void;
  onHit(cb: (id: number) => void): void;
  onEmptyTap(cb: () => void): void;
}

interface Slot {
  btn: HTMLButtonElement;
  id: number;
}

/**
 * The play area. Bells live in a small pool of pre-built buttons that are repositioned with
 * `transform` and shown with opacity, so nothing is created or laid out during play.
 */
export function createArena(
  ctx: UiContext,
  o: { sizePx: number; lifetimeMs: number; maxTargets: number; src: string },
): Arena {
  const scope = createScope();
  const el = document.createElement('div');
  el.className = 'arena ng-pat ng-pat--adire';
  el.tabIndex = 0;
  el.setAttribute('data-autofocus', '');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', ctx.t('game.arenaLabel'));
  el.style.setProperty('--size', `${o.sizePx}px`);
  el.style.setProperty('--life', `${o.lifetimeMs}ms`);

  let hitCb: (id: number) => void = () => undefined;
  let emptyCb: () => void = () => undefined;
  let w = 0;
  let h = 0;
  const measure = (): void => {
    w = el.clientWidth;
    h = el.clientHeight;
  };

  // Plain loop on purpose: building `slots` with Array.from(..., () => ({ id: 0 })) made Rollup
  // constant-fold `slot.id` to 0 and drop the hit handler from the production bundle.
  const slots: Slot[] = [];
  for (let i = 0; i < o.maxTargets + 2; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'target';
    btn.tabIndex = -1; // pointer/keyboard-shortcut play; see how-to-play
    btn.setAttribute('aria-label', ctx.t('game.bell'));
    btn.innerHTML = `<span class="target__in"><img alt="" draggable="false" src="${o.src}"><span class="target__ring"></span></span>`;
    const slot: Slot = { btn, id: 0 };
    scope.on(btn, 'pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      if (!slot.id) return;
      btn.classList.add('is-hit');
      hitCb(slot.id);
    });
    el.append(btn);
    slots.push(slot);
  }

  scope.on(el, 'pointerdown', (e: PointerEvent) => {
    if (e.target === el) emptyCb();
  });
  scope.on(window, 'resize', measure);

  return {
    el,
    onHit: (cb) => void (hitCb = cb),
    onEmptyTap: (cb) => void (emptyCb = cb),
    sync(targets) {
      if (!w) measure();
      for (const s of slots) {
        if (s.id && !targets.some((t) => t.id === s.id)) {
          if (!s.btn.classList.contains('is-hit')) s.btn.classList.add('is-gone');
          s.id = 0;
        }
      }
      for (const t of targets) {
        if (slots.some((s) => s.id === t.id)) continue;
        const slot = slots.find((s) => !s.id);
        if (!slot) continue;
        slot.id = t.id;
        const x = Math.round(t.x * Math.max(0, w - o.sizePx));
        const y = Math.round(t.y * Math.max(0, h - o.sizePx));
        slot.btn.classList.remove('is-on', 'is-hit', 'is-gone');
        slot.btn.style.transform = `translate3d(${x}px,${y}px,0)`;
        void slot.btn.offsetWidth; // restart the CSS animations
        slot.btn.classList.add('is-on');
      }
    },
    destroy: () => scope.destroy(),
  };
}
