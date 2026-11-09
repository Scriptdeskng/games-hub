import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { button, createResults, h, type Component, type Difficulty } from '@naija/core/ui-kit';
import { PACKS } from '../content';
import { DIFFICULTIES, type Progress, type Puzzle, type FoundWord } from '../rules';
import { stage } from './menu';
import { createWordList } from './wordlist';

export const clock = (ms: number): string => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

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
  const row = (label: string, value: string): HTMLElement =>
    h('li', { class: 'sw-stat' }, [h('span', { text: label }), h('b', { text: value })]);
  const best = (d: Difficulty): string => {
    const b = p.best[d];
    return b.score
      ? t('stats.bestLine', {
          score: b.score,
          stars: b.stars,
          time: b.fastestMs ? clock(b.fastestMs) : none,
        })
      : none;
  };
  const el = h('section', { class: 'ng-screen sw-stats', 'aria-labelledby': 'sw-stats-title' }, [
    stage(),
    h('h2', { class: 'ng-h ng-h--sm', id: 'sw-stats-title', text: t('stats.title') }),
    h('ul', { class: 'sw-statlist' }, [
      row(t('stats.rounds'), String(p.plays)),
      row(t('stats.wins'), String(p.wins)),
      row(t('stats.words'), String(p.wordsFound)),
      row(t('stats.streak'), String(p.bestStreak)),
      row(t('stats.hints'), String(p.hintsUsed)),
      row(t('stats.coins'), String(p.coins)),
    ]),
    h('h3', { class: 'sw-stats__h', text: t('stats.best') }),
    h(
      'ul',
      { class: 'sw-statlist' },
      DIFFICULTIES.map((d) => row(t(`difficulty.${d}`), best(d))),
    ),
    h('h3', { class: 'sw-stats__h', text: t('stats.packs') }),
    h(
      'ul',
      { class: 'sw-statlist' },
      PACKS.map((m) => {
        const st = p.packs[m.id];
        return row(
          t(`pack.${m.id}.name`),
          st ? t('stats.packLine', { plays: st.plays, wins: st.wins }) : none,
        );
      }),
    ),
    h('div', { class: 'ng-sticky-actions' }, [close]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

/** The friendly "words did not load" screen. Failure is an expected state, not an error. */
export function createPackError(core: Core, o: { onRetry(): void; onMenu(): void }): Component {
  const { t } = core;
  const scope = createScope();
  const retry = button(core, scope, {
    label: t('error.retry'),
    block: true,
    onClick: o.onRetry,
    id: 'sw-retry',
  });
  retry.setAttribute('data-autofocus', '');
  const menu = button(core, scope, {
    label: t('ui.menu'),
    variant: 'secondary',
    block: true,
    onClick: o.onMenu,
    sfx: 'back',
  });
  const el = h('main', { class: 'ng-screen sw-error', role: 'alert' }, [
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
  puzzle: Puzzle;
  found: readonly FoundWord[];
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

/** Core's results screen plus the word slip: every word, the found ones struck through in their lane. */
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
  const list = createWordList(o.puzzle.words, core.t);
  o.found.forEach((f) => list.markFound(f.index, f.lane));
  list.el.classList.add('sw-words--results');
  const stats = res.el.querySelector('.ng-results__stats');
  stats?.after(list.el);
  if (o.note) {
    res.el
      .querySelector('.ng-results__banner')
      ?.append(h('p', { class: 'ng-results__sub sw-results-note', text: o.note }));
  }
  res.el.prepend(stage());
  return res;
}
