import { createBubbleView, type BubbleView } from '@naija/core/ai-kit';
import type { Core } from '@naija/core/boot';
import { createScope, type Scope } from '@naija/core/lifecycle';
import { SHAPES, type ShapeName } from '../rules/cards';
import { arrowNav, button, createHud, h, type Component, type Hud } from '@naija/core/ui-kit';
import { cardBack, cardFace, shapeIcon } from './cards';
import { createHand, type HandView } from './hand';
import { createSeats, type SeatInfo, type SeatsView } from './seats';

const ASSETS = './assets';

export type FxKind = 'slam' | 'market' | 'penalty' | 'skip' | 'whot';
const FX_FILE: Record<FxKind, string> = {
  slam: 'slam',
  market: 'market-burst',
  penalty: 'pick-penalty',
  skip: 'skip-ring',
  whot: 'whot-glow',
};

export interface PlayUiOptions {
  core: Core;
  cpus: readonly SeatInfo[];
  /** the Last card button exists only when the rule is on */
  lastCardOn: boolean;
  personaName: (id: string) => string;
  onTapCard(id: number): void;
  onFlickCard(id: number): void;
  onDraw(): void;
  onLast(): void;
  onCatch(seat: number): void;
  onPause(): void;
}

export interface PlayUi extends Component {
  hud: Hud;
  hand: HandView;
  seats: SeatsView;
  bubble: BubbleView;
  scope: Scope;
  draw: HTMLButtonElement;
  discard: HTMLElement;
  lastBtn: HTMLButtonElement;
  setStatus(text: string): void;
  setTop(id: number, called: ShapeName | null): void;
  setMarket(n: number): void;
  setYourCards(n: number): void;
  /** the Last card button: usable, and due (the player is on the card that owes the call) */
  setLast(usable: boolean, due: boolean): void;
  setTake(on: boolean): void;
  /** Ask for a shape; resolves with it, or null if cancelled. */
  pickShape(): Promise<ShapeName | null>;
  closePicker(): void;
  readonly pickerOpen: boolean;
  fx(kind: FxKind, at: Element | null, ms: number): void;
  banner(text: string, ms: number): void;
  thump(ms: number): void;
  rect(which: 'draw' | 'discard' | 'hand'): DOMRect;
  /** a face-down card flies from `from` to `to` (an element) and vanishes */
  ghost(from: DOMRect, to: Element, ms: number): void;
}

