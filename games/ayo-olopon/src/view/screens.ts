import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import {
  button,
  createDifficultyPicker,
  createHowToPlay,
  createMenu,
  createResults,
  createSegmented,
  createSettingsBar,
  h,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { PERSONA_OF } from '../ai/personas';
import { CAPTURE_RULES, END_SEEDS, type CaptureRule, type EndSeeds, type Rules } from '../rules';

export interface MenuScreenOptions {
  difficulty: Difficulty;
  onDifficulty(d: Difficulty): void;
  onPlay(): void;
  onHowTo(): void;
  onRules(): void;
}

export function createMenuScreen(core: Core, o: MenuScreenOptions): Component {
  const { t } = core;
  const opponent = h('p', { class: 'ay-opponent ng-muted', 'aria-live': 'polite' });
  const paint = (d: Difficulty): void => {
    opponent.textContent = t('menu.opponent', { name: t(`persona.${PERSONA_OF[d]}.name`) });
  };
  paint(o.difficulty);
  const picker = createDifficultyPicker(core, {
    value: o.difficulty,
    onChange: (d) => {
      paint(d);
      o.onDifficulty(d);
    },
  });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: h('img', {
      class: 'ay-menu-art',
      alt: '',
      src: './assets/icon/menu-mark.svg',
      width: 96,
      height: 96,
    }),
    extra: [picker.el, opponent],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'rules', label: t('menu.rules'), onSelect: o.onRules },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('ay-menu');
  return { el: menu.el, destroy: () => [menu, picker, bar].forEach((c) => c.destroy()) };
}

const LEGEND: readonly [string, string][] = [
  ['./assets/states/pit-select.svg', 'legend.select'],
  ['./assets/states/pit-hint.svg', 'legend.hint'],
  ['./assets/states/pit-capture.svg', 'legend.capture'],
  ['./assets/states/pit-skip.svg', 'legend.skip'],
  ['./assets/states/pit-danger.svg', 'legend.danger'],
  ['./assets/states/pit-last.svg', 'legend.last'],
];

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  const legend = h(
    'ul',
    { class: 'ay-legend' },
    LEGEND.map(([src, key]) =>
      h('li', { class: 'ay-legend__item' }, [
        h('img', { class: 'ay-legend__icon', src, alt: '', width: 40, height: 40 }),
        h('span', { text: t(key) }),
      ]),
    ),
  );
  return createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5, 6].map((n) => t(`game.howto.${n}`)),
    art: legend,
    onClose,
  });
}

export interface Settings {
  rules: Rules;
  fastPlay: boolean;
}

type Flag = 'skipOrigin' | 'captureChain' | 'mustFeed' | 'fastPlay';
const TOGGLES: { key: Flag; label: string; help: string }[] = [
  { key: 'skipOrigin', label: 'rules.skip', help: 'rules.skip.help' },
  { key: 'captureChain', label: 'rules.chain', help: 'rules.chain.help' },
  { key: 'mustFeed', label: 'rules.feed', help: 'rules.feed.help' },
  { key: 'fastPlay', label: 'rules.fast', help: 'rules.fast.help' },
];

/** The rules screen: every variation of the game as a toggle, saved as you flip it. */
export function createRulesScreen(
  core: Core,
  o: { settings: Settings; onChange(s: Settings): void; onClose(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  let cur = o.settings;
  const get = (k: Flag): boolean => (k === 'fastPlay' ? cur.fastPlay : cur.rules[k]);
  const list = h('ul', { class: 'ay-rules__list' });
  for (const tog of TOGGLES) {
    const state = h('span', { class: 'ay-switch__state' });
    const sw = h('button', { type: 'button', class: 'ay-switch', role: 'switch' }, [
      h('span', { class: 'ay-switch__txt', text: t(tog.label) }),
      state,
    ]);
    const paint = (): void => {
      sw.setAttribute('aria-checked', String(get(tog.key)));
      state.textContent = t(get(tog.key) ? 'ui.on' : 'ui.off');
    };
    scope.on(sw, 'click', () => {
      const on = !get(tog.key);
      cur =
        tog.key === 'fastPlay'
          ? { ...cur, fastPlay: on }
          : { ...cur, rules: { ...cur.rules, [tog.key]: on } };
      core.audio.playSfx('tap');
      paint();
      o.onChange(cur);
    });
    paint();
    list.append(
      h('li', { class: 'ay-rules__item' }, [
        sw,
        h('p', { class: 'ay-rules__help', text: t(tog.help) }),
      ]),
    );
  }

  const choice = <T extends CaptureRule | EndSeeds>(
    label: string,
    values: readonly T[],
    prefix: string,
    value: T,
    set: (v: T) => void,
  ): Component => {
    const help = h('p', { class: 'ay-rules__help', text: t(`${prefix}.help.${value}`) });
    const seg = createSegmented<T>(core, {
      label: t(label),
      value,
      options: values.map((v) => ({ value: v, label: t(`${prefix}.${v}`) })),
      onChange: (v) => {
        help.textContent = t(`${prefix}.help.${v}`);
        set(v);
        o.onChange(cur);
      },
    });
    list.append(h('li', { class: 'ay-rules__item' }, [seg.el, help]));
    return seg;
  };
  const capture = choice(
    'rules.capture',
    CAPTURE_RULES,
    'rules.capture',
    cur.rules.capture,
    (v) => {
      cur = { ...cur, rules: { ...cur.rules, capture: v } };
    },
  );
  const ending = choice('rules.end', END_SEEDS, 'rules.end', cur.rules.endSeeds, (v) => {
    cur = { ...cur, rules: { ...cur.rules, endSeeds: v } };
  });

  const back = button(core, scope, {
    label: t('ui.gotIt'),
    block: true,
    onClick: o.onClose,
    sfx: 'back',
  });
  back.setAttribute('data-autofocus', '');
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') o.onClose();
  });
  const el = h('section', { class: 'ng-screen ay-rules', 'aria-labelledby': 'ay-rules-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'ay-rules-title', text: t('rules.title') }),
    h('p', { class: 'ng-muted ay-rules__note', text: t('rules.variant') }),
    list,
    h('p', { class: 'ng-muted ay-rules__note', text: t('rules.tie') }),
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return {
    el,
    destroy() {
      capture.destroy();
      ending.destroy();
      scope.destroy();
    },
  };
}

export interface ResultsScreenOptions {
  won: boolean;
  draw: boolean;
  score: number;
  best: number;
  newBest: boolean;
  /** "you - CPU" in seeds */
  seeds: string;
  /** seeds still on the board when 25 was reached early (0: show no row) */
  onBoard?: number;
  bestCapture: number;
  moves: number;
  wins: number;
  plays: number;
  banter: string;
  onReplay(): void;
  onMenu(): void;
}

export function createResultsScreen(core: Core, o: ResultsScreenOptions): Component {
  const { t } = core;
  const r = createResults(core, {
    won: o.won,
    score: o.score,
    best: o.best,
    newBest: o.newBest,
    banter: o.banter,
    rows: [
      {
        label: t('results.seeds'),
        value: o.onBoard ? `${o.seeds} (${t('results.onBoard', { n: o.onBoard })})` : o.seeds,
      },
      { label: t('results.bestCapture'), value: o.bestCapture },
      { label: t('results.moves'), value: o.moves },
      { label: t('results.wins'), value: `${o.wins}/${o.plays}` },
    ],
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
  // a 24-24 tie is a draw (documented tie rule): neither "You win" nor "Try again"
  if (o.draw) {
    const title = r.el.querySelector('.ng-results__title');
    if (title) title.textContent = t('results.draw');
  }
  return r;
}
