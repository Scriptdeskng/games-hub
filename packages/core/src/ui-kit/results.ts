import { createScope } from '../lifecycle';
import { button, h, type Component, type UiContext } from './dom';

export interface ResultsOptions {
  won: boolean;
  score: number;
  best: number;
  newBest?: boolean;
  /** 0..3, omit to hide */
  stars?: number;
  /** extra stat rows: translated label + value */
  rows?: { label: string; value: string | number }[];
  /** CPU / mascot banter line (already translated) */
  banter?: string;
  onReplay(): void;
  onMenu(): void;
}

const SVG = 'http://www.w3.org/2000/svg';
const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';

const star = (on: boolean): SVGElement => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `ng-star${on ? ' is-on' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', STAR);
  svg.append(p);
  return svg;
};

export function createResults(ctx: UiContext, o: ResultsOptions): Component {
  const scope = createScope();
  const replay = button(ctx, scope, {
    label: ctx.t('ui.replay'),
    block: true,
    onClick: o.onReplay,
  });
  replay.setAttribute('data-autofocus', '');
  const menu = button(ctx, scope, {
    label: ctx.t('ui.menu'),
    variant: 'secondary',
    block: true,
    onClick: o.onMenu,
    sfx: 'back',
  });
  const stat = (label: string, value: string | number): HTMLElement =>
    h('li', { class: 'ng-stat' }, [
      h('span', { class: 'ng-stat__value', text: String(value) }),
      h('span', { class: 'ng-stat__label', text: label }),
    ]);
  const confetti = h(
    'div',
    { class: 'ng-confetti', 'aria-hidden': 'true' },
    Array.from({ length: 12 }, () => h('i')),
  );
  const el = h(
    'main',
    { class: `ng-screen ng-results ${o.won ? 'ng-results--win' : 'ng-results--lose'}` },
    [
      o.won ? confetti : null,
      h('div', { class: 'ng-results__banner' }, [
        h('h1', {
          class: 'ng-results__title',
          text: ctx.t(o.won ? 'results.win' : 'results.lose'),
        }),
        o.newBest
          ? h('p', { class: 'ng-results__sub', role: 'status', text: ctx.t('results.newBest') })
          : null,
        o.stars === undefined
          ? null
          : h(
              'div',
              {
                class: 'ng-results__stars',
                role: 'img',
                'aria-label': ctx.t('results.stars', { n: o.stars }),
              },
              [0, 1, 2].map((i) => star(i < (o.stars ?? 0))),
            ),
      ]),
      o.banter ? h('p', { class: 'ng-banter', text: o.banter }) : null,
      h('ul', { class: 'ng-results__stats' }, [
        stat(ctx.t('results.score'), o.score),
        stat(ctx.t('results.best'), o.best),
        ...(o.rows ?? []).map((r) => stat(r.label, r.value)),
      ]),
      h('div', { class: 'ng-results__actions' }, [replay, menu]),
    ],
  );
  return { el, destroy: () => scope.destroy() };
}
