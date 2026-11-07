import { createDiceView, type DiceView } from '@naija/core/board-kit';
import { createBubbleView, type BubbleView } from '@naija/core/ai-kit';
import { createScope, type Scope } from '@naija/core/lifecycle';
import { button, createHud, h, type Component, type Hud, type UiContext } from '@naija/core/ui-kit';
import { COLOURS, createBoard, type BoardPlayer, type BoardView } from './board';

export interface PlayUiOptions {
  ctx: UiContext;
  players: readonly (BoardPlayer & { name: string })[];
  seeds: number;
  reducedMotion: () => boolean;
  tempo: number;
  /** persona display names for banter bubbles */
  personaName: (id: string) => string;
  onPause(): void;
}

export interface PlayUi extends Component {
  board: BoardView;
  dice: DiceView;
  hud: Hud;
  bubble: BubbleView;
  scope: Scope;
  setStatus(text: string): void;
  /** seeds home for a player, e.g. "1/4" */
  setHome(id: string, home: number, total: number): void;
  /** highlight the HUD tile of the seat whose turn it is */
  setTurn(index: number): void;
  /** the "six" burst around the die */
  sixBurst(): void;
}

const ASSETS = './assets';

/** The play screen's DOM: HUD, message row, board and dice. */
export function createPlayUi(o: PlayUiOptions): PlayUi {
  const scope = createScope();
  const { ctx } = o;
  const t = ctx.t;

  const hud = createHud(o.players.map((p) => ({ id: p.id, label: p.name, value: `0/${o.seeds}` })));
  const pauseBtn = button(ctx, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  hud.addControl(pauseBtn);
  const hudItems = [...hud.el.querySelectorAll<HTMLElement>('.ng-hud__item')];
  // each seat's seed shape beside its name: the seats read apart in greyscale
  hudItems.forEach((item, i) => {
    const slot = o.players[i]?.slot ?? 0;
    item.dataset.seat = String(slot);
    item.prepend(
      h('img', {
        class: 'ld-hud__seed',
        src: `${ASSETS}/seeds/seed-${COLOURS[slot]}.svg`,
        alt: '',
        draggable: 'false',
      }),
    );
  });

  const status = h('p', { class: 'ld-status', role: 'status', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: (p) => o.personaName(p.id) });
  const msg = h('div', { class: 'ld-msg' }, [status, bubble.el]);

  const board = createBoard({
    players: o.players,
    seeds: o.seeds,
    reducedMotion: o.reducedMotion,
    tempo: o.tempo,
    label: t('board.label'),
    seedLabel: (n, steps) => t('play.seedLabel', { n, steps }),
  });

  const dice = createDiceView(ctx, {
    reducedMotion: o.reducedMotion,
    shakeMs: Math.round(240 * o.tempo) || 1,
    rollMs: Math.round(180 * o.tempo) || 1,
    handsSrc: `${ASSETS}/dice/hands-cup.svg`,
    art: { src: (n) => `${ASSETS}/dice/die-${n}.svg`, blank: `${ASSETS}/dice/die-roll.svg` },
  });
  dice.show(null);

  const six = h('img', {
    class: 'ld-six',
    src: `${ASSETS}/fx/six-burst.svg`,
    alt: '',
    draggable: 'false',
    hidden: '',
  });
  const controls = h('div', { class: 'ld-controls' }, [dice.el, six]);

  board.el.setAttribute('tabindex', '-1');
  board.el.setAttribute('data-autofocus', '');
  const el = h('section', { class: 'ng-screen ld-play', 'aria-label': t('game.title') }, [
    hud.el,
    msg,
    board.el,
    controls,
  ]);

  let sixAnim: Animation | null = null;
  scope.add(() => sixAnim?.cancel());

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
    setHome: (id, home, total) => hud.set(id, `${home}/${total}`),
    setTurn(index) {
      hudItems.forEach((it, i) => it.classList.toggle('is-turn', i === index));
    },
    sixBurst() {
      if (o.reducedMotion() || typeof six.animate !== 'function') return;
      six.hidden = false;
      const a = six.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.4 },
          { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 },
        ],
        { duration: Math.round(600 * o.tempo) || 1, easing: 'ease-out' },
      );
      sixAnim?.cancel();
      sixAnim = a;
      const done = (): void => {
        if (sixAnim === a) sixAnim = null;
        six.hidden = true;
      };
      a.onfinish = done;
      a.oncancel = done;
    },
    destroy() {
      board.destroy();
      dice.destroy();
      hud.destroy();
      scope.destroy();
    },
  };
}
