import { createScope } from '../lifecycle';
import { h, type Component, type UiContext } from './dom';

/** Sound / music toggles and language switch. Reads and writes persisted settings. */
export function createSettingsBar(ctx: UiContext): Component {
  const scope = createScope();
  const { settings, i18n } = ctx;
  const el = h('div', { class: 'ng-settings', role: 'group', 'aria-label': ctx.t('ui.language') });
  const refreshers: (() => void)[] = [];
  const mk = (): HTMLButtonElement =>
    h('button', { type: 'button', class: 'ng-btn ng-btn--ghost' });

  const toggle = (key: 'sound' | 'music', icon: string): void => {
    if (!settings) return;
    const b = mk();
    const refresh = (): void => {
      const on = settings.get(key);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = `${icon} ${ctx.t(`ui.${key}`)}: ${ctx.t(on ? 'ui.on' : 'ui.off')}`;
    };
    scope.on(b, 'click', () => {
      settings.set(key, !settings.get(key));
      ctx.audio?.playSfx('tap');
    });
    refreshers.push(refresh);
    refresh();
    el.append(b);
  };
  toggle('sound', '♫');
  toggle('music', '♪');

  if (i18n) {
    const b = mk();
    const refresh = (): void => {
      // Shows the language you will switch TO.
      const target = i18n.lang === 'en' ? 'pcm' : 'en';
      b.textContent = `\u{1F310} ${ctx.t(`ui.lang.${target}`)}`;
      b.setAttribute('lang', target);
    };
    scope.on(b, 'click', () => i18n.setLang(i18n.lang === 'en' ? 'pcm' : 'en'));
    refreshers.push(refresh);
    refresh();
    el.append(b);
  }
  if (settings) scope.add(settings.subscribe(() => refreshers.forEach((r) => r())));
  if (i18n) scope.add(i18n.onChange(() => refreshers.forEach((r) => r())));
  return { el, destroy: () => scope.destroy() };
}
