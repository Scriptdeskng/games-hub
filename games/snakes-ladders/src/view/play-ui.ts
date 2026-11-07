import { createDiceView, type DiceView } from '@naija/core/board-kit';
import { createBubbleView, type BubbleView } from '@naija/core/ai-kit';
import { createScope } from '@naija/core/lifecycle';
import { button, createHud, h, type Component, type Hud, type UiContext } from '@naija/core/ui-kit';
import type { Scope } from '@naija/core/lifecycle';
import type { BoardLayout } from '../rules/config';
import { createBoard, type BoardPlayer, type BoardView } from './board';

export interface PlayUiOptions {
  ctx: UiContext;
  layout: BoardLayout;
  players: readonly (BoardPlayer & { name: string })[];
  reducedMotion: () => boolean;
  tempo: number;
  /** persona display names for banter bubbles */
  personaName: (id: string) => string;
  onPause(): void;
  onMove(): void;
  onReroll(): void;
}

export interface PlayUi extends Component {
  board: BoardView;
  dice: DiceView;
  hud: Hud;
  bubble: BubbleView;
  scope: Scope;
  setStatus(text: string): void;
  setPos(id: string, square: number): void;
  setTurn(index: number): void;
  /** Show the Move / Re-roll buttons (decide step). */
  showDecision(canReroll: boolean, roll: number): void;
  hideDecision(): void;
  /** Show whether the once-per-game re-roll is still available (idle state of the button). */
  setRerollAvailable(state: 'available' | 'used' | 'off'): void;
  /** A ladder or snake caption under the board. */
  setCaption(kind: 'ladder' | 'snake' | null, text?: string): void;
}

const ASSETS = './assets';

/** The play screen's DOM: HUD, message row, board, dice and decision buttons. */
export function createPlayUi(o: PlayUiOptions): PlayUi {
  const scope = createScope();
  const { ctx } = o;
  const t = ctx.t;

  const hud = createHud(o.players.map((p) => ({ id: p.id, label: p.name, value: '0' })));
  const pauseBtn = button(ctx, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  hud.addControl(pauseBtn);
  const hudItems = [...hud.el.querySelectorAll<HTMLElement>('.ng-hud__item')];

  const status = h('p', { class: 'sl-status', role: 'status', 'aria-live': 'polite' });
  const caption = h('p', { class: 'sl-caption', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: (p) => o.personaName(p.id) });
  const msg = h('div', { class: 'sl-msg' }, [status, caption, bubble.el]);

  const board = createBoard({
    layout: o.layout,
    players: o.players,
    reducedMotion: o.reducedMotion,
    tempo: o.tempo,
    label: t('board.label'),
    bgSrc: `${ASSETS}/board/board-bg.svg`,
  });

  const dice = createDiceView(ctx, {
    reducedMotion: o.reducedMotion,
    shakeMs: Math.round(480 * o.tempo) || 1,
    rollMs: Math.round(360 * o.tempo) || 1,
    handsSrc: `${ASSETS}/dice/hands-cup.svg`,
    art: { src: (n) => `${ASSETS}/dice/die-${n}.svg`, blank: `${ASSETS}/dice/die-roll.svg` },
  });
  dice.show(null);

  const moveBtn = button(ctx, scope, {
    label: t('play.move'),
    variant: 'primary',
    onClick: o.onMove,
    sfx: 'select',
    id: 'sl-move',
  });
  moveBtn.hidden = true;
  const rerollLabel = h('span', { class: 'sl-reroll__txt', text: t('play.reroll') });
  const rerollIcon = h('img', {
    class: 'sl-reroll__ic',
    alt: '',
    draggable: 'false',
    src: `${ASSETS}/icons/reroll.svg`,
  });
  const rerollBtn = h(
    'button',
    { type: 'button', class: 'ng-btn ng-btn--accent sl-reroll', id: 'sl-reroll' },
    [rerollIcon, rerollLabel],
  );
  scope.on(rerollBtn, 'click', () => {
    if (rerollBtn.getAttribute('aria-disabled') === 'true') return;
    o.onReroll();
  });
  const actions = h('div', { class: 'sl-actions' }, [moveBtn, rerollBtn]);
  const controls = h('div', { class: 'sl-controls' }, [dice.el, actions]);

  board.el.setAttribute('tabindex', '-1');
  board.el.setAttribute('data-autofocus', '');
  const el = h('section', { class: 'ng-screen sl-play', 'aria-label': t('game.title') }, [
    hud.el,
    msg,
    board.el,
    controls,
  ]);

  const setRerollAvailable: PlayUi['setRerollAvailable'] = (state) => {
    rerollBtn.hidden = state === 'off';
    const used = state === 'used';
    rerollBtn.setAttribute('aria-disabled', 'true');
    rerollBtn.classList.toggle('is-used', used);
    rerollIcon.setAttribute('src', `${ASSETS}/icons/${used ? 'reroll-used' : 'reroll'}.svg`);
    rerollLabel.textContent = t(used ? 'play.rerollUsed' : 'play.reroll');
    rerollBtn.setAttribute('aria-label', t(used ? 'play.rerollUsed' : 'play.rerollLeft'));
  };

  return {
    el,
    board,
    dice,
    hud,
    bubble,
    scope,
    setStatus(text) {
      if (status.textContent !== text) status.textContent = text;
    },
    setPos: (id, square) => hud.set(id, square),
    setTurn(index) {
      hudItems.forEach((it, i) => it.classList.toggle('is-turn', i === index));
    },
    showDecision(canReroll, roll) {
      moveBtn.hidden = false;
      moveBtn.textContent = t('play.moveBy', { n: roll });
      if (canReroll) {
        rerollBtn.removeAttribute('aria-disabled');
        rerollBtn.setAttribute('aria-label', t('play.rerollLeft'));
      }
      actions.classList.add('is-deciding');
    },
    hideDecision() {
      moveBtn.hidden = true;
      rerollBtn.setAttribute('aria-disabled', 'true');
      actions.classList.remove('is-deciding');
    },
    setRerollAvailable,
    setCaption(kind, text) {
      caption.textContent = text ?? '';
      caption.dataset.kind = kind ?? '';
      msg.classList.toggle('has-caption', kind !== null);
    },
    destroy() {
      board.destroy();
      dice.destroy();
      hud.destroy();
      scope.destroy();
    },
  };
}
