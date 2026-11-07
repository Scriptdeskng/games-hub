import { createScope } from '../lifecycle';
import { h, type Component, type UiContext } from '../ui-kit/dom';
import { bindShake } from './shake';

/** Pip layout on a 3x3 grid (indices 0..8, row by row) for faces 1..6. */
const PIPS: readonly (readonly number[])[] = [
  [],
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
];

export interface DiceViewOptions {
  /** true = no shaking or tumbling, the face just changes */
  reducedMotion?: () => boolean;
  /** cupped-hands shake time in ms (default 290) */
  shakeMs?: number;
  /** tumble time in ms (default 210) */
  rollMs?: number;
  /** optional artwork for the two cupped hands (otherwise CSS-drawn) */
  handsSrc?: string;
  /** shake-to-roll on phones (default true) */
  shake?: boolean;
  /**
   * Draw faces from artwork instead of CSS pips: `src(n)` is the image for face n, `blank` the
   * image shown before the first roll (both URLs relative to the page).
   */
  art?: { src(value: number): string; blank?: string };
}

export interface DiceView extends Component {
  /** Show a face without animating (null = blank). */
  show(value: number | null): void;
  /**
   * Cupped-hands shake, then the die tumbles and lands on `value`. `null` = shake only (two-dice
   * turns: the faces are shown afterwards with `choose` / `showChoice`).
   */
  roll(value: number | null): Promise<void>;
  /** Allow tap / key / shake requests (true on the human's turn only). */
  setEnabled(on: boolean): void;
  /** Called when the human asks to roll (tap, Space/Enter on the die or a shake). */
  onRequest(cb: () => void): void;
  /** Show two dice and wait for the human to tap one (or press 1 / 2). */
  choose(values: readonly [number, number]): Promise<0 | 1>;
  /** Show the two dice a CPU rolled, with the kept one highlighted. */
  showChoice(values: readonly [number, number], picked: 0 | 1): void;
  clearChoice(): void;
  readonly rolling: boolean;
  /** Finish a running roll animation at once. */
  skip(): void;
}

type Art = DiceViewOptions['art'];

const face = (art?: Art): { el: HTMLElement; set(v: number | null): void } => {
  if (art) {
    const img = h('img', { class: 'ng-dice__img', alt: '', draggable: 'false' });
    const el = h('span', { class: 'ng-dice__face ng-dice__face--art', 'aria-hidden': 'true' }, [
      img,
    ]);
    let cur: number | null = -1;
    return {
      el,
      set(v) {
        if (v === cur) return;
        cur = v;
        const url = v ? art.src(v) : (art.blank ?? '');
        if (url) img.setAttribute('src', url);
        else img.removeAttribute('src');
        el.dataset.value = v ? String(v) : '';
      },
    };
  }
  const pips = Array.from({ length: 9 }, () => h('i', { class: 'ng-dice__pip' }));
  const el = h('span', { class: 'ng-dice__face', 'aria-hidden': 'true' }, pips);
  let cur: number | null = -1;
  return {
    el,
    set(v) {
      if (v === cur) return;
      cur = v;
      const on = new Set(v ? (PIPS[v] ?? []) : []);
      pips.forEach((p, i) => p.classList.toggle('is-on', on.has(i)));
      el.dataset.value = v ? String(v) : '';
    },
  };
};

