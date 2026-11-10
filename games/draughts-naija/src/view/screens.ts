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
import type { RuleToggles, Size } from '../rules/config';

export interface MenuOptions {
  difficulty: Difficulty;
  size: Size;
  onDifficulty(d: Difficulty): void;
  onSize(s: Size): void;
  onPlay(): void;
  onHowTo(): void;
  onRules(): void;
}

export function createMenuScreen(core: Core, o: MenuOptions): Component {
  const { t } = core;
  const opponent = h('p', { class: 'dn-opponent ng-muted', 'aria-live': 'polite' });
  const paint = (d: Difficulty): void => {
    opponent.textContent = t('menu.opponent', { name: t(`persona.${PERSONA_OF[d]}.name`) });
  };
  paint(o.difficulty);
  const sizes = createSegmented<Size>(core, {
    label: t('menu.size'),
    value: o.size,
    options: [
      { value: 10, label: t('size.10') },
      { value: 8, label: t('size.8') },
    ],
    onChange: (s) => {
      core.audio.playSfx('modePick');
      o.onSize(s);
    },
  });
  const picker = createDifficultyPicker(core, {
    value: o.difficulty,
    onChange: (d) => {
      core.audio.playSfx('modePick');
      paint(d);
      o.onDifficulty(d);
    },
  });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: h('img', {
      class: 'dn-menu-art',
      alt: '',
      src: './assets/icon/menu-mark.svg',
      width: 96,
      height: 96,
    }),
    extra: [sizes.el, picker.el, opponent],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'rules', label: t('menu.rules'), onSelect: o.onRules },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('dn-menu');
  return { el: menu.el, destroy: () => [menu, sizes, picker, bar].forEach((c) => c.destroy()) };
}

/** Legend squares drawn with the real board classes, so what you learn is what you see. */
const LEGEND: readonly { cls: string; piece?: 'light' | 'dark'; step?: boolean; key: string }[] = [
  { cls: 'is-select', piece: 'light', key: 'legend.select' },
  { cls: 'is-move', key: 'legend.move' },
  { cls: 'is-path', step: true, key: 'legend.path' },
  { cls: 'is-capturable', piece: 'dark', key: 'legend.capturable' },
  { cls: 'is-must', piece: 'light', key: 'legend.must' },
  { cls: 'is-last-to', key: 'legend.last' },
  { cls: 'is-hint', piece: 'light', key: 'legend.hint' },
];

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  const legend = h(
    'ul',
    { class: 'dn-legend' },
    LEGEND.map((l) =>
      h('li', { class: 'dn-legend__item' }, [
        h(
          'span',
          { class: `dn-sq dn-demo ${l.cls === 'is-must' ? '' : l.cls}`, 'aria-hidden': 'true' },
          [
            l.piece
              ? h('i', {
                  class: `dn-piece dn-piece--${l.piece}${l.cls === 'is-must' ? ' is-must' : ''}`,
                })
              : null,
            l.step ? h('b', { class: 'dn-step', text: '1' }) : null,
          ],
        ),
        h('span', { text: t(l.key) }),
      ]),
    ),
  );
  return createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5, 6, 7].map((n) => t(`game.howto.${n}`)),
    art: legend,
    onClose,
  });
}

export interface RuleSettings {
  toggles: RuleToggles;
  fastPlay: boolean;
}

type Flag = keyof RuleToggles | 'fastPlay';
const TOGGLES: { key: Flag; label: string; help: string }[] = [
  { key: 'maxCapture', label: 'rules.max', help: 'rules.max.help' },
  { key: 'flyingKingsShort', label: 'rules.fly', help: 'rules.fly.help' },
  { key: 'cpuStarts', label: 'rules.cpuStarts', help: 'rules.cpuStarts.help' },
  { key: 'fastPlay', label: 'rules.fast', help: 'rules.fast.help' },
];

/** The rules screen: every variation as a switch, saved as you flip it. */
export function createRulesScreen(
  core: Core,
  o: { settings: RuleSettings; onChange(s: RuleSettings): void; onClose(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  let cur = o.settings;
  const get = (k: Flag): boolean => (k === 'fastPlay' ? cur.fastPlay : cur.toggles[k]);
  const list = h('ul', { class: 'dn-rules__list' });
  for (const tog of TOGGLES) {
    const state = h('span', { class: 'dn-switch__state' });
    const sw = h('button', { type: 'button', class: 'dn-switch', role: 'switch' }, [
      h('span', { class: 'dn-switch__txt', text: t(tog.label) }),
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
          : { ...cur, toggles: { ...cur.toggles, [tog.key]: on } };
      core.audio.playSfx('tap');
      paint();
      o.onChange(cur);
    });
    paint();
    list.append(
      h('li', { class: 'dn-rules__item' }, [
        sw,
        h('p', { class: 'dn-rules__help', text: t(tog.help) }),
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
  const el = h('section', { class: 'ng-screen dn-rules', 'aria-labelledby': 'dn-rules-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'dn-rules-title', text: t('rules.title') }),
    h('p', { class: 'ng-muted dn-rules__note', text: t('rules.intro') }),
    list,
    h('p', { class: 'ng-muted dn-rules__note', text: t('rules.draws') }),
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export interface ResultsOptions {
  won: boolean;
  draw: boolean;
  score: number;
  best: number;
  newBest: boolean;
  taken: number;
  lost: number;
  kings: number;
  moves: number;
  hints: number;
  wins: number;
  plays: number;
  banter: string;
  onReplay(): void;
  onMenu(): void;
}

export function createResultsScreen(core: Core, o: ResultsOptions): Component {
  const { t } = core;
  const r = createResults(core, {
    won: o.won,
    score: o.score,
    best: o.best,
    newBest: o.newBest,
    banter: o.banter,
    rows: [
      { label: t('results.taken'), value: o.taken },
      { label: t('results.lost'), value: o.lost },
      { label: t('results.kings'), value: o.kings },
      { label: t('results.moves'), value: o.moves },
      { label: t('results.hints'), value: o.hints },
      { label: t('results.wins'), value: `${o.wins}/${o.plays}` },
    ],
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
  if (o.draw) {
    const title = r.el.querySelector('.ng-results__title');
    if (title) title.textContent = t('results.draw');
  }
  return r;
}
