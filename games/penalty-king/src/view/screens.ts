import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import {
  button,
  createDifficultyPicker,
  createHowToPlay,
  createMenu,
  createSegmented,
  createSettingsBar,
  h,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { PERSONA_OF, type Mode } from '../rules/config';
import type { Progress } from '../rules/progress';

export interface MenuOptions {
  mode: Mode;
  difficulty: Difficulty;
  onMode(m: Mode): void;
  onDifficulty(d: Difficulty): void;
  onPlay(): void;
  onHowTo(): void;
  onStats(): void;
}

const MODES: readonly Mode[] = ['cup', 'quick', 'practice'];

export function createMenuScreen(core: Core, o: MenuOptions): Component {
  const { t } = core;
  const help = h('p', { class: 'pk-help ng-muted', 'aria-live': 'polite' });
  const rival = h('p', { class: 'pk-rival', 'aria-live': 'polite' });
  const avatar = h('img', { class: 'ng-avatar pk-rival__face', alt: '', width: 44, height: 44 });
  const card = h('div', { class: 'pk-rivalcard' }, [avatar, rival]);
  const paint = (m: Mode, d: Difficulty): void => {
    const id = PERSONA_OF[d];
    help.textContent = t(`mode.${m}.help`);
    rival.textContent = `${t('menu.rival', { name: t(`persona.${id}.name`) })}. ${t(`persona.${id}.about`)}`;
    avatar.setAttribute('src', `./assets/avatars/${id}.svg`);
  };
  let mode = o.mode;
  let diff = o.difficulty;
  paint(mode, diff);
  const modes = createSegmented<Mode>(core, {
    label: t('menu.mode'),
    value: mode,
    options: MODES.map((m) => ({ value: m, label: t(`mode.${m}`) })),
    onChange: (m) => {
      mode = m;
      paint(mode, diff);
      o.onMode(m);
    },
  });
  const picker = createDifficultyPicker(core, {
    value: diff,
    onChange: (d) => {
      diff = d;
      paint(mode, diff);
      o.onDifficulty(d);
    },
  });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: h('img', {
      class: 'pk-menu-art',
      alt: '',
      src: './assets/icon/menu-mark.svg',
      width: 96,
      height: 96,
    }),
    extra: [modes.el, picker.el, card, help],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'howto', label: t('ui.howToPlay'), onSelect: o.onHowTo },
      { id: 'stats', label: t('menu.stats'), onSelect: o.onStats },
    ],
    footer: [bar.el],
  });
  menu.el.classList.add('pk-menu');
  return { el: menu.el, destroy: () => [menu, modes, picker, bar].forEach((c) => c.destroy()) };
}

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const { t } = core;
  return createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5, 6].map((n) => t(`game.howto.${n}`)),
    onClose,
  });
}

/** Saved stats (core storage through the portal bridge): a few tiles, one Back button. */
export function createStatsScreen(core: Core, p: Progress, onClose: () => void): Component {
  const { t } = core;
  const scope = createScope();
  const tile = (label: string, value: string | number): HTMLElement =>
    h('li', { class: 'ng-stat' }, [
      h('span', { class: 'ng-stat__value', text: String(value) }),
      h('span', { class: 'ng-stat__label', text: label }),
    ]);
  const rows: [string, string | number][] = [
    [t('stats.plays'), p.plays],
    [t('stats.wins'), p.wins],
    [t('stats.goals'), p.goals],
    [t('stats.saves'), p.saves],
    [t('stats.cups'), p.cupsWon],
    [t('stats.run'), `${p.bestRun}/3`],
    [t('stats.streak'), p.bestStreak],
    [t('stats.best', { level: t('difficulty.hard') }), p.best.hard],
  ];
  const back = button(core, scope, {
    label: t('ui.back'),
    block: true,
    onClick: onClose,
    sfx: 'back',
  });
  back.setAttribute('data-autofocus', '');
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  });
  const el = h('section', { class: 'ng-screen pk-stats', 'aria-labelledby': 'pk-stats-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'pk-stats-title', text: t('stats.title') }),
    h(
      'ul',
      { class: 'ng-results__stats' },
      rows.map(([l, v]) => tile(l, v)),
    ),
    h('div', { class: 'pk-actions' }, [back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}