export function createDiceView(ctx: UiContext, o: DiceViewOptions = {}): DiceView {
  const scope = createScope();
  const shakeMs = o.shakeMs ?? 290;
  const rollMs = o.rollMs ?? 210;
  const reduced = (): boolean => o.reducedMotion?.() ?? false;
  const main = face(o.art);
  const hand = (side: 'l' | 'r'): HTMLElement =>
    h('span', { class: `ng-dice__hand ng-dice__hand--${side}` });
  // one picture of both hands, or two CSS-drawn cups
  const hands = h(
    'span',
    { class: 'ng-dice__hands', 'aria-hidden': 'true' },
    o.handsSrc
      ? [h('img', { class: 'ng-dice__hand', src: o.handsSrc, alt: '', draggable: 'false' })]
      : [hand('l'), hand('r')],
  );
  const cube = h('span', { class: `ng-dice__cube${o.art ? ' ng-dice__cube--art' : ''}` }, [
    main.el,
  ]);
  const btn = h(
    'button',
    { type: 'button', class: 'ng-dice', 'aria-label': ctx.t('dice.roll'), disabled: true },
    [cube, hands],
  );
  const pair = h('div', { class: 'ng-dice__pair', role: 'group', hidden: true });
  const el = h('div', { class: 'ng-dice-wrap' }, [btn, pair]);

  let enabled = false;
  let request: () => void = () => undefined;
  let busy = false;
  let finishRoll: (() => void) | null = null;
  let chooser: ((i: 0 | 1) => void) | null = null;

  const ask = (): void => {
    if (enabled && !busy && !chooser) request();
  };
  scope.on(btn, 'click', () => {
    // iOS only grants motion access from a gesture: piggy-back on the first tap
    void motion.requestPermission();
    ask();
  });
  const motion = bindShake(scope, { enabled: () => enabled && o.shake !== false, onShake: ask });

  const pairButton = (value: number, n: 1 | 2, i: 0 | 1): HTMLButtonElement => {
    const f = face(o.art);
    f.set(value);
    const b = h(
      'button',
      {
        type: 'button',
        class: 'ng-dice__opt',
        'aria-label': ctx.t('dice.option', { n, value }),
      },
      [f.el, h('span', { class: 'ng-dice__key', 'aria-hidden': 'true', text: String(n) })],
    );
    scope.on(b, 'click', () => {
      ctx.audio?.playSfx('select');
      chooser?.(i);
    });
    return b;
  };

  const clearChoice = (): void => {
    chooser = null;
    pair.hidden = true;
    pair.replaceChildren();
    el.classList.remove('is-choosing');
  };
  scope.add(() => {
    finishRoll?.();
    clearChoice();
  });

  const keyPick = (e: KeyboardEvent): void => {
    if (!chooser || (e.key !== '1' && e.key !== '2')) return;
    e.preventDefault();
    chooser(e.key === '1' ? 0 : 1);
  };
  scope.on(window, 'keydown', keyPick);

  return {
    el,
    get rolling() {
      return busy;
    },
    show: (v) => {
      main.set(v);
      cube.classList.toggle('is-blank', v === null);
    },
    setEnabled(on) {
      enabled = on;
      btn.disabled = !on;
      el.classList.toggle('is-ready', on);
    },
    onRequest: (cb) => void (request = cb),
    roll(value) {
      finishRoll?.();
      ctx.audio?.playSfx('dice');
      const land = (): void => {
        main.set(value);
        cube.classList.toggle('is-blank', value === null);
      };
      if (reduced()) {
        land();
        return Promise.resolve();
      }
      busy = true;
      return new Promise<void>((resolve) => {
        const offs: (() => void)[] = [];
        const end = (): void => {
          if (!busy) return;
          offs.forEach((off) => off());
          busy = false;
          finishRoll = null;
          el.classList.remove('is-shaking', 'is-tumbling');
          land();
          resolve();
        };
        finishRoll = end;
        el.classList.add('is-shaking');
        offs.push(
          scope.timeout(() => {
            el.classList.replace('is-shaking', 'is-tumbling');
            land();
            offs.push(scope.timeout(end, rollMs));
          }, shakeMs),
        );
      });
    },
    choose(values) {
      clearChoice();
      pair.hidden = false;
      el.classList.add('is-choosing');
      pair.append(pairButton(values[0], 1, 0), pairButton(values[1], 2, 1));
      pair.firstElementChild?.setAttribute('data-autofocus', '');
      (pair.firstElementChild as HTMLElement | null)?.focus({ preventScroll: true });
      return new Promise<0 | 1>((resolve) => {
        chooser = (i) => {
          clearChoice();
          resolve(i);
        };
      });
    },
    showChoice(values, picked) {
      clearChoice();
      pair.hidden = false;
      el.classList.add('is-choosing');
      values.forEach((v, i) => {
        const f = face(o.art);
        f.set(v);
        pair.append(
          h(
            'span',
            { class: `ng-dice__opt ng-dice__opt--static${i === picked ? ' is-picked' : ''}` },
            [f.el],
          ),
        );
      });
    },
    clearChoice,
    skip: () => finishRoll?.(),
    destroy: () => scope.destroy(),
  };
}
