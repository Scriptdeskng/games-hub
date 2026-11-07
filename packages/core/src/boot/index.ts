import { createAudio, type AudioEngine } from '../audio';
import {
  createI18n,
  mergeBundles,
  normalizeLang,
  type I18n,
  type LocaleBundle,
  type TFn,
} from '../i18n';
import coreEn from '../i18n/en.json';
import corePcm from '../i18n/pcm.json';
import { createScope, type Scope } from '../lifecycle';
import { createPerf, type Perf } from '../perf';
import { createPortal, type Portal } from '../portal';
import { createSettings, type Settings } from '../settings';
import { createStorage, type Store } from '../storage';
import { installTestHook, type TestHookOptions } from '../test-hook';
import { registerServiceWorker, type SwResult } from '../sw';

export interface BootOptions {
  /** game slug, e.g. 'naija-whot'. Used for storage namespace, portal events and cache name. */
  slug: string;
  /** element the game renders into; gets the `ng-app` class */
  root: HTMLElement;
  /** the game's own strings, merged over core strings */
  locales: { en: LocaleBundle; pcm: LocaleBundle };
  /** document.title per language is derived from key 'game.title' if present */
  /** skip service worker registration (tests) */
  noServiceWorker?: boolean;
  search?: string;
  /** portal origins allowed to receive events and the token (default: https + localhost) */
  allowedPortalOrigins?: readonly string[];
  /** also accept http://localhost / 127.0.0.1 / [::1] as the portal (default: only in non-production builds) */
  allowLocalPortal?: boolean;
}

export interface Core {
  slug: string;
  root: HTMLElement;
  t: TFn;
  i18n: I18n;
  storage: Store;
  settings: Settings;
  audio: AudioEngine;
  portal: Portal;
  perf: Perf;
  scope: Scope;
  /** resolves once SW registration was attempted */
  sw: Promise<SwResult>;
  /** expose `window.__naijaTest` (no-op in production builds) */
  exposeTestHook(o: Omit<TestHookOptions, 'game' | 'perf' | 'events'>): void;
  destroy(): void;
}

/** Wire every core service for one game. Call `core.destroy()` to remove everything. */
export function boot(o: BootOptions): Core {
  const scope = createScope();
  const storage = createStorage(o.slug);
  const settings = createSettings(storage);
  const portal = createPortal({
    game: o.slug,
    storage,
    search: o.search,
    allowedOrigins: o.allowedPortalOrigins,
    allowLocal: o.allowLocalPortal,
  });
  const lang = normalizeLang(portal.params.lang) ?? normalizeLang(settings.get('lang')) ?? 'en';
  const i18n = createI18n(
    { en: mergeBundles(coreEn, o.locales.en), pcm: mergeBundles(corePcm, o.locales.pcm) },
    lang,
  );
  const applyLang = (): void => {
    document.documentElement.lang = i18n.lang;
    const titleKey = 'game.title'; // optional: games that define it get a translated document.title
    const title = i18n.has(titleKey) ? i18n.t(titleKey) : '';
    if (title) document.title = title;
  };
  applyLang();
  scope.add(
    i18n.onChange((l) => {
      settings.set('lang', l);
      applyLang();
    }),
  );
  o.root.classList.add('ng-app');
  // Reduced motion: the OS preference or the saved setting turns animations off (see ui-kit.css).
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const applyMotion = (): void => {
    const on = settings.get('reducedMotion') || !!mq?.matches;
    if (on) o.root.setAttribute('data-reduced-motion', '');
    else o.root.removeAttribute('data-reduced-motion');
  };
  applyMotion();
  scope.add(settings.subscribe((k) => k === 'reducedMotion' && applyMotion()));
  if (mq) scope.on(mq, 'change', applyMotion);

  const audio = createAudio({ settings });
  const perf = createPerf();

  // Report uncaught problems to the portal (rate limited; message only, never URLs or tokens).
  let errors = 0;
  const report = (message: string): void => {
    if (errors++ < 5) portal.emit('error', { message: message.slice(0, 200) });
  };
  scope.on(window, 'error', (e: ErrorEvent) => report(e.message || 'error'));
  scope.on(window, 'unhandledrejection', (e: PromiseRejectionEvent) => report(String(e.reason)));

  let removeHook: () => void = () => undefined;
  const sw = o.noServiceWorker ? Promise.resolve<SwResult>('skipped') : registerServiceWorker();

  return {
    slug: o.slug,
    root: o.root,
    t: i18n.t,
    i18n,
    storage,
    settings,
    audio,
    portal,
    perf,
    scope,
    sw,
    exposeTestHook(h) {
      removeHook = installTestHook({
        ...h,
        game: o.slug,
        perf,
        events: () => portal.log.map(({ type, data }) => ({ type, data })),
      });
    },
    destroy() {
      removeHook();
      audio.destroy();
      perf.destroy();
      settings.destroy();
      scope.destroy();
      o.root.classList.remove('ng-app');
      o.root.removeAttribute('data-reduced-motion');
    },
  };
}
