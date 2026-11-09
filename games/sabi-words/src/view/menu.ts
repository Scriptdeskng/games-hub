import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import {
  arrowNav,
  button,
  createDifficultyPicker,
  createHowToPlay,
  createMenu,
  createSettingsBar,
  h,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { PACKS, packMeta } from '../content';
import { PROFILES, type DailyRecord, type Progress } from '../rules';
import { packIcon } from './dom';

export const stage = (): HTMLElement => h('div', { class: 'sw-stage' });

/** One pack card (`.sw-pack`): icon, name and a one-line description. */
function packCard(core: Core, id: string, tag: 'button' | 'div'): HTMLElement {
  const m = packMeta(id);
  const card = h(tag, { class: `sw-pack sw-pack--${m.cls}` });
  if (tag === 'button') card.setAttribute('type', 'button');
  card.append(
    packIcon(m.icon),
    h('span', { class: 'sw-pack__t' }, [
      h('b', { text: core.t(`pack.${id}.name`) }),
      h('small', { text: core.t(`pack.${id}.desc`) }),
    ]),
  );
  return card;
}

export interface MenuOptions {
  difficulty: Difficulty;
  packId: string;
  progress: Progress;
  daily: DailyRecord | null;
  dailyDone: boolean;
  onDifficulty(d: Difficulty): void;
  onPlay(): void;
  onDaily(): void;
  onPacks(): void;
  onStats(): void;
  onHowTo(): void;
}

export function createMenuScreen(core: Core, o: MenuOptions): Component {
  const { t } = core;
  const scope = createScope();
  const hint = (d: Difficulty): string => {
    const p = PROFILES[d];
    return t('menu.hint', {
      size: p.size,
      words: p.words,
      min: Math.round(p.durationMs / 60000),
      dirs: t(`menu.dirs.${d}`),
    });
  };
  const hintEl = h('p', {
    class: 'hint ng-muted',
    'aria-live': 'polite',
    text: hint(o.difficulty),
  });
  const picker = createDifficultyPicker(core, {
    value: o.difficulty,
    onChange: (d) => {
      hintEl.textContent = hint(d);
      o.onDifficulty(d);
    },
  });
  const packBtn = packCard(core, o.packId, 'button');
  packBtn.id = 'menu-pack';
  packBtn.setAttribute('aria-label', t('menu.pack', { name: t(`pack.${o.packId}.name`) }));
  scope.on(packBtn, 'click', () => {
    core.audio.playSfx('packPick');
    o.onPacks();
  });
  const dailyEl = h('p', {
    class: 'hint ng-muted',
    text:
      o.dailyDone && o.daily
        ? o.daily.finished
          ? t('menu.dailyDone', { score: o.daily.score })
          : t('menu.dailyUsed')
        : t('menu.dailyNew'),
  });
  const small = (label: string, id: string, onClick: () => void): HTMLElement =>
    button(core, scope, { label, variant: 'secondary', id, onClick });
  const bar = createSettingsBar(core);
  const menu = createMenu(core, {
    title: t('game.title'),
    tagline: t('game.tagline'),
    art: h('img', { class: 'menu-art', alt: '', src: './assets/icon/menu-mark.svg' }),
    extra: [packBtn, picker.el, hintEl],
    items: [
      { id: 'play', label: t('ui.play'), onSelect: o.onPlay },
      { id: 'daily', label: t('menu.daily'), variant: 'accent', onSelect: o.onDaily },
    ],
    footer: [
      dailyEl,
      h('div', { class: 'sw-menu-row' }, [
        small(t('menu.stats'), 'menu-stats', o.onStats),
        small(t('menu.howto'), 'menu-howto', o.onHowTo),
      ]),
      h('p', {
        class: 'hint ng-muted sw-menu-coins',
        text: t('menu.coins', { n: o.progress.coins }),
      }),
      bar.el,
    ],
  });
  menu.el.prepend(stage());
  return {
    el: menu.el,
    destroy() {
      [menu, picker, bar].forEach((c) => c.destroy());
      scope.destroy();
    },
  };
}

/** The pack picker: six cards, the current one marked. Picking one returns to the menu. */
export function createPacksScreen(
  core: Core,
  o: { current: string; onPick(id: string): void; onBack(): void },
): Component {
  const { t } = core;
  const scope = createScope();
  const list = h('ul', { class: 'sw-packlist' });
  PACKS.forEach((p) => {
    const card = packCard(core, p.id, 'button');
    card.setAttribute('data-pack', p.id);
    card.setAttribute('aria-pressed', String(p.id === o.current));
    if (p.id === o.current) card.setAttribute('data-autofocus', '');
    scope.on(card, 'click', () => {
      core.audio.playSfx('packPick');
      o.onPick(p.id);
    });
    list.append(h('li', {}, [card]));
  });
  arrowNav(scope, list, 'button');
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
  const el = h('section', { class: 'ng-screen sw-packs', 'aria-labelledby': 'sw-packs-title' }, [
    stage(),
    h('h2', { class: 'ng-h ng-h--sm', id: 'sw-packs-title', text: t('menu.packTitle') }),
    list,
    h('div', { class: 'ng-sticky-actions' }, [back]),
  ]);
  return { el, destroy: () => scope.destroy() };
}

export function createHowToScreen(core: Core, onClose: () => void): Component {
  const c = createHowToPlay(core, {
    steps: [1, 2, 3, 4, 5].map((n) => core.t(`game.howto.${n}`)),
    onClose,
  });
  c.el.prepend(stage());
  return c;
}
