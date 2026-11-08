import type { TFn } from '@naija/core/i18n';
import type { Scope } from '@naija/core/lifecycle';
import { button, h, type Component, type UiContext } from '@naija/core/ui-kit';
import { cardBack } from './cards';

export interface SeatInfo {
  /** index in the game (CPUs are 1..3) */
  seat: number;
  name: string;
  avatar: string;
}

export interface SeatView {
  seat: number;
  el: HTMLElement;
  hand: HTMLElement;
  setCount(n: number): void;
  setTurn(on: boolean): void;
  /** the "Last card!" chip: this CPU has announced */
  setCalled(on: boolean): void;
  /** the Catch button: this CPU is down to its last card(s) and has not announced */
  setCatchable(on: boolean): void;
}

const MAX_BACKS = 7;

export interface SeatsView extends Component {
  seats: SeatView[];
}

/** The CPU opponents: avatar, name, a face-down hand with a count badge, call chip, Catch button. */
export function createSeats(
  ctx: UiContext & { t: TFn },
  scope: Scope,
  infos: readonly SeatInfo[],
  onCatch: (seat: number) => void,
): SeatsView {
  const el = h('div', { class: 'wh-seats', 'data-n': String(infos.length) });
  const seats = infos.map((info): SeatView => {
    const count = h('span', { class: 'whot-count', 'aria-hidden': 'true', text: '5' });
    const hand = h('div', { class: 'whot-cpu-hand', 'aria-hidden': 'true' });
    const handWrap = h('div', { class: 'wh-seat__hand' }, [hand, count]);
    const chip = h('span', { class: 'wh-seat__chip', hidden: '', text: ctx.t('whot.lastCard') });
    const catchBtn = button(ctx, scope, {
      label: ctx.t('whot.catch', { name: info.name }),
      variant: 'accent',
      sfx: null,
      onClick: () => onCatch(info.seat),
    });
    catchBtn.classList.add('wh-catch');
    catchBtn.hidden = true;
    const live = h('span', { class: 'wh-sr', role: 'status', 'aria-live': 'polite' });
    const seatEl = h('div', { class: 'wh-seat', 'data-seat': String(info.seat) }, [
      h('div', { class: 'wh-seat__who' }, [
        h('img', { class: 'wh-seat__avatar', src: info.avatar, alt: '', width: 32, height: 32 }),
        h('span', { class: 'wh-seat__name', text: info.name }),
      ]),
      handWrap,
      chip,
      catchBtn,
      live,
    ]);
    let shown = -1;
    el.append(seatEl);
    return {
      seat: info.seat,
      el: seatEl,
      hand,
      setCount(n) {
        const want = Math.min(n, MAX_BACKS);
        if (shown !== want) {
          while (hand.children.length < want) hand.append(cardBack());
          while (hand.children.length > want) hand.lastElementChild?.remove();
          shown = want;
        }
        if (count.textContent !== String(n)) {
          count.textContent = String(n);
          live.textContent = ctx.t('whot.seat.cards', { name: info.name, n });
        }
      },
      setTurn: (on) => seatEl.classList.toggle('is-turn', on),
      setCalled(on) {
        chip.hidden = !on;
      },
      setCatchable(on) {
        catchBtn.hidden = !on;
      },
    };
  });
  return { el, seats, destroy: () => undefined };
}
