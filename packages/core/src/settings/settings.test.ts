import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorage } from '../storage';
import { DEFAULT_SETTINGS, createSettings } from './index';

afterEach(() => localStorage.clear());

describe('settings', () => {
  it('starts with defaults and persists changes', () => {
    const st = createStorage('g');
    const s = createSettings(st);
    expect(s.all()).toEqual(DEFAULT_SETTINGS);
    s.set('sound', false);
    s.set('lang', 'pcm');
    const again = createSettings(createStorage('g'));
    expect(again.get('sound')).toBe(false);
    expect(again.get('lang')).toBe('pcm');
    expect(again.get('music')).toBe(true);
  });
  it('notifies subscribers only on real changes and can unsubscribe', () => {
    const s = createSettings(createStorage('g'));
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.set('music', true); // unchanged default
    s.set('music', false);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('music', false);
    off();
    s.set('music', true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('clamps volumes to 0..1 and ignores wrongly typed stored values', () => {
    localStorage.setItem(
      'naija:g:settings',
      JSON.stringify({ masterVolume: 'loud', sound: 'yes', sfxVolume: 0.3 }),
    );
    const s = createSettings(createStorage('g'));
    expect(s.get('masterVolume')).toBe(DEFAULT_SETTINGS.masterVolume);
    expect(s.get('sound')).toBe(true);
    expect(s.get('sfxVolume')).toBe(0.3);
    s.set('masterVolume', 5);
    expect(s.get('masterVolume')).toBe(1);
    s.set('masterVolume', -1);
    expect(s.get('masterVolume')).toBe(0);
    s.set('masterVolume', NaN);
    expect(s.get('masterVolume')).toBe(0);
    s.destroy();
  });
});
