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
import { CPU_COUNTS, STACK_RULES, type Rules, type StackRule } from '../rules';

const NS = 'http://www.w3.org/2000/svg';

const YARDS = './assets/board/yards.svg';
const LEGEND = './assets/board/legend.svg';

/** One symbol of a sprite in assets/board (`legend.svg#lg-safe`, `yards.svg#yard-red`). */
function symbol(file: string, id: string, cls: string): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', file === YARDS ? '0 0 600 600' : '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `${file}#${id}`);
  svg.append(use);
  return svg;
}

export interface MenuScreenOptions {
  difficulty: Difficulty;
  cpuCount: number;
  quick: boolean;
  onDifficulty(d: Difficulty): void;
  onCpuCount(n: number): void;
  onMode(quick: boolean): void;
  onPlay(): void;
  onHowTo(): void;
  onRules(): void;
}

export function createMenuScreen(core: Core, o: MenuScreenOptions): Component {
  const { t } = core;
  const picker = createDifficultyPicker(core, { value: o.difficulty, onChange: o.onDifficulty });
  const opponents = createSegmented(core, {
    label: t('menu.opponents'),
    value: o.cpuCount,
    options: CPU_COUNTS.map((n) => ({ value: n, label: String(n), pips: n })),
    onChange: o.onCpuCount,
  });
  const mode = createSegmented<'classic' | 'quick'>(core, {
    label: t('menu.mode'),
    value: o.quick ? 'quick' : 'classic',
    options: [
      { value: 'classic', label: t('menu.mode.classic') },
      { value: 'quick', label: t('menu.mode.quick') },
    ],
    onChange: (v) => o.onMode(v === 'quick'),
  });
  const bar = createSettingsBar(core);
  const row = h('div', { class: 'ld-pickers' }, [opponents.el, mode.el]);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: symbol(YARDS, 'yard-green', 'ld-menu-art'),
    extra: [picker.el, row],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'rules', label: t('menu.rules'), onSelect: o.onRules },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('ld-menu');
  return {
    el: menu.el,
    destroy: () => [menu, picker, opponents, mode, bar].forEach((c) => c.destroy()),
  };
}

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  const legend = h(
    'ul',
    { class: 'ld-legend' },
    [
      ['lg-safe', 'legend.safe'],
      ['lg-start', 'legend.start'],
      ['lg-homecol', 'legend.column'],
      ['lg-centre', 'legend.centre'],
    ].map(([id, key]) =>
      h('li', { class: 'ld-legend__item' }, [
        symbol(LEGEND, id as string, 'ld-legend__icon'),
        h('span', { text: t(key as string) }),
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
  autoMove: boolean;
  fastPlay: boolean;
}

type Flag =
  'captureBonus' | 'exactHome' | 'threeSixes' | 'quickFirstHome' | 'autoMove' | 'fastPlay';
const TOGGLES: { key: Flag; label: string; help: string }[] = [
  { key: 'captureBonus', label: 'rules.capture', help: 'rules.capture.help' },
  { key: 'exactHome', label: 'rules.exact', help: 'rules.exact.help' },
  { key: 'threeSixes', label: 'rules.three', help: 'rules.three.help' },
  { key: 'quickFirstHome', label: 'rules.quickFirst', help: 'rules.quickFirst.help' },
  { key: 'autoMove', label: 'rules.autoMove', help: 'rules.autoMove.help' },
  { key: 'fastPlay', label: 'rules.fast', help: 'rules.fast.help' },
];

/** The rules screen: every toggle of the game's rules, saved as you flip it. */
export function createRulesScreen(
  core: Core,
  o: { settings: Settings; onChange(s: Settings): void; onClose(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  let cur = o.settings;
  const isRule = (k: Flag): k is Exclude<Flag, 'autoMove' | 'fastPlay'> =>
    k !== 'autoMove' && k !== 'fastPlay';
  const get = (k: Flag): boolean => (isRule(k) ? cur.rules[k] : cur[k]);
  const list = h('ul', { class: 'ld-rules__list' });
  for (const tog of TOGGLES) {
    const state = h('span', { class: 'ld-switch__state' });
    const sw = h('button', { type: 'button', class: 'ld-switch', role: 'switch' }, [
      h('span', { class: 'ld-switch__txt', text: t(tog.label) }),
      state,
    ]);
    const paint = (): void => {
      sw.setAttribute('aria-checked', String(get(tog.key)));
      state.textContent = t(get(tog.key) ? 'ui.on' : 'ui.off');
    };
    scope.on(sw, 'click', () => {
      const on = !get(tog.key);
      cur = isRule(tog.key)
        ? { ...cur, rules: { ...cur.rules, [tog.key]: on } }
        : { ...cur, [tog.key]: on };
      core.audio.playSfx('tap');
      paint();
      o.onChange(cur);
    });
    paint();
    list.append(
      h('li', { class: 'ld-rules__item' }, [
        sw,
        h('p', { class: 'ld-rules__help', text: t(tog.help) }),
      ]),
    );
  }
  const help = h('p', {
    class: 'ld-rules__help',
    text: t(`rules.stacks.help.${cur.rules.stacks}`),
  });
  const stacks = createSegmented<StackRule>(core, {
    label: t('rules.stacks'),
    value: cur.rules.stacks,
    options: STACK_RULES.map((v) => ({ value: v, label: t(`rules.stacks.${v}`) })),
    onChange: (v) => {
      cur = { ...cur, rules: { ...cur.rules, stacks: v } };
      help.textContent = t(`rules.stacks.help.${v}`);
      o.onChange(cur);
    },
  });
  list.append(h('li', { class: 'ld-rules__item' }, [stacks.el, help]));
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
  const el = h('section', { class: 'ng-screen ld-rules', 'aria-labelledby': 'ld-rules-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'ld-rules-title', text: t('rules.title') }),
    list,
    h('p', { class: 'ng-muted ld-rules__note', text: t('rules.note') }),
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return {
    el,
    destroy() {
      stacks.destroy();
      scope.destroy();
    },
  };
}

export interface ResultsScreenOptions {
  won: boolean;
  score: number;
  best: number;
  newBest: boolean;
  captures: number;
  home: string;
  wins: number;
  plays: number;
  streak: number;
  banter: string;
  onReplay(): void;
  onMenu(): void;
}

export function createResultsScreen(core: Core, o: ResultsScreenOptions): Component {
  const { t } = core;
  return createResults(core, {
    won: o.won,
    score: o.score,
    best: o.best,
    newBest: o.newBest,
    banter: o.banter,
    rows: [
      { label: t('results.captures'), value: o.captures },
      { label: t('results.home'), value: o.home },
      { label: t('results.wins'), value: `${o.wins}/${o.plays}` },
      { label: t('results.streak'), value: o.streak },
    ],
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
}
