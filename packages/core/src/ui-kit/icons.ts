import pause from '../../assets/icons/pause.svg?raw';
import soundOn from '../../assets/icons/sound-on.svg?raw';
import soundOff from '../../assets/icons/sound-off.svg?raw';
import musicOn from '../../assets/icons/music-on.svg?raw';
import check from '../../assets/icons/check.svg?raw';
import alert from '../../assets/icons/alert.svg?raw';
import musicOff from '../../assets/icons/music-off.svg?raw';

/**
 * Designer icons (packages/core/assets/icons/*.svg, fill=currentColor), inlined individually
 * because `icons.svg` (the sprite) is not generated yet. Only icons the ui-kit uses are bundled
 * (about 1.2 KB). Add more here as components need them.
 */
const ICONS = {
  pause,
  'sound-on': soundOn,
  'sound-off': soundOff,
  'music-on': musicOn,
  'music-off': musicOff,
  check,
  alert,
};
export type IconName = keyof typeof ICONS;

/** Decorative inline icon (`.ng-icon`, aria-hidden). `variant` adds `ng-icon--on|off` for toggles. */
export function icon(name: IconName, variant?: 'on' | 'off'): SVGElement {
  const holder = document.createElement('span');
  holder.innerHTML = ICONS[name];
  const svg = holder.firstElementChild as SVGElement;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('class', `ng-icon${variant ? ` ng-icon--${variant}` : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}
