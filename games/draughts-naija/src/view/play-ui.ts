import { createBubbleView, type BubbleView } from '@naija/core/ai-kit';
import type { UiContext } from '@naija/core/ui-kit';
import { createScope, type Scope } from '@naija/core/lifecycle';
import { button, createHud, h, type Component, type Hud } from '@naija/core/ui-kit';
import type { Persona } from '@naija/core/ai-kit';
import { createBoard, type BoardView } from './board';
import { createSeat, type SeatView } from './seats';

export interface PlayUiOptions {
  ctx: UiContext;
  size: 10 | 8;
  cpuName: string;
  persona: Persona;
  onPause(): void;
  onHint(): void;
  /** the accessible name of a square: its name and what stands on it */
  squareLabel(name: string, piece: number): string;
}

export interface PlayUi extends Component {
  board: BoardView;
  hud: Hud;
  bubble: BubbleView;
  hintBtn: HTMLButtonElement;
  you: SeatView;
  cpu: SeatView;
  scope: Scope;
  /** the line under the CPU seat, on a solid plate */
  setStatus(text: string): void;
  setMoves(n: number): void;
  setTurn(side: 'you' | 'cpu' | null): void;
  setHintEnabled(on: boolean): void;
}

/**
 * The play screen's DOM (sketch in assets/draughts-art.css): stage, HUD, the CPU seat, a status
 * plate with the persona's banter bubble, the board, and the human seat. CSS grid areas place them
 * in portrait and in landscape (style.css).
 */
export function createPlayUi(o: PlayUiOptions): PlayUi {
  const scope = createScope();
  const { t } = o.ctx;

  const hud = createHud([{ id: 'moves', label: t('hud.moves'), value: '0' }]);
  const hintBtn = button(o.ctx, scope, {
    label: t('play.hint'),
    variant: 'secondary',
    onClick: o.onHint,
    sfx: null,
  });
  const pauseBtn = button(o.ctx, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  hud.addControl(hintBtn);
  hud.addControl(pauseBtn);
  hud.el.classList.add('dn-hud');

  const cpu = createSeat({
    t,
    name: o.cpuName,
    avatar: o.persona.avatar,
    cpu: true,
    takes: 'light',
  });
  const you = createSeat({ t, name: t('player.you'), cpu: false, takes: 'dark' });

  const status = h('p', { class: 'dn-status dn-plate', role: 'status', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: () => o.cpuName });
  const msg = h('div', { class: 'dn-msg' }, [
    status,
    h('div', { class: 'dn-bubblehost' }, [bubble.el]),
  ]);

  const board = createBoard({
    size: o.size,
    scope,
    boardLabel: t('board.label'),
    label: o.squareLabel,
  });
  const wrap = h('div', { class: 'dn-boardwrap' }, [board.el]);

  const el = h('section', { class: 'ng-screen dn-play', 'aria-label': t('game.title') }, [
    h('div', { class: 'dn-stage', 'aria-hidden': 'true' }),
    hud.el,
    cpu.el,
    msg,
    wrap,
    you.el,
  ]);

  return {
    el,
    board,
    hud,
    bubble,
    hintBtn,
    you,
    cpu,
    scope,
    setStatus(text) {
      if (status.textContent !== text) status.textContent = text;
    },
    setMoves: (n) => hud.set('moves', n),
    setTurn(side) {
      you.setTurn(side === 'you');
      cpu.setTurn(side === 'cpu');
      cpu.setThinking(false);
    },
    setHintEnabled(on) {
      hintBtn.disabled = !on;
    },
    destroy() {
      board.destroy();
      hud.destroy();
      cpu.destroy();
      you.destroy();
      scope.destroy();
    },
  };
}
