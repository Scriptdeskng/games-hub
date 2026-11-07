import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '../i18n';
import coreEn from '../i18n/en.json';
import corePcm from '../i18n/pcm.json';
import { createScope, leakCounters } from '../lifecycle';
import { createSettings } from '../settings';
import { createStorage } from '../storage';
import {
  createDifficultyPicker,
  createHowToPlay,
  createHud,
  createMenu,
  createModal,
  createPause,
  createResults,
  createScreenHost,
  createSettingsBar,
  button,
  icon,
  focusInitial,
  toast,
  type UiContext,
} from './index';

const i18n = createI18n({ en: coreEn, pcm: corePcm }, 'en');
const sfx = vi.fn();
const settings = createSettings(createStorage('ui-test'));
const ctx: UiContext = { t: i18n.t, audio: { playSfx: sfx }, settings, i18n };

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  sfx.mockClear();
  i18n.setLang('en');
});

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

const press = (el: Element, key: string, init: KeyboardEventInit = {}): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
};

describe('menu and screen host', () => {
  it('renders items as buttons, plays sfx, supports arrow keys, focuses the first', () => {
    const base = leakCounters();
    const root = document.body.appendChild(document.createElement('div'));
    const host = createScreenHost(root);
    const a = vi.fn();
    const b = vi.fn();
    const menu = createMenu(ctx, {
      title: 'T',
      tagline: 'tag',
      items: [
        { id: 'a', label: 'A', onSelect: a },
        { id: 'b', label: 'B', onSelect: b },
      ],
      footer: [document.createElement('i')],
      extra: [document.createElement('b')],
    });
    host.show('menu', menu);
    expect(host.screenId).toBe('menu');
    const btns = root.querySelectorAll('button');
    expect(btns).toHaveLength(2);
    expect(document.activeElement).toBe(btns[0]);
    press(btns[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(btns[1]);
    press(btns[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(btns[0]);
    press(btns[0]!, 'ArrowUp');
    expect(document.activeElement).toBe(btns[1]);
    btns[1]!.click();
    expect(b).toHaveBeenCalled();
    expect(sfx).toHaveBeenCalledWith('select');
    host.show('other', createHowToPlay(ctx, { steps: ['one', 'two'], onClose: a }));
    expect(root.querySelectorAll('li')).toHaveLength(2);
    host.destroy();
    expect(root.children).toHaveLength(0);
    expect(leakCounters()).toEqual(base);
  });
  it('focusInitial falls back to the container', () => {
    const el = document.body.appendChild(document.createElement('div'));
    focusInitial(el);
    expect(document.activeElement).toBe(el);
    expect(el.tabIndex).toBe(-1);
  });
  it('how-to closes on button and Escape', () => {
    const onClose = vi.fn();
    const c = createHowToPlay(ctx, {
      steps: ['x'],
      onClose,
      title: 'Custom',
      art: document.createElement('svg'),
    });
    document.body.append(c.el);
    expect(c.el.querySelector('h2')!.textContent).toBe('Custom');
    c.el.querySelector('button')!.click();
    press(window as unknown as Element, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(2);
    c.destroy();
  });
});

describe('difficulty picker', () => {
  it('uses native radios, reports changes, set() does not notify', () => {
    const onChange = vi.fn();
    const p = createDifficultyPicker(ctx, { value: 'medium', onChange });
    document.body.append(p.el);
    const radios = [...p.el.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    expect(radios.map((r) => r.value)).toEqual(['easy', 'medium', 'hard']);
    expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
    expect(p.el.querySelector('[role=radiogroup]')).not.toBeNull();
    radios[2]!.checked = true;
    radios[2]!.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('hard');
    expect(p.value).toBe('hard');
    radios[2]!.dispatchEvent(new Event('change')); // same value: no repeat
    expect(onChange).toHaveBeenCalledTimes(1);
    p.set('easy');
    expect(radios[0]!.checked).toBe(true);
    expect(p.value).toBe('easy');
    expect(onChange).toHaveBeenCalledTimes(1);
    p.destroy();
  });
});

describe('modal and pause', () => {
  it('is a labelled dialog, traps Tab, closes on Escape and restores focus', async () => {
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    const base = leakCounters();
    const onDismiss = vi.fn();
    const m = createModal(ctx, {
      title: 'Hi',
      body: 'Body',
      onDismiss,
      actions: [
        { label: 'One', onClick: vi.fn() },
        { label: 'Two', onClick: vi.fn() },
      ],
    });
    await nextFrame();
    const dlg = m.el.querySelector('[role=dialog]')!;
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-labelledby')).toBe(dlg.querySelector('h2')!.id);
    const [one, two] = [...m.el.querySelectorAll('button')];
    expect(document.activeElement).toBe(one);
    two!.focus();
    press(two!, 'Tab');
    expect(document.activeElement).toBe(one);
    press(one!, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(two);
    opener.focus(); // focus escaped the dialog
    press(m.el, 'Tab');
    expect(document.activeElement).toBe(one);
    press(m.el, 'Escape');
    expect(onDismiss).toHaveBeenCalled();
    expect(document.querySelector('.ng-modal')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(leakCounters()).toEqual(base);
    m.close(); // idempotent
  });
  it('backdrop tap dismisses only when dismissible; actions close and run', () => {
    const fixed = createModal(ctx, { title: 'x', actions: [{ label: 'ok', onClick: vi.fn() }] });
    fixed.el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    press(fixed.el, 'Escape');
    expect(document.querySelector('.ng-modal')).not.toBeNull();
    const click = vi.fn();
    const keep = createModal(ctx, {
      title: 'k',
      actions: [{ label: 'stay', onClick: click, keepOpen: true }],
    });
    keep.el.querySelectorAll('button')[0]!.click();
    expect(click).toHaveBeenCalled();
    expect(document.contains(keep.el)).toBe(true);
    keep.destroy();
    const node = document.createElement('p');
    const d = createModal(ctx, {
      title: 'd',
      body: node,
      onDismiss: vi.fn(),
      actions: [{ label: 'a', onClick: vi.fn() }],
    });
    d.el.dispatchEvent(new Event('pointerdown'));
    expect(document.contains(d.el)).toBe(false);
    fixed.close();
  });
  it('pause offers resume, restart, quit', () => {
    const on = { onResume: vi.fn(), onRestart: vi.fn(), onQuit: vi.fn() };
    const p = createPause(ctx, on);
    const labels = [...p.el.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['Resume', 'Restart', 'Quit']);
    p.el.querySelectorAll('button')[2]!.click();
    expect(on.onQuit).toHaveBeenCalled();
    const p2 = createPause(ctx, on);
    press(p2.el, 'Escape');
    expect(on.onResume).toHaveBeenCalled();
  });
});

describe('hud, results, toast, settings bar', () => {
  it('hud only touches the DOM when a value changes', () => {
    const hud = createHud([
      { id: 's', label: 'Score' },
      { id: 't', label: 'Time', value: '30' },
    ]);
    const v = hud.el.querySelector('.ng-hud__value')!;
    expect(v.textContent).toBe('0');
    const spy = vi.spyOn(v, 'textContent', 'set');
    hud.set('s', 5);
    hud.set('s', 5);
    hud.set('nope', 1);
    expect(spy).toHaveBeenCalledTimes(1);
    const extra = document.createElement('button');
    hud.addControl(extra);
    expect(hud.el.contains(extra)).toBe(true);
    hud.destroy();
  });
  it('results show win/lose, stars, stats and actions', () => {
    const onReplay = vi.fn();
    const onMenu = vi.fn();
    const r = createResults(ctx, {
      won: true,
      score: 120,
      best: 150,
      newBest: false,
      stars: 2,
      rows: [{ label: 'Acc', value: '90%' }],
      banter: 'Well done',
      onReplay,
      onMenu,
    });
    document.body.append(r.el);
    expect(r.el.querySelector('.ng-results__title')!.textContent).toBe('You win!');
    expect(r.el.querySelectorAll('.ng-star.is-on')).toHaveLength(2);
    expect(r.el.querySelectorAll('.ng-star')).toHaveLength(3);
    expect(r.el.querySelectorAll('.ng-stat')).toHaveLength(3);
    expect(r.el.querySelector('.ng-confetti')).not.toBeNull();
    expect(r.el.textContent).toContain('Well done');
    const [replay, menu] = r.el.querySelectorAll('.ng-results__actions button');
    (replay as HTMLElement).click();
    (menu as HTMLElement).click();
    expect(onReplay).toHaveBeenCalled();
    expect(onMenu).toHaveBeenCalled();
    r.destroy();
    const lose = createResults(ctx, {
      won: false,
      score: 1,
      best: 1,
      newBest: true,
      onReplay,
      onMenu,
    });
    expect(lose.el.querySelector('.ng-results__title')!.textContent).toBe(
      'Nearly there. Try again!',
    );
    expect(lose.el.querySelector('.ng-stars')).toBeNull();
    expect(lose.el.querySelector('.ng-results__sub')!.textContent).toBe('New best!');
    expect(lose.el.querySelector('.ng-confetti')).toBeNull();
  });
  it('toast shows a status message and removes itself and its timer', () => {
    vi.useFakeTimers();
    const base = leakCounters();
    const t1 = toast(document.body, 'Hello');
    const t2 = toast(document.body, 'Bad', { kind: 'bad', ms: 500 });
    expect(document.querySelectorAll('.ng-toast')).toHaveLength(2);
    expect(document.querySelector('.ng-toast--bad')).not.toBeNull();
    vi.advanceTimersByTime(600);
    expect(document.querySelectorAll('.ng-toast')).toHaveLength(1);
    t1.dismiss();
    t2.dismiss();
    expect(document.querySelector('.ng-toast-host')).toBeNull();
    expect(leakCounters()).toEqual(base);
    vi.useRealTimers();
  });
  it('settings bar toggles persisted sound/music and the language', () => {
    const bar = createSettingsBar(ctx);
    document.body.append(bar.el);
    const [sound, music, lang] = [...bar.el.querySelectorAll('button')];
    expect(sound!.getAttribute('aria-pressed')).toBe('true');
    sound!.click();
    expect(settings.get('sound')).toBe(false);
    expect(sound!.getAttribute('aria-pressed')).toBe('false');
    expect(sound!.textContent).toContain('off');
    music!.click();
    expect(settings.get('music')).toBe(false);
    expect(lang!.textContent).toContain('Pidgin');
    lang!.click();
    expect(i18n.lang).toBe('pcm');
    expect(lang!.textContent).toContain('English');
    bar.destroy();
    const bare = createSettingsBar({ t: i18n.t });
    expect(bare.el.children).toHaveLength(0);
    settings.set('sound', true);
    settings.set('music', true);
  });
});

describe('icons', () => {
  it('inlines decorative currentColor svgs and supports icon-only buttons', () => {
    const on = icon('sound-on', 'on');
    expect(on.getAttribute('class')).toBe('ng-icon ng-icon--on');
    expect(on.getAttribute('aria-hidden')).toBe('true');
    expect(on.getAttribute('width')).toBeNull();
    expect(icon('pause').getAttribute('class')).toBe('ng-icon');
    const scope = createScope();
    const b = button(ctx, scope, {
      label: 'Pause',
      icon: 'pause',
      ariaLabel: 'Pause',
      variant: 'icon',
      onClick: vi.fn(),
    });
    expect(b.querySelector('svg.ng-icon')).not.toBeNull();
    expect(b.textContent).toBe('');
    expect(b.getAttribute('aria-label')).toBe('Pause');
    scope.destroy();
  });
});
