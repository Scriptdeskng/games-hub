import { boot, type Core } from '@naija/core/boot';
import en from './i18n/en.json';
import pcm from './i18n/pcm.json';

/** A real core on a fresh root for view tests (jsdom: no audio, no service worker, no canvas). */
export function makeCore(search = ''): { core: Core; root: HTMLElement } {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  const core = boot({
    slug: 'penalty-king',
    root,
    locales: { en, pcm },
    noServiceWorker: true,
    search,
  });
  return { core, root };
}

/** jsdom has no 2D canvas: every canvas reports "no context" and the renderer then does nothing. */
export function stubCanvas(): void {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
}
