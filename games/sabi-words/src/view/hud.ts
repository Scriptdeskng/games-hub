import type { Core } from '@naija/core/boot';
import type { Scope } from '@naija/core/lifecycle';
import { button, h, type Component } from '@naija/core/ui-kit';
import { HINT_COST } from '../rules';

export interface Hud extends Component {
  /** time left as a share 0..1 and whole seconds, written only when something visible changes */
  setTime(frac: number, sec: number): void;
  setLow(on: boolean): void;
  /** stars still on offer (3, 2 or 1) */
  setStars(n: number): void;
  setCoins(n: number): void;
  setHint(enabled: boolean): void;
  freeze(on: boolean): void;
}

export function createHud(
  core: Core,
  scope: Scope,
  o: { practice: boolean; onPause(): void; onHint(): void },
): Hud {
  const { t } = core;
  const pause = button(core, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  const fill = h('i', { class: 'sw-time__fill' });
  const bar = h('div', { class: 'sw-time', role: 'img' }, [fill]);
  const stars = h(
    'div',
    { class: 'sw-stars', role: 'img' },
    [0, 1, 2].map(() => h('i', { class: 'sw-star is-on' })),
  );
  const coinN = h('b', { text: '0' });
  const coins = h('span', { class: 'sw-coins', 'aria-label': t('hud.coins', { n: 0 }) }, [
    h('i', { class: 'sw-coin', 'aria-hidden': 'true' }),
    coinN,
  ]);
  const hint = button(core, scope, {
    label: t('play.hint', { cost: HINT_COST }),
    ariaLabel: t('play.hint', { cost: HINT_COST }),
    variant: 'ghost',
    sfx: null,
    onClick: o.onHint,
  });
  hint.className = 'sw-hint';
  hint.textContent = '';
  hint.title = t('play.hint', { cost: HINT_COST });
  hint.append(
    h('span', { class: 'sw-hint__cost', 'aria-hidden': 'true', text: String(HINT_COST) }),
  );
  const el = h('header', { class: 'sw-hud' }, [
    pause,
    bar,
    stars,
    coins,
    hint,
    o.practice ? h('span', { class: 'sw-practice', text: t('hud.practice') }) : null,
  ]);
  let lastP = -1;
  let lastStars = 3;
  return {
    el,
    setTime(frac, sec) {
      const p = Math.round(frac * 40) / 40;
      if (p !== lastP) {
        lastP = p;
        fill.style.setProperty('--sw-p', String(p));
      }
      const label = t('play.timeLeft', { s: sec });
      if (bar.getAttribute('aria-label') !== label && (sec % 5 === 0 || sec <= 10))
        bar.setAttribute('aria-label', label);
    },
    setLow: (on) => bar.classList.toggle('is-low', on),
    setStars(n) {
      if (n === lastStars) return;
      lastStars = n;
      [...stars.children].forEach((c, i) => c.classList.toggle('is-on', i < n));
      stars.setAttribute('aria-label', t('results.stars', { n }));
    },
    setCoins(n) {
      coinN.textContent = String(n);
      coins.setAttribute('aria-label', t('hud.coins', { n }));
    },
    setHint(enabled) {
      hint.disabled = !enabled;
    },
    freeze: (on) => bar.classList.toggle('is-paused', on),
    destroy: () => undefined,
  };
}
