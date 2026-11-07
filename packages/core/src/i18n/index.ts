/**
 * Tiny i18n runtime. Locale files are flat JSON: `"menu.play": "Play"`. A line a human should
 * double-check is written as `{ "text": "...", "_review": true }`.
 * `t('key', { n: 3 })` replaces `{n}`. Missing keys fall back to English, then to the key.
 */
export type LocaleValue = string | { text: string; _review?: boolean };
export type LocaleBundle = Record<string, LocaleValue>;
export type TFn = (key: string, params?: Record<string, string | number>) => string;

export const SUPPORTED_LANGS = ['en', 'pcm'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export interface I18n {
  t: TFn;
  readonly lang: Lang;
  setLang(lang: string): void;
  onChange(fn: (lang: Lang) => void): () => void;
  has(key: string): boolean;
}

export const normalizeLang = (raw: string | null | undefined): Lang | null => {
  const l = (raw ?? '').toLowerCase().trim();
  if (l === 'pcm' || l === 'pcm-ng' || l === 'pidgin') return 'pcm';
  if (l === 'en' || l.startsWith('en-')) return 'en';
  return null;
};

const text = (v: LocaleValue | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === 'string' ? v : v.text;

/** Merge bundles left to right (later bundles win). */
export const mergeBundles = (...bundles: LocaleBundle[]): LocaleBundle =>
  Object.assign({}, ...bundles) as LocaleBundle;

export function createI18n(
  locales: Partial<Record<Lang, LocaleBundle>>,
  initial: string | null = 'en',
): I18n {
  let lang: Lang = normalizeLang(initial) ?? 'en';
  const subs = new Set<(l: Lang) => void>();
  const lookup = (key: string): string | undefined =>
    text(locales[lang]?.[key]) ?? text(locales.en?.[key]);
  return {
    t(key, params) {
      const s = lookup(key) ?? key;
      return params
        ? s.replace(/\{(\w+)\}/g, (m, p: string) => (p in params ? String(params[p]) : m))
        : s;
    },
    get lang() {
      return lang;
    },
    setLang(next) {
      const l = normalizeLang(next);
      if (!l || l === lang) return;
      lang = l;
      subs.forEach((fn) => fn(l));
    },
    onChange(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    has: (key) => lookup(key) !== undefined,
  };
}
