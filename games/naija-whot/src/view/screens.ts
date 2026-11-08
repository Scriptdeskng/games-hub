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
import { cardFace, shapeIcon } from './cards';
import { CPU_COUNTS, type Rules } from '../rules';
import { DECK } from '../rules/cards';

export interface MenuScreenOptions {
  difficulty: Difficulty;
  cpuCount: number;
  onDifficulty(d: Difficulty): void;
  onCpuCount(n: number): void;
  onPlay(): void;
  onHowTo(): void;
  onRules(): void;
}

/** a small fan of the five shapes on the menu (the sprite is mounted once by main.ts) */
function menuArt(): HTMLElement {
  return h(
    'div',
    { class: 'wh-menu-art', 'aria-hidden': 'true' },
    (['circle', 'triangle', 'cross', 'square', 'star'] as const).map((s) =>
      h('span', { class: 'wh-menu-art__chip' }, [shapeIcon(s)]),
    ),
  );
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
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: menuArt(),
    extra: [picker.el, opponents.el],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'rules', label: t('menu.rules'), onSelect: o.onRules },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('wh-menu');
  return { el: menu.el, destroy: () => [menu, picker, opponents, bar].forEach((c) => c.destroy()) };
}

/** the six power cards, pictured: 1, 2, 5, 8, 14 and the Whot 20 (one id each) */
const LEGEND: [number, string][] = [
  [1, 'legend.hold'],
  [2, 'legend.two'],
  [5, 'legend.three'],
  [8, 'legend.suspend'],
  [14, 'legend.market'],
  [20, 'legend.whot'],
];

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  const legend = h(
    'ul',
    { class: 'wh-legend' },
    LEGEND.map(([n, key]) => {
      const id = DECK.find(
        (c) => c.n === n && c.shape !== 'star' && (n === 20 || c.shape === 'circle'),
      )?.id as number;
      return h('li', { class: 'wh-legend__item' }, [cardFace(t, id), h('span', { text: t(key) })]);
    }),
  );
  return createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5, 6].map((n) => t(`game.howto.${n}`)),
    art: legend,
    onClose,
  });
}

export interface Settings {
  rules: Rules;
  autoDraw: boolean;
  fastPlay: boolean;
}

type Flag = keyof Rules | 'autoDraw' | 'fastPlay';
const TOGGLES: Flag[] = [
  'stackTwo',
  'defendFive',
  'whotOnPending',
  'finishOnSpecial',
  'marketAgain',
  'lastCard',
  'semiLast',
  'marketEnds',
  'autoDraw',
  'fastPlay',
];
const isRule = (k: Flag): k is keyof Rules => k !== 'autoDraw' && k !== 'fastPlay';

/** The rules screen: every house rule is a switch, saved as you flip it. */
export function createRulesScreen(
  core: Core,
  o: { settings: Settings; onChange(s: Settings): void; onClose(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  let cur = o.settings;
  const get = (k: Flag): boolean => (isRule(k) ? cur.rules[k] : cur[k]);
  const list = h('ul', { class: 'wh-rules__list' });
  const paints: (() => void)[] = [];
  for (const key of TOGGLES) {
    const state = h('span', { class: 'wh-switch__state' });
    const sw = h(
      'button',
      { type: 'button', class: 'wh-switch', role: 'switch', 'data-rule': key },
      [h('span', { class: 'wh-switch__txt', text: t(`rules.${key}`) }), state],
    );
    const paint = (): void => {
      sw.setAttribute('aria-checked', String(get(key)));
      state.textContent = t(get(key) ? 'ui.on' : 'ui.off');
      // Semi-last only exists inside the Last card rule
      const dead = key === 'semiLast' && !cur.rules.lastCard;
      sw.toggleAttribute('aria-disabled', dead);
      sw.classList.toggle('is-dead', dead);
    };
    paints.push(paint);
    scope.on(sw, 'click', () => {
      if (key === 'semiLast' && !cur.rules.lastCard) return;
      const on = !get(key);
      cur = isRule(key)
        ? {
            ...cur,
            rules: {
              ...cur.rules,
              [key]: on,
              ...(key === 'lastCard' && !on ? { semiLast: false } : {}),
            },
          }
        : { ...cur, [key]: on };
      core.audio.playSfx('tap');
      paints.forEach((p) => p());
      o.onChange(cur);
    });
    paint();
    list.append(
      h('li', { class: 'wh-rules__item' }, [
        sw,
        h('p', { class: 'wh-rules__help', text: t(`rules.${key}.help`) }),
      ]),
    );
  }
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
  const el = h('section', { class: 'ng-screen wh-rules', 'aria-labelledby': 'wh-rules-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'wh-rules-title', text: t('rules.title') }),
    list,
    h('p', { class: 'ng-muted wh-rules__note', text: t('rules.note') }),
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export interface ResultsScreenOptions {
  won: boolean;
  score: number;
  best: number;
  newBest: boolean;
  cardsLeft: number;
  catches: number;
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
      { label: t('results.cardsLeft'), value: o.cardsLeft },
      { label: t('results.catches'), value: o.catches },
      { label: t('results.wins'), value: `${o.wins}/${o.plays}` },
      { label: t('results.streak'), value: o.streak },
    ],
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
}
