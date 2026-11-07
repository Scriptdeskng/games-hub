import type { BoardLayout } from '../rules/config';
import { BOX, connectorsOf, ladderPath, snakePath } from './geometry';

const NS = 'http://www.w3.org/2000/svg';
const SPRITE = './assets/board/connectors.svg';

const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

const stroke = (d: string, color: string, width: number, extra: Record<string, string> = {}) =>
  el('path', {
    d,
    fill: 'none',
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...extra,
  });

export interface ConnectorsView {
  svg: SVGSVGElement;
  /** Highlight the ladder or snake with this id for a moment (opacity only). */
  flash(id: string): void;
  clearFlash(): void;
}

/**
 * Draws every ladder and snake of the layout (so editing the layout table is enough: the overlay
 * redraws itself). Ladders: yellow rails and rungs. Snakes: wavy red with a white dashed centre.
 * Badges and end caps come from assets/board/connectors.svg. Never takes pointer events.
 */
export function renderConnectors(layout: BoardLayout): ConnectorsView {
  const svg = el('svg', {
    viewBox: `0 0 ${BOX} ${BOX}`,
    class: 'sl-board__overlay',
    'aria-hidden': 'true',
    focusable: 'false',
  }) as SVGSVGElement;
  const groups = new Map<string, SVGElement>();
  // snakes first, ladders on top: a ladder is never hidden under a snake body
  const all = connectorsOf(layout.ladders, layout.snakes, layout.size);
  const ordered = [
    ...all.filter((c) => c.kind === 'snake'),
    ...all.filter((c) => c.kind === 'ladder'),
  ];
  for (const c of ordered) {
    const g = el('g', { class: `sl-conn sl-conn--${c.kind}`, 'data-id': c.jump.id });
    if (c.kind === 'ladder') {
      const p = ladderPath(c.from, c.to);
      for (const [color, w] of [
        ['#1d1d20', 10],
        ['#ffc20e', 5.5],
      ] as const) {
        g.append(stroke(p.rails, color, w), stroke(p.rungs, color, w));
      }
    } else {
      const d = snakePath(c.from, c.to);
      g.append(
        stroke(d, '#1d1d20', 14),
        stroke(d, '#d91f26', 9),
        stroke(d, '#ffffff', 2, { 'stroke-dasharray': '6 10' }),
      );
    }
    const theme = c.jump.theme;
    if (theme) {
      g.append(
        el('use', {
          href: `${SPRITE}#badge-${theme}`,
          x: c.from.x + 6 - 36,
          y: c.from.y + 12 - 36,
          width: 72,
          height: 72,
        }),
      );
    }
    g.append(
      el('use', {
        href: `${SPRITE}#end-${c.kind === 'ladder' ? 'up' : 'down'}`,
        x: c.to.x + 8 - 20,
        y: c.to.y + 10 - 20,
        width: 40,
        height: 40,
      }),
    );
    groups.set(c.jump.id, g);
    svg.append(g);
  }
  let hot: SVGElement | null = null;
  const clearFlash = (): void => {
    hot?.classList.remove('is-hot');
    hot = null;
  };
  return {
    svg,
    flash(id) {
      clearFlash();
      hot = groups.get(id) ?? null;
      hot?.classList.add('is-hot');
    },
    clearFlash,
  };
}
