import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import {
  button,
  createDifficultyPicker,
  createHowToPlay,
  createMenu,
  createModal,
  createResults,
  createSettingsBar,
  h,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { CONTESTANT_OF, personaById } from '../ai';
import {
  CATEGORIES,
  PROFILES,
  bestKey,
  categoryAccuracy,
  type DailyRecord,
  type Mode,
  type Progress,
} from '../rules';
import { catIcon, svgFrom } from './dom';

const ALL_ICON =
  '<svg class="sq-cat" viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><circle cx="14" cy="14" r="6"/><circle cx="34" cy="14" r="6"/><circle cx="14" cy="34" r="6"/><circle cx="34" cy="34" r="6"/></g></svg>';

const stage = (): HTMLElement => h('div', { class: 'sq-stage' });

export interface MenuOptions {
  difficulty: Difficulty;
  category: string;
  progress: Progress;
  daily: DailyRecord | null;
  dailyDone: boolean;
  onDifficulty(d: Difficulty): void;
  onCategory(c: string): void;
  onPlay(m: Mode): void;
  onStats(): void;
  onHowTo(): void;
}

const topicName = (core: Core, c: string): string => core.t(c === 'all' ? 'topic.all' : `cat.${c}`);

export function createMenuScreen(core: Core, o: MenuOptions): Component {
  const { t } = core;
  const scope = createScope();
  let category = o.category;
  /** the one open topic picker, closed if the menu goes away under it */
  let openTopic: { close(): void } | null = null;
  const hint = (d: Difficulty): string =>
    t('menu.hintClassic', {
      time: Math.round(PROFILES[d].timeMs / 1000),
      name: t(personaById(CONTESTANT_OF[d]).nameKey),
    });
  const hintEl = h('p', {
    class: 'hint ng-muted',
    'aria-live': 'polite',
    text: hint(o.difficulty),
  });
  const dailyEl = h('p', {
    class: 'hint ng-muted',
    text:
      o.dailyDone && o.daily ? t('menu.dailyDone', { score: o.daily.score }) : t('menu.dailyNew'),
  });
  const picker = createDifficultyPicker(core, {
    value: o.difficulty,
    onChange: (d) => {
      hintEl.textContent = hint(d);
      o.onDifficulty(d);
    },
  });
  const topicBtn = button(core, scope, {
    label: t('menu.topic', { name: topicName(core, category) }),
    variant: 'secondary',
    block: true,
    id: 'menu-topic',
    onClick: () => openTopics(),
  });
  function openTopics(): void {
    const grid = h('div', {
      class: 'sq-topics',
      role: 'radiogroup',
      'aria-label': t('menu.topicTitle'),
    });
    const modalScope = createScope();
    const chips = ['all', ...CATEGORIES].map((c) => {
      const b = h('button', {
        type: 'button',
        class: 'sq-topic',
        role: 'radio',
        'aria-checked': String(c === category),
        'data-topic': c,
      });
      b.append(
        c === 'all' ? svgFrom(ALL_ICON) : catIcon(c),
        h('span', { text: topicName(core, c) }),
      );
      modalScope.on(b, 'click', () => {
        category = c;
        topicBtn.textContent = t('menu.topic', { name: topicName(core, c) });
        o.onCategory(c);
        core.audio.playSfx('select');
        modal.close();
        modalScope.destroy();
      });
      return b;
    });
    grid.append(...chips);
    const modal = createModal(core, {
      title: t('menu.topicTitle'),
      body: grid,
      mount: core.root,
      actions: [
        { label: t('ui.close'), variant: 'secondary', onClick: () => modalScope.destroy() },
      ],
      onDismiss: () => modalScope.destroy(),
    });
    openTopic = {
      close() {
        modal.close();
        modalScope.destroy();
      },
    };
    (chips.find((c) => c.getAttribute('aria-checked') === 'true') ?? chips[0])?.focus();
  }
  const small = (label: string, id: string, onClick: () => void): HTMLElement =>
    button(core, scope, { label, variant: 'secondary', id, onClick });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: h('img', { class: 'menu-art', alt: '', src: './assets/icon/menu-mark.svg' }),
    extra: [picker.el, hintEl, topicBtn],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: () => o.onPlay('classic') },
      { id: 'duel', label: t('menu.duel'), variant: 'accent', onSelect: () => o.onPlay('duel') },
      { id: 'daily', label: t('menu.daily'), variant: 'accent', onSelect: () => o.onPlay('daily') },
    ],
    footer: [
      dailyEl,
      h('div', { class: 'sq-menu-row' }, [
        small(t('menu.stats'), 'menu-stats', o.onStats),
        small(t('menu.howto'), 'menu-howto', o.onHowTo),
      ]),
      bar.el,
    ],
  });
  menu.el.prepend(stage());
  return {
    el: menu.el,
    destroy() {
      openTopic?.close();
      [menu, picker, bar].forEach((c) => c.destroy());
      scope.destroy();
    },
  };
}

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const c = createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5].map((n) => core.t(`game.howto.${n}`)),
    onClose,
  });
  c.el.prepend(stage());
  return c;
}

