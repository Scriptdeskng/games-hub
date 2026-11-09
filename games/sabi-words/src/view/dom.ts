import sprite from '../../assets/icons/packs.svg?raw';

const SVG = 'http://www.w3.org/2000/svg';

/** Put the pack sprite in the page once (symbols are referenced by `<use href="#pack-food">`). */
export function mountSprite(): () => void {
  const holder = document.createElement('div');
  holder.id = 'sw-sprite';
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = sprite;
  document.body.append(holder);
  return () => holder.remove();
}

/** Decorative pack icon from the sprite (`#pack-<name>`), tinted by the card's accent. */
export function packIcon(name: string): SVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'sw-pack__i');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#pack-${name}`);
  svg.append(use);
  return svg;
}
