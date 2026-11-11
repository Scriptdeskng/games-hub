import type { ValidationResult } from '../types';
import type { GlossaryPack } from './types';
import {
  CAMPAIGNS,
  LANGS,
  LIMITS,
  checkEnum,
  checkHeader,
  checkId,
  checkKeys,
  REVIEW_KEYS,
  checkLocalized,
  checkReviewable,
  checkStr,
  isObj,
  sink,
  uniqueIds,
} from './check';

export function validateGlossaryPack(data: unknown): ValidationResult<GlossaryPack> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['glossary pack must be an object'] };
  checkHeader(data, 'glossary', s);
  checkKeys(data, ['$schema', 'version', 'kind', 'id', 'campaign', 'terms'], '', s);
  checkEnum(data.campaign, 'campaign', s, [...CAMPAIGNS, 'shared']);
  if (!Array.isArray(data.terms) || data.terms.length === 0) s.add('terms', 'needs a term');
  else {
    uniqueIds(data.terms, 'terms', s);
    data.terms.forEach((t, i) => {
      const at = `terms[${i}]`;
      if (!isObj(t)) return void s.add(at, 'must be an object');
      checkKeys(
        t,
        ['id', 'term', 'language', 'definition', 'diacriticChecked', ...REVIEW_KEYS],
        at,
        s,
      );
      checkId(t.id, `${at}.id`, s);
      checkStr(t.term, `${at}.term`, s, 60);
      checkEnum(t.language, `${at}.language`, s, LANGS);
      checkLocalized(t.definition, `${at}.definition`, s, LIMITS.definition);
      if (typeof t.diacriticChecked !== 'boolean')
        s.add(`${at}.diacriticChecked`, 'must be a boolean');
      checkReviewable(t, at, s);
    });
  }
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as unknown as GlossaryPack };
}
