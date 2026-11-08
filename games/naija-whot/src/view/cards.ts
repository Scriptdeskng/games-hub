import deckSvg from '../../assets/cards/deck.svg?raw';
import type { TFn } from '@naija/core/i18n';
import { cardOf, type Shape } from '../rules/cards';

const NS = 'http://www.w3.org/2000/svg';

/** Insert the deck sprite ONCE per page (a hidden element); every card is a `<use>` of it. */
export function mountSprite(): () => void {
  const host = document.createElement('div');
  host.className = 'whot-sprite';
  host.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = deckSvg;
  document.body.append(host);
  return () => host.remove();
}

function art(symbol: string, viewBox: string, cls: string): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${symbol}`);
  svg.append(use);
  return svg;
}

/** `c-circle-14`, `c-whot-20`: the id rule of the asset brief. */
export const symbolOf = (id: number): string => {
  const c = cardOf(id);
  return `c-${c.shape}-${c.n}`;
};

/** Accessible name: number and shape, never colour only. */
export const cardLabel = (t: TFn, id: number): string => {
  const c = cardOf(id);
  return t('whot.card', { n: c.n, shape: t(`whot.shape.${c.shape}`) });
};

export function cardButton(t: TFn, id: number): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'whot-card';
  b.dataset.card = String(id);
  b.setAttribute('aria-label', cardLabel(t, id));
  b.append(art(symbolOf(id), '0 0 100 140', 'whot-card__art'));
  return b;
}

/** A face-up card that is not a button (the discard top). */
export function cardFace(t: TFn, id: number): HTMLElement {
  const d = document.createElement('div');
  d.className = 'whot-card';
  d.dataset.card = String(id);
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', cardLabel(t, id));
  d.append(art(symbolOf(id), '0 0 100 140', 'whot-card__art'));
  return d;
}

export function cardBack(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'whot-card whot-card--back';
  d.setAttribute('aria-hidden', 'true');
  d.append(art('c-back', '0 0 100 140', 'whot-card__art'));
  return d;
}

/** The 24x24 shape symbol (`s-circle` ...). */
export const shapeIcon = (shape: Shape, cls = 'wh-shape-icon'): SVGElement =>
  art(`s-${shape}`, '0 0 24 24', cls);
