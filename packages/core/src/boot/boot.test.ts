import { afterEach, describe, expect, it } from 'vitest';
import { leakCounters } from '../lifecycle';
import { boot } from './index';

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
  document.title = '';
});

const locales = {
  en: { 'game.title': 'My Game', 'x.y': 'Hello {n}' },
  pcm: { 'game.title': 'My Game Pidgin', 'x.y': 'How far {n}' },
};

describe('boot', () => {
  it('wires core services, merges strings, sets lang and title, and cleans up', async () => {
    const base = leakCounters();
    const root = document.body.appendChild(document.createElement('div'));
    const core = boot({ slug: 'demo', root, locales, noServiceWorker: true, search: '' });
    expect(root.classList.contains('ng-app')).toBe(true);
    expect(core.t('x.y', { n: 2 })).toBe('Hello 2');
    expect(core.t('ui.play')).toBe('Play'); // core string
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('My Game');
    expect(await core.sw).toBe('skipped');

    core.i18n.setLang('pcm');
    expect(core.settings.get('lang')).toBe('pcm');
    expect(document.documentElement.lang).toBe('pcm');
    expect(document.title).toBe('My Game Pidgin');
    core.exposeTestHook({
      autoplay: async () => 1,
      getState: () => 2,
      setSeed: () => undefined,
      screen: () => 's',
      destroy: () => undefined,
    });
    expect(window.__naijaTest?.game).toBe('demo');
    expect(window.__naijaTest?.events()).toEqual([]);

    core.destroy();
    expect(window.__naijaTest).toBeUndefined();
    expect(root.classList.contains('ng-app')).toBe(false);
    expect(leakCounters()).toEqual(base);
  });
  it('language priority: portal ?lang beats the saved setting; saved beats default', () => {
    const root = document.createElement('div');
    const first = boot({ slug: 'demo', root, locales, noServiceWorker: true, search: '' });
    first.settings.set('lang', 'pcm');
    first.destroy();
    const saved = boot({ slug: 'demo', root, locales, noServiceWorker: true, search: '' });
    expect(saved.i18n.lang).toBe('pcm');
    saved.destroy();
    const param = boot({ slug: 'demo', root, locales, noServiceWorker: true, search: '?lang=en' });
    expect(param.i18n.lang).toBe('en');
    param.destroy();
  });
  it('reports uncaught errors to the portal log (rate limited, message only)', () => {
    const root = document.createElement('div');
    const core = boot({ slug: 'demo', root, locales, noServiceWorker: true, search: '' });
    for (let i = 0; i < 8; i++)
      window.dispatchEvent(new ErrorEvent('error', { message: `boom ${i}` }));
    const errs = core.portal.log.filter((e) => e.type === 'error');
    expect(errs).toHaveLength(5);
    expect(errs[0]!.data).toEqual({ message: 'boom 0' });
    core.destroy();
  });
  it('registers the service worker by default (skipped in dev)', async () => {
    const root = document.createElement('div');
    const core = boot({ slug: 'demo', root, locales, search: '' });
    expect(await core.sw).toBe('skipped');
    core.destroy();
  });
});
