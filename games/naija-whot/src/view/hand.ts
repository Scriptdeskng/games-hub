import type { TFn } from '@naija/core/i18n';
import { createScope } from '@naija/core/lifecycle';
import { h, type Component } from '@naija/core/ui-kit';
import { cardButton } from './cards';

export interface HandOptions {
  t: TFn;
  label: string;
  /** a card was tapped, clicked or activated by keyboard */
  onTap(id: number): void;
  /** a card was flicked up (dragged above the fan) */
  onFlick(id: number): void;
}

export interface HandView extends Component {
  /** Reconcile the fan with these cards. `playable` null = not the player's turn (no marks). */
  sync(ids: readonly number[], playable: ReadonlySet<number> | null): void;
  cardEl(id: number): HTMLElement | undefined;
  select(id: number | null): void;
  readonly selected: number | null;
  readonly ids: readonly number[];
}

const FLICK_PX = 48;
const SLOP_PX = 8;

/** The player's fan: a horizontally scrollable row of card buttons (44 px effective targets). */
export function createHand(o: HandOptions): HandView {
  const scope = createScope();
  const el = h('div', { class: 'whot-fan wh-fan', role: 'group', 'aria-label': o.label });
  const cards = new Map<number, HTMLButtonElement>();
  let order: number[] = [];
  let selected: number | null = null;

  scope.on(el, 'click', (e: MouseEvent) => {
    if (dragged) {
      dragged = false;
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
    if (b) o.onTap(Number(b.dataset.card));
  });

  // flick: drag a card up past the fan to play it (transform only while dragging)
  let drag: { id: number; el: HTMLElement; x: number; y: number; pointer: number } | null = null;
  let dragged = false;
  scope.on(el, 'pointerdown', (e: PointerEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
    if (!b || !e.isPrimary) return;
    drag = { id: Number(b.dataset.card), el: b, x: e.clientX, y: e.clientY, pointer: e.pointerId };
    // keep receiving the gesture after the pointer leaves the fan (a flick goes up out of it)
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      /* a synthetic pointer: no capture needed */
    }
  });
  scope.on(el, 'pointermove', (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > SLOP_PX && Math.abs(dy) > Math.abs(e.clientX - drag.x)) {
      dragged = true;
      drag.el.style.transform = `translateY(${Math.min(0, dy)}px)`;
    }
  });
  const endDrag = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag;
    drag = null;
    const dy = e.clientY - d.y;
    d.el.style.transform = '';
    if (e.type === 'pointerup' && dy < -FLICK_PX) o.onFlick(d.id);
    else if (dragged) scope.timeout(() => (dragged = false), 0);
  };
  scope.on(el, 'pointerup', endDrag);
  scope.on(el, 'pointercancel', endDrag);

  const api: HandView = {
    el,
    ids: order,
    sync(ids, playable) {
      for (const [id, b] of cards) {
        if (!ids.includes(id)) {
          b.remove();
          cards.delete(id);
        }
      }
      for (const id of ids) if (!cards.has(id)) cards.set(id, cardButton(o.t, id));
      if (
        ids.length !== el.children.length ||
        ids.some((id, i) => cards.get(id) !== el.children[i])
      ) {
        el.replaceChildren(...ids.map((id) => cards.get(id) as HTMLElement));
      }
      order = ids.slice();
      (api as { ids: readonly number[] }).ids = order;
      if (selected !== null && !cards.has(selected)) selected = null;
      for (const [id, b] of cards) {
        const ok = playable?.has(id) ?? false;
        b.classList.toggle('is-playable', ok);
        b.classList.toggle('is-blocked', playable !== null && !ok);
        b.classList.toggle('is-selected', id === selected);
        b.setAttribute('aria-pressed', String(id === selected));
      }
    },
    cardEl: (id) => cards.get(id),
    select(id) {
      selected = id;
      for (const [cid, b] of cards) {
        b.classList.toggle('is-selected', cid === id);
        b.setAttribute('aria-pressed', String(cid === id));
      }
      if (id !== null) {
        const b = cards.get(id);
        // keep it in view in a long, scrollable fan (a one-off layout read on selection only)
        b?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    },
    get selected() {
      return selected;
    },
    destroy() {
      scope.destroy();
      cards.clear();
    },
  };
  return api;
}