/** Quiz Duel's curtain-raiser: the two podiums, who you race and a Start button. */
export function createDuelIntro(
  core: Core,
  o: { difficulty: Difficulty; onStart(): void; onBack(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  const rival = personaById(CONTESTANT_OF[o.difficulty]);
  const name = t(rival.nameKey);
  const start = button(core, scope, {
    label: t('duel.start'),
    block: true,
    onClick: o.onStart,
    sfx: 'select',
    id: 'duel-start',
  });
  start.setAttribute('data-autofocus', '');
  const back = button(core, scope, {
    label: t('ui.back'),
    variant: 'secondary',
    block: true,
    onClick: o.onBack,
    sfx: 'back',
  });
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') o.onBack();
  });
  const podium = h(
    'div',
    { class: 'sq-podium', role: 'img', 'aria-label': t('results.duel', { name }) },
    [
      h('span', { class: 'sq-podium__you', text: t('duel.you') }),
      h('img', {
        class: 'ng-avatar sq-podium__cpu',
        src: rival.avatar,
        alt: '',
        width: 56,
        height: 56,
      }),
    ],
  );
  const el = h('section', { class: 'ng-screen sq-duelintro', 'aria-labelledby': 'sq-duel-title' }, [
    stage(),
    h('h2', { class: 'ng-h ng-h--sm', id: 'sq-duel-title', text: t('duel.title') }),
    podium,
    h('p', { class: 'sq-duelintro__who' }, [
      h('b', { text: t('duel.you') }),
      h('span', { class: 'sq-vs', 'aria-hidden': 'true' }),
      h('b', { text: name }),
    ]),
    h('p', { class: 'hint', text: t('duel.sub', { name }) }),
    h('div', { class: 'ng-sticky-actions' }, [start, back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export function createStatsScreen(core: Core, p: Progress, onClose: () => void): Component {
  const { t } = core;
  const scope = createScope();
  const close = button(core, scope, {
    label: t('ui.back'),
    block: true,
    onClick: onClose,
    sfx: 'back',
  });
  close.setAttribute('data-autofocus', '');
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  });
  const none = t('stats.none');
  const best = (mode: Mode, d: Difficulty): string => String(p.best[bestKey(mode, d)] || none);
  const row = (label: string, value: string): HTMLElement =>
    h('li', { class: 'sq-stat' }, [h('span', { text: label }), h('b', { text: value })]);
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
  const cats = CATEGORIES.map((c) => {
    const acc = categoryAccuracy(p, c);
    const bar = h('i', {
      class: 'sq-acc__bar',
      style: `--v:${(acc ?? 0) / 100}`,
      'aria-hidden': 'true',
    });
    return h('li', { class: 'sq-acc' }, [
      catIcon(c),
      h('span', { class: 'sq-acc__name', text: t(`cat.${c}`) }),
      bar,
      h('b', { text: acc === null ? none : `${acc}%` }),
    ]);
  });
  const duelTotal = diffs.reduce((n, d) => n + p.duel[d].won + p.duel[d].lost + p.duel[d].drawn, 0);
  const el = h('section', { class: 'ng-screen sq-stats', 'aria-labelledby': 'sq-stats-title' }, [
    stage(),
    h('h2', { class: 'ng-h ng-h--sm', id: 'sq-stats-title', text: t('stats.title') }),
    h('ul', { class: 'sq-statlist' }, [
      row(t('stats.rounds'), String(p.plays)),
      row(t('stats.wins'), String(p.wins)),
      row(t('stats.streak'), String(p.bestStreak)),
    ]),
    h('h3', { class: 'sq-stats__h', text: t('stats.best') }),
    h('ul', { class: 'sq-statlist' }, [
      ...diffs.map((d) =>
        row(`${t('mode.classic')} / ${t(`difficulty.${d}`)}`, best('classic', d)),
      ),
      ...diffs.map((d) => row(`${t('mode.duel')} / ${t(`difficulty.${d}`)}`, best('duel', d))),
      row(t('mode.daily'), best('daily', 'medium')),
    ]),
    duelTotal
      ? h('p', {
          class: 'hint',
          text: diffs
            .map(
              (d) =>
                `${t(`difficulty.${d}`)}: ${t('stats.duelRecord', { won: p.duel[d].won, lost: p.duel[d].lost, drawn: p.duel[d].drawn })}`,
            )
            .join(' | '),
        })
      : null,
    h('h3', { class: 'sq-stats__h', text: t('stats.accuracy') }),
    h('ul', { class: 'sq-acclist' }, cats),
    h('div', { class: 'ng-sticky-actions' }, [close]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

/** The friendly "questions did not load" screen. Failure is an expected state, not an error. */
export function createPackError(core: Core, o: { onRetry(): void; onMenu(): void }): Component {
  const { t } = core;
  const scope = createScope();
  const retry = button(core, scope, {
    label: t('error.retry'),
    block: true,
    onClick: o.onRetry,
    id: 'sq-retry',
  });
  retry.setAttribute('data-autofocus', '');
  const menu = button(core, scope, {
    label: t('ui.menu'),
    variant: 'secondary',
    block: true,
    onClick: o.onMenu,
    sfx: 'back',
  });
  const el = h('main', { class: 'ng-screen sq-error', role: 'alert' }, [
    stage(),
    h('img', { class: 'menu-art', alt: '', src: './assets/icon/menu-mark.svg' }),
    h('h2', { class: 'ng-h ng-h--sm', text: t('error.pack.title') }),
    h('p', { class: 'hint', text: t('error.pack.body') }),
    h('div', { class: 'ng-sticky-actions' }, [retry, menu]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export interface ResultsInfo {
  won: boolean;
  draw: boolean;
  mode: Mode;
  score: number;
  best: number;
  newBest: boolean;
  stars?: number;
  banter: string;
  rows: { label: string; value: string | number }[];
  note?: string;
  onReplay(): void;
  onMenu(): void;
}

export function createResultsScreen(core: Core, o: ResultsInfo): Component {
  const res = createResults(core, {
    won: o.won,
    score: o.score,
    best: o.best,
    newBest: o.newBest,
    stars: o.stars,
    banter: o.banter,
    rows: o.rows,
    onReplay: o.onReplay,
    onMenu: o.onMenu,
  });
  if (o.draw) {
    const title = res.el.querySelector('.ng-results__title');
    if (title) title.textContent = core.t('results.draw');
  }
  if (o.note) {
    res.el
      .querySelector('.ng-results__banner')
      ?.append(h('p', { class: 'ng-results__sub', text: o.note }));
  }
  res.el.prepend(stage());
  return res;
}
