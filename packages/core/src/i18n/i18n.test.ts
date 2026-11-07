import { describe, expect, it, vi } from 'vitest';
import { createI18n, mergeBundles, normalizeLang } from './index';
import coreEn from './en.json';
import corePcm from './pcm.json';

const en = { hi: 'Hello {name}, you have {n} new', only: 'English only' };
const pcm = { hi: { text: 'How far {name}, you get {n} new', _review: true } };

describe('i18n', () => {
  it('interpolates params and leaves unknown placeholders', () => {
    const i = createI18n({ en, pcm }, 'en');
    expect(i.t('hi', { name: 'Ada', n: 3 })).toBe('Hello Ada, you have 3 new');
    expect(i.t('hi', { name: 'Ada' })).toBe('Hello Ada, you have {n} new');
    expect(i.t('hi')).toBe('Hello {name}, you have {n} new');
  });
  it('switches language, supports _review objects, falls back to en then key', () => {
    const i = createI18n({ en, pcm }, 'pcm');
    expect(i.lang).toBe('pcm');
    expect(i.t('hi', { name: 'Ada', n: 1 })).toBe('How far Ada, you get 1 new');
    expect(i.t('only')).toBe('English only');
    expect(i.t('missing.key')).toBe('missing.key');
    expect(i.has('only')).toBe(true);
    expect(i.has('nope')).toBe(false);
  });
  it('setLang notifies, ignores unknown languages and no-ops', () => {
    const i = createI18n({ en, pcm }, 'en');
    const fn = vi.fn();
    const off = i.onChange(fn);
    i.setLang('xx');
    i.setLang('en');
    expect(fn).not.toHaveBeenCalled();
    i.setLang('pcm');
    expect(fn).toHaveBeenCalledWith('pcm');
    off();
    i.setLang('en');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('normalizeLang understands common tags', () => {
    expect(normalizeLang('EN-GB')).toBe('en');
    expect(normalizeLang('pcm')).toBe('pcm');
    expect(normalizeLang('pidgin')).toBe('pcm');
    expect(normalizeLang('fr')).toBeNull();
    expect(normalizeLang(null)).toBeNull();
    expect(createI18n({ en }, 'zz').lang).toBe('en');
  });
  it('mergeBundles lets later bundles win', () => {
    expect(mergeBundles({ a: '1', b: '2' }, { b: '3' })).toEqual({ a: '1', b: '3' });
  });
  it('core en and pcm bundles have the same keys', () => {
    expect(Object.keys(corePcm).sort()).toEqual(Object.keys(coreEn).sort());
  });
});
