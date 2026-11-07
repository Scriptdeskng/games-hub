import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leakCounters } from '../lifecycle';
import { createDiceView, type DiceView } from './dice-view';

const t = (k: string, p?: Record<string, string | number>): string =>
  p ? `${k}:${Object.values(p).join(',')}` : k;

const faceValue = (v: DiceView): string | undefined =>
  v.el.querySelector<HTMLElement>('.ng-dice__cube .ng-dice__face')?.dataset.value;
const pips = (v: DiceView): number => v.el.querySelectorAll('.ng-dice__cube .is-on').length;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('dice view', () => {
  it('draws pips for each face and a blank state', () => {
    const v = createDiceView({ t });
    document.body.append(v.el);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      v.show(n);
      expect(pips(v)).toBe(n);
      expect(faceValue(v)).toBe(String(n));
    }
    v.show(null);
    expect(pips(v)).toBe(0);
    v.destroy();
    v.el.remove();
  });

  it('only requests a roll while enabled, from tap, and not while rolling', async () => {
    const v = createDiceView({ t }, { shakeMs: 100, rollMs: 50 });
    const btn = v.el.querySelector('button.ng-dice') as HTMLButtonElement;
    const onReq = vi.fn();
    v.onRequest(onReq);
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(onReq).not.toHaveBeenCalled();
    v.setEnabled(true);
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onReq).toHaveBeenCalledTimes(1);
    const p = v.roll(4);
    expect(v.rolling).toBe(true);
    btn.click();
    expect(onReq).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(v.el.classList.contains('is-tumbling')).toBe(true);
    vi.advanceTimersByTime(50);
    await p;
    expect(v.rolling).toBe(false);
    expect(faceValue(v)).toBe('4');
    expect(v.el.classList.contains('is-tumbling')).toBe(false);
    v.destroy();
  });

  it('shakes first, then tumbles, and skip() finishes at once', async () => {
    const v = createDiceView({ t });
    const p = v.roll(6);
    expect(v.el.classList.contains('is-shaking')).toBe(true);
    v.skip();
    await p;
    expect(faceValue(v)).toBe('6');
    expect(v.el.classList.contains('is-shaking')).toBe(false);
    v.skip(); // nothing to skip
    v.destroy();
  });

  it('a shake-only roll (null) leaves the die blank for the two-dice choice', async () => {
    const v = createDiceView({ t }, { reducedMotion: () => true });
    await v.roll(4);
    await v.roll(null);
    expect(faceValue(v)).toBe('');
    expect(v.el.querySelector('.ng-dice__cube')?.classList.contains('is-blank')).toBe(true);
    const w = createDiceView({ t }, { shakeMs: 10, rollMs: 10 });
    const p = w.roll(null);
    vi.advanceTimersByTime(20);
    await p;
    expect(faceValue(w)).toBe('');
    v.destroy();
    w.destroy();
  });

  it('a second roll replaces the first', async () => {
    const v = createDiceView({ t });
    const first = v.roll(2);
    const second = v.roll(5);
    await first;
    vi.advanceTimersByTime(2000);
    await second;
    expect(faceValue(v)).toBe('5');
    v.destroy();
  });

  it('reduced motion changes the face immediately with no timers', async () => {
    const v = createDiceView({ t }, { reducedMotion: () => true });
    await v.roll(3);
    expect(faceValue(v)).toBe('3');
    expect(leakCounters().timers).toBe(0);
    v.destroy();
  });

  it('pick one of two: tap, keyboard 1 and 2, nothing else', async () => {
    const v = createDiceView({ t });
    document.body.append(v.el);
    const p = v.choose([2, 5]);
    const opts = v.el.querySelectorAll<HTMLButtonElement>('.ng-dice__opt');
    expect(opts).toHaveLength(2);
    expect(v.el.classList.contains('is-choosing')).toBe(true);
    expect(opts[1]!.getAttribute('aria-label')).toBe('dice.option:2,5');
    opts[1]!.click();
    expect(await p).toBe(1);
    expect(v.el.querySelectorAll('.ng-dice__opt')).toHaveLength(0);
    expect(v.el.classList.contains('is-choosing')).toBe(false);

    const q = v.choose([6, 1]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(await q).toBe(0);
    const r = v.choose([3, 4]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(await r).toBe(1);
    // keys do nothing when no choice is open
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    v.destroy();
    v.el.remove();
  });

  it('a tap on the die is ignored while a choice is open; CPU choice view highlights the pick', () => {
    const v = createDiceView({ t });
    v.setEnabled(true);
    const onReq = vi.fn();
    v.onRequest(onReq);
    void v.choose([1, 2]);
    (v.el.querySelector('button.ng-dice') as HTMLButtonElement).click();
    expect(onReq).not.toHaveBeenCalled();
    v.showChoice([4, 6], 1);
    const spans = v.el.querySelectorAll('.ng-dice__opt--static');
    expect(spans).toHaveLength(2);
    expect(spans[1]!.classList.contains('is-picked')).toBe(true);
    expect(spans[0]!.classList.contains('is-picked')).toBe(false);
    v.clearChoice();
    expect(v.el.querySelectorAll('.ng-dice__opt')).toHaveLength(0);
    v.destroy();
  });

  it('draws faces from artwork when given, with a blank image before the first roll', async () => {
    const v = createDiceView(
      { t },
      { art: { src: (n) => `./die-${n}.svg`, blank: './die-roll.svg' }, reducedMotion: () => true },
    );
    const img = (): string | null | undefined =>
      v.el.querySelector('.ng-dice__cube img')?.getAttribute('src');
    v.show(null);
    expect(img()).toBe('./die-roll.svg');
    await v.roll(5);
    expect(img()).toBe('./die-5.svg');
    v.show(2);
    expect(img()).toBe('./die-2.svg');
    void v.choose([3, 6]);
    expect(v.el.querySelectorAll('.ng-dice__opt img')).toHaveLength(2);
    v.destroy();
    // no blank given: the image is removed
    const w = createDiceView({ t }, { art: { src: (n) => `./d${n}.svg` } });
    w.show(1);
    w.show(null);
    expect(w.el.querySelector('.ng-dice__cube img')?.hasAttribute('src')).toBe(false);
    w.destroy();
  });

  it('uses artwork for the hands when given and cleans every listener and timer', () => {
    const before = leakCounters();
    const v = createDiceView({ t }, { handsSrc: './hands.svg' });
    expect(v.el.querySelectorAll('img.ng-dice__hand')).toHaveLength(1);
    void v.roll(1);
    void v.choose([1, 2]);
    v.destroy();
    expect(leakCounters()).toEqual(before);
  });
});
