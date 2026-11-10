import { h, type Component } from '@naija/core/ui-kit';
import type { TFn } from '@naija/core/i18n';

export interface SeatView extends Component {
  /** the talking drum and the avatar ring show whose turn it is */
  setTurn(on: boolean): void;
  /** three beads while the CPU is thinking */
  setThinking(on: boolean): void;
  /** pieces this side has taken: small stones, and a count on a plate */
  setCaptured(n: number): void;
}

export interface SeatOptions {
  t: TFn;
  name: string;
  /** avatar URL: the CPU seat has one, the human seat does not */
  avatar?: string;
  cpu: boolean;
  /** which pieces this side collects in its tray: the opponent's colour */
  takes: 'light' | 'dark';
}

/** Most little stones drawn in a tray; the plate carries the exact count. */
const MAX_MINIS = 6;

export function createSeat(o: SeatOptions): SeatView {
  const drum = h('i', { class: 'dn-turn', 'aria-hidden': 'true' });
  const beads = h('span', { class: 'dn-think', hidden: '', 'aria-hidden': 'true' }, [
    h('i'),
    h('i'),
    h('i'),
  ]);
  const count = h('span', { class: 'dn-plate dn-tray__count', text: 'x0' });
  const tray = h(
    'div',
    { class: 'dn-tray', role: 'img', 'aria-label': o.t('seat.taken', { n: 0 }) },
    [count],
  );
  const name = h('span', { class: 'dn-seat__name dn-plate', text: o.name });
  const el = h(
    'section',
    { class: `dn-seat${o.cpu ? ' dn-seat--cpu' : ''}`, 'aria-label': o.name },
    [
      o.avatar
        ? h('img', {
            class: 'ng-avatar dn-seat__avatar',
            src: o.avatar,
            alt: '',
            width: 44,
            height: 44,
          })
        : null,
      h('div', { class: 'dn-seat__col' }, [
        h('div', { class: 'dn-seat__row' }, [name, drum, beads]),
        tray,
      ]),
    ],
  );
  let shown = -1;
  return {
    el,
    setTurn: (on) => el.classList.toggle('is-turn', on),
    setThinking: (on) => void (beads.hidden = !on),
    setCaptured(n) {
      if (n === shown) return;
      shown = n;
      const minis = Array.from({ length: Math.min(n, MAX_MINIS) }, () =>
        h('i', { class: `dn-mini dn-mini--${o.takes}` }),
      );
      count.textContent = `x${n}`;
      tray.replaceChildren(...minis, count);
      tray.setAttribute('aria-label', o.t('seat.taken', { n }));
    },
    destroy: () => el.remove(),
  };
}