/** The play screen's DOM. All motion is a CSS class or Web Animations on transform and opacity. */
export function createPlayUi(o: PlayUiOptions): PlayUi {
  const scope = createScope();
  const { core } = o;
  const { t } = core;

  const hud = createHud([
    { id: 'market', label: t('hud.market'), value: '0' },
    { id: 'cards', label: t('hud.cards'), value: '5' },
  ]);
  hud.addControl(
    button(core, scope, {
      label: t('ui.pause'),
      icon: 'pause',
      ariaLabel: t('ui.pause'),
      variant: 'icon',
      onClick: o.onPause,
    }),
  );

  const seats = createSeats(core, scope, o.cpus, o.onCatch);
  const status = h('p', { class: 'wh-status', role: 'status', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: (p) => o.personaName(p.id) });
  const msg = h('div', { class: 'wh-msg' }, [status, bubble.el]);

  // ---- the middle of the table: market, discard, called shape, Last card ----
  const marketCount = h('span', { class: 'whot-count', 'aria-hidden': 'true', text: '0' });
  const draw = h('button', {
    type: 'button',
    class: 'whot-pile whot-pile--draw wh-market',
    'aria-label': t('whot.market', { n: 0 }),
  });
  draw.append(marketCount);
  scope.on(draw, 'click', () => o.onDraw());
  const discard = h('div', { class: 'whot-pile whot-pile--discard' });
  const called = h('img', {
    class: 'whot-called wh-called',
    src: `${ASSETS}/ui/call-circle.svg`,
    alt: '',
    hidden: '',
    draggable: 'false',
  });
  const lastBtn = h('button', { type: 'button', class: 'whot-lastcard', text: t('whot.lastCard') });
  lastBtn.hidden = !o.lastCardOn;
  scope.on(lastBtn, 'click', () => o.onLast());
  const center = h('div', { class: 'wh-center' }, [
    draw,
    h('div', { class: 'wh-discard' }, [discard, called]),
    lastBtn,
  ]);

  // ---- the player's hand ----
  const hand = createHand({
    t,
    label: t('whot.hand'),
    onTap: o.onTapCard,
    onFlick: o.onFlickCard,
  });

  // ---- shape picker (after a Whot 20) ----
  const fxLayer = h('div', { class: 'wh-fxlayer', 'aria-hidden': 'true' });
  const picker = h('div', {
    class: 'wh-picker',
    role: 'group',
    'aria-label': t('whot.pick.title'),
    hidden: '',
  });
  let pickResolve: ((s: ShapeName | null) => void) | null = null;
  const closePicker = (v: ShapeName | null): void => {
    picker.hidden = true;
    const r = pickResolve;
    pickResolve = null;
    r?.(v);
  };
  const shapeBtns = SHAPES.map((s, i) => {
    const b = h('button', { type: 'button', class: 'wh-shape', 'data-shape': s }, [
      shapeIcon(s),
      h('span', { class: 'wh-shape__name', text: `${i + 1} ${t(`whot.shape.${s}`)}` }),
    ]);
    scope.on(b, 'click', () => closePicker(s));
    return b;
  });
  picker.append(
    h('p', { class: 'wh-picker__title', text: t('whot.pick.title') }),
    h('div', { class: 'wh-picker__row' }, shapeBtns),
  );
  arrowNav(scope, picker, 'button', true);
  scope.on(picker, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePicker(null);
    } else if (/^[1-5]$/.test(e.key)) {
      e.stopPropagation();
      closePicker(SHAPES[Number(e.key) - 1] as ShapeName);
    }
  });

  const table = h('div', { class: 'whot-table', 'aria-hidden': 'true' });
  const mid = h('div', { class: 'wh-mid' }, [msg, center]);
  const el = h('section', { class: 'ng-screen wh-play', 'aria-label': t('game.title') }, [
    table,
    hud.el,
    seats.el,
    mid,
    hand.el,
    picker,
    fxLayer,
  ]);

  let topEl: HTMLElement | null = null;
  let topId = -1;
  const reducedNow = (): boolean => core.settings.get('reducedMotion');

  const api: PlayUi = {
    el,
    hud,
    hand,
    seats,
    bubble,
    scope,
    draw,
    discard,
    lastBtn,
    setStatus(text) {
      if (status.textContent !== text) status.textContent = text;
    },
    setTop(id, shape) {
      if (id !== topId) {
        topEl?.remove();
        topEl = cardFace(t, id);
        topId = id;
        discard.append(topEl);
      }
      called.hidden = shape === null;
      if (shape !== null) {
        const src = `${ASSETS}/ui/call-${shape}.svg`;
        if (called.getAttribute('src') !== src) called.setAttribute('src', src);
        called.setAttribute('alt', t('whot.called', { shape: t(`whot.shape.${shape}`) }));
      }
    },
    setMarket(n) {
      hud.set('market', n);
      if (marketCount.textContent !== String(n)) {
        marketCount.textContent = String(n);
        draw.setAttribute('aria-label', t('whot.market', { n }));
      }
    },
    setYourCards: (n) => hud.set('cards', n),
    setLast(usable, due) {
      lastBtn.disabled = !usable;
      lastBtn.classList.toggle('is-due', due);
    },
    setTake: (on) => draw.classList.toggle('is-take', on),
    pickShape() {
      closePicker(null);
      picker.hidden = false;
      (picker.querySelector('button') as HTMLElement | null)?.focus();
      return new Promise((r) => (pickResolve = r));
    },
    closePicker: () => closePicker(null),
    get pickerOpen() {
      return !picker.hidden;
    },
    fx(kind, at, ms) {
      if (reducedNow()) return;
      const layer = fxLayer.getBoundingClientRect();
      const r = at?.getBoundingClientRect();
      const img = h('img', {
        class: `whot-fx whot-fx--${kind}`,
        src: `${ASSETS}/fx/${FX_FILE[kind]}.svg`,
        alt: '',
        draggable: 'false',
      });
      if (r) {
        img.style.left = `${r.left + r.width / 2 - layer.left}px`;
        img.style.top = `${r.top + r.height / 2 - layer.top}px`;
      }
      img.style.animationDuration = `${Math.max(1, ms)}ms`;
      fxLayer.append(img);
      scope.timeout(() => img.remove(), ms + 40);
    },
    banner(text, ms) {
      const b = h('div', { class: 'whot-lastbanner', text });
      b.style.animationDuration = `${Math.max(1, ms)}ms`;
      fxLayer.append(b);
      scope.timeout(() => b.remove(), ms + 40);
    },
    thump(ms) {
      if (reducedNow()) return;
      table.classList.remove('is-thump');
      void table.offsetWidth;
      table.style.animationDuration = `${Math.max(1, ms)}ms`;
      table.classList.add('is-thump');
      scope.timeout(() => table.classList.remove('is-thump'), ms + 20);
    },
    ghost(from, to, ms) {
      if (reducedNow()) return;
      const layer = fxLayer.getBoundingClientRect();
      const d = to.getBoundingClientRect();
      const card = cardBack();
      card.classList.add('wh-ghost', 'is-draw');
      card.style.left = `${d.left + d.width / 2 - layer.left - 18}px`;
      card.style.top = `${d.top + d.height / 2 - layer.top - 25}px`;
      card.style.setProperty('--fx', `${from.left + from.width / 2 - d.left - d.width / 2}px`);
      card.style.setProperty('--fy', `${from.top + from.height / 2 - d.top - d.height / 2}px`);
      card.style.animationDuration = `${Math.max(1, ms)}ms`;
      fxLayer.append(card);
      scope.timeout(() => card.remove(), ms + 40);
    },
    rect: (which) =>
      (which === 'draw' ? draw : which === 'discard' ? discard : hand.el).getBoundingClientRect(),
    destroy() {
      hand.destroy();
      seats.destroy();
      hud.destroy();
      scope.destroy();
    },
  };
  return api;
}
