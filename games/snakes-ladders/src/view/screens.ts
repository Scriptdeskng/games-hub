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
import { MAX_CPUS, type Rules } from '../rules';

const NS = 'http://www.w3.org/2000/svg';

/** A landmark from the shared sprite (assets/board/landmarks.svg), used as menu art. */
function landmark(id: string, cls: string): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `./assets/board/landmarks.svg#${id}`);
  svg.append(use);
  return svg;
}

export interface MenuScreenOptions {
  difficulty: Difficulty;
  cpuCount: number;
  onDifficulty(d: Difficulty): void;
  onCpuCount(n: number): void;
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
    options: Array.from({ length: MAX_CPUS }, (_, i) => ({
      value: i + 1,
      label: String(i + 1),
      pips: i + 1,
    })),
    onChange: o.onCpuCount,
  });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: landmark('lm-danfo', 'sl-menu-art'),
    extra: [picker.el, opponents.el],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'rules', label: t('menu.rules'), onSelect: o.onRules },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('sl-menu');
  return { el: menu.el, destroy: () => [menu, picker, opponents, bar].forEach((c) => c.destroy()) };
}

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  const art = h('img', {
    class: 'ng-howto__art sl-howto-art',
    src: './assets/dice/dice-pick-two.svg',
    alt: '',
    draggable: 'false',
  });
  return createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5, 6].map((n) => t(`game.howto.${n}`)),
    art,
    onClose,
  });
}

const TOGGLES: { key: 'exactFinish' | 'reroll' | 'choiceDice'; label: string; help: string }[] = [
  { key: 'exactFinish', label: 'rules.exact', help: 'rules.exact.help' },
  { key: 'reroll', label: 'rules.reroll', help: 'rules.reroll.help' },
  { key: 'choiceDice', label: 'rules.choice', help: 'rules.choice.help' },
];

/** The rules screen: every toggle of the game's rules, saved as you flip it. */
export function createRulesScreen(
  core: Core,
  o: { rules: Rules; onChange(r: Rules): void; onClose(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  let rules = o.rules;
  const list = h('ul', { class: 'sl-rules__list' });
  for (const tog of TOGGLES) {
    const state = h('span', { class: 'sl-switch__state' });
    const sw = h('button', { type: 'button', class: 'sl-switch', role: 'switch' }, [
      h('span', { class: 'sl-switch__txt', text: t(tog.label) }),
      state,
    ]);
    const paint = (): void => {
      const on = rules[tog.key];
      sw.setAttribute('aria-checked', String(on));
      state.textContent = t(on ? 'ui.on' : 'ui.off');
    };
    scope.on(sw, 'click', () => {
      rules = { ...rules, [tog.key]: !rules[tog.key] };
      core.audio.playSfx('tap');
      paint();
      o.onChange(rules);
    });
    paint();
    list.append(
      h('li', { class: 'sl-rules__item' }, [
        sw,
        h('p', { class: 'sl-rules__help', text: t(tog.help) }),
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
  const el = h('section', { class: 'ng-screen sl-rules', 'aria-labelledby': 'sl-rules-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'sl-rules-title', text: t('rules.title') }),
    list,
    h('p', { class: 'ng-muted sl-rules__note', text: t('rules.note') }),
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export interface ResultsScreenOptions {
  won: boolean;
  score: number;
  best: number;
  newBest: boolean;
  turns: number;
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
      { label: t('results.turns'), value: o.turns },
      { label: t('results.wins'), value: `${o.wins}/${o.plays}` },
      { label: t('results.streak'), value: o.streak },
    ],
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
}
