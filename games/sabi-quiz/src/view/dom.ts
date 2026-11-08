import sprite from '../../assets/icons/categories.svg?raw';

export const LETTERS = ['A', 'B', 'C', 'D'] as const;
export const letterOf = (i: number): string => LETTERS[i] ?? '?';

const SVG = 'http://www.w3.org/2000/svg';

/** Put the category sprite in the page once (symbols are referenced by `<use href="#cat-x">`). */
export function mountSprite(): () => void {
  const holder = document.createElement('div');
  holder.id = 'sq-sprite';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = sprite;
  document.body.append(holder);
  return () => holder.remove();
}

/** Decorative category icon from the sprite, tinted by `color`. */
export function catIcon(category: string): SVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'sq-cat');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#cat-${category}`);
  svg.append(use);
  return svg;
}

/** Parse a small inline SVG string into an element. */
export function svgFrom(markup: string): SVGElement {
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  return holder.firstElementChild as SVGElement;
}

/** Re-run a one-shot CSS animation class (one forced reflow). */
export function restart(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
