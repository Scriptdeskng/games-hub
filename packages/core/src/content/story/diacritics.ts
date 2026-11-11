/**
 * Diacritics helpers for Yoruba and Igbo terms. FLAG-ONLY: a script can see that a term has no
 * tone marks or underdots at all, or is not NFC-normalised, but only a native speaker can say the
 * marks are right. `diacriticChecked: true` on a glossary term records that human check.
 */
import type { PackLang } from '../types';

const MARKS = /[̀-ͯ]/u;

/** Strip every combining mark and lower-case: `Ọ̀yọ́` and `oyo` fold to the same key. */
export const foldDiacritics = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();

export const hasDiacritics = (s: string): boolean => MARKS.test(s.normalize('NFD'));
export const isNfc = (s: string): boolean => s === s.normalize('NFC');

export interface DiacriticIssue {
  code: 'no-marks' | 'not-nfc';
  message: string;
}
export interface DiacriticOptions {
  /** Folded terms that legitimately carry no marks (loan words, names already in common spelling). */
  allow?: ReadonlySet<string>;
  /** Terms with fewer letters than this are ignored (default 3). */
  minLetters?: number;
}

export const DIACRITIC_LANGS: readonly PackLang[] = ['yo', 'ig'];

export function checkDiacritics(
  term: string,
  lang: PackLang,
  o: DiacriticOptions = {},
): DiacriticIssue[] {
  const out: DiacriticIssue[] = [];
  if (!isNfc(term)) out.push({ code: 'not-nfc', message: 'is not Unicode NFC normalised' });
  if (!DIACRITIC_LANGS.includes(lang)) return out;
  const letters = (term.match(/\p{L}/gu) ?? []).length;
  if (
    letters >= (o.minLetters ?? 3) &&
    !hasDiacritics(term) &&
    !o.allow?.has(foldDiacritics(term))
  ) {
    out.push({ code: 'no-marks', message: `has no tone marks or underdots (${lang} term)` });
  }
  return out;
}
