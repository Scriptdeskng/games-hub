import { createBubbleView, type BubbleView } from '@naija/core/ai-kit';
import { createScope, type Scope } from '@naija/core/lifecycle';
import { button, createHud, h, type Component, type Hud, type UiContext } from '@naija/core/ui-kit';
import { createBoard, type BoardView } from './board';

export interface PlayUiOptions {
  ctx: UiContext;
  /** HUD labels: [human, CPU] (the CPU's short persona name) */
  names: readonly [string, string];
  reducedMotion: () => boolean;
  tempo: number;
  /** persona display names for banter bubbles */
  personaName: (id: string) => string;
  onPause(): void;
  onHint(): void;
}

export interface PlayUi extends Component {
  board: BoardView;
  hud: Hud;
  bubble: BubbleView;
  hintBtn: HTMLButtonElement;
  scope: Scope;
  setStatus(text: string): void;
  /** seeds in a tray (the HUD score) */
  setScore(side: 0 | 1, n: number): void;
  /** highlight the HUD tile of the seat whose turn it is; the drum rocks for a moment */
  setTurn(side: 0 | 1 | null): void;
  setHintEnabled(on: boolean): void;
}

const IDS = ['you', 'cpu'] as const;

/** The play screen's DOM: HUD, message row, the board stage and the hint button. */
export function createPlayUi(o: PlayUiOptions): PlayUi {
  const scope = createScope();
  const { ctx } = o;
  const t = ctx.t;

  const hud = createHud(IDS.map((id, i) => ({ id, label: o.names[i] as string, value: '0' })));
  const pauseBtn = button(ctx, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  const hintBtn = button(ctx, scope, {
    label: t('play.hint'),
    variant: 'secondary',
    onClick: o.onHint,
    sfx: null,
  });
  hintBtn.classList.add('ay-hint');
  hud.addControl(hintBtn);
  hud.addControl(pauseBtn);
  const items = [...hud.el.querySelectorAll<HTMLElement>('.ng-hud__item')];
  const drums = items.map((item) => {
    const drum = h('img', {
      class: 'ay-drum ayo-turn-drum',
      src: './assets/fx/turn-drum.svg',
      alt: '',
      width: 22,
      height: 22,
      draggable: 'false',
      hidden: '',
    });
    item.prepend(drum);
    return drum;
  });

  const status = h('p', { class: 'ay-status', role: 'status', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: (p) => o.personaName(p.id) });
  const msg = h('div', { class: 'ay-msg' }, [status, bubble.el]);

  const board = createBoard({
    label: t('board.label'),
    pitLabel: (n, seeds) => t('play.pitLabel', { n, seeds }),
    reducedMotion: o.reducedMotion,
    tempo: o.tempo,
  });
  const stage = h('div', { class: 'ay-stage' }, [board.el]);

  const el = h('section', { class: 'ng-screen ay-play', 'aria-label': t('game.title') }, [
    hud.el,
    msg,
    stage,
  ]);

  // keep the board as large as the stage allows, in whichever orientation fits better
  const fit = (): void => board.fit(stage.clientWidth, stage.clientHeight);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    scope.add(() => ro.disconnect());
  }
  scope.on(window, 'resize', fit);
  scope.on(window, 'orientationchange', fit);
  // the first fit happens once the screen is in the document (the host mounts it after this returns)
  scope.timeout(fit, 0);
  scope.timeout(fit, 120);

  return {
    el,
    board,
    hud,
    bubble,
    hintBtn,
    scope,
    setStatus(text) {
      if (status.textContent !== text) status.textContent = text;
    },
    setScore: (side, n) => hud.set(IDS[side], n),
    setTurn(side) {
      items.forEach((it, i) => it.classList.toggle('is-turn', i === side));
      drums.forEach((d, i) => {
        d.hidden = i !== side;
        if (i === side && !o.reducedMotion()) {
          // restart the little rocking animation
          d.classList.remove('ayo-turn-drum');
          void d.getBoundingClientRect();
          d.classList.add('ayo-turn-drum');
        }
      });
    },
    setHintEnabled(on) {
      hintBtn.disabled = !on;
    },
    destroy() {
      board.destroy();
      hud.destroy();
      scope.destroy();
    },
  };
}
