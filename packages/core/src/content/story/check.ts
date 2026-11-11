/** Small shared helpers for the story-content validators. Errors are plain `path: message` strings. */
import type { PackLang } from '../types';

export type Obj = Record<string, unknown>;
export const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
/** Feature flag keys are camelCase, e.g. `moremiPrologue`. */
export const FLAG_RE = /^[a-z][A-Za-z0-9]{0,39}$/;
export const LANGS: readonly string[] = ['en', 'pcm', 'yo', 'ig', 'ha'];
export const TAGS: readonly string[] = ['History', 'Legend', 'Story'];
export const CAMPAIGNS: readonly string[] = ['kiriji', 'ekumeku', 'moremi-prologue'];
export const MAX_ERRORS = 40;

/** Length caps the layouts are designed for (characters, per language). */
export const LIMITS = {
  fact: 140,
  line: 220,
  goal: 140,
  title: 60,
  objective: 120,
  definition: 160,
  why: 200,
  quote: 240,
  account: 220,
  note: 200,
  question: 140,
  option: 48,
  explanation: 200,
} as const;

/**
 * Length in Unicode code points. JSON Schema (2020-12) `maxLength` counts code points, not UTF-16
 * units, so the TypeScript validators count the same way (an astral character counts as 1).
 */
export const cpLen = (s: string): number => [...s].length;

/**
 * A `reviewedBy` that names a role still to do the review, not a person. With `reviewed: true` it
 * is rejected. The JSON Schemas carry the same words (case-expanded, see `placeholderPattern`).
 */
export const PLACEHOLDER_WORDS: readonly string[] = ['todo', 'tbd', 'pending', 'n/a', 'none'];
export const PLACEHOLDER_RE = /^\s*(?:todo|tbd|pending|n\/a|none)\b/i;
/** The same rule as a case-expanded ECMA-262 pattern for the JSON Schemas (no inline flags there). */
export const placeholderPattern = (): string =>
  `^\\s*(?:${PLACEHOLDER_WORDS.map((w) => [...w].map((c) => (/[a-z]/.test(c) ? `[${c}${c.toUpperCase()}]` : c)).join('')).join('|')})\\b`;

export const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export interface Sink {
  errors: string[];
  add(at: string, message: string): void;
}
export function sink(): Sink {
  const errors: string[] = [];
  return {
    errors,
    add(at, message) {
      if (errors.length < MAX_ERRORS) errors.push(`${at}: ${message}`);
    },
  };
}

/** Reject unknown keys: a typo such as `sourceRf` must not silently drop a field. */
export function checkKeys(o: Obj, keys: readonly string[], at: string, s: Sink): void {
  for (const k of Object.keys(o)) {
    if (!keys.includes(k)) s.add(at || k, `unknown field "${k}"`);
  }
}

export const checkId = (v: unknown, at: string, s: Sink): void => {
  if (typeof v !== 'string' || !ID_RE.test(v)) s.add(at, 'id must match [a-z0-9_-], max 64');
};
export const checkFlag = (v: unknown, at: string, s: Sink): void => {
  if (typeof v !== 'string' || !FLAG_RE.test(v)) s.add(at, 'must be a camelCase flag name');
};
export const checkStr = (v: unknown, at: string, s: Sink, max?: number): void => {
  if (!isStr(v)) s.add(at, 'must be a non-empty string');
  else if (max !== undefined && cpLen(v) > max) s.add(at, `is over ${max} characters`);
};
export const checkEnum = (v: unknown, at: string, s: Sink, values: readonly string[]): void => {
  if (typeof v !== 'string' || !values.includes(v))
    s.add(at, `must be one of ${values.join(', ')}`);
};
export const checkInt = (v: unknown, at: string, s: Sink, min: number, max: number): void => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) {
    s.add(at, `must be an integer ${min}-${max}`);
  }
};
export function checkIdList(v: unknown, at: string, s: Sink): void {
  if (!Array.isArray(v)) return void s.add(at, 'must be an array of ids');
  v.forEach((x, i) => checkId(x, `${at}[${i}]`, s));
  if (new Set(v).size !== v.length) s.add(at, 'has duplicate ids');
}

/** `{ en: required, pcm?, yo?, ig?, ha? }`, every present language within `max` characters. */
export function checkLocalized(v: unknown, at: string, s: Sink, max: number): void {
  if (!isObj(v)) return void s.add(at, 'must be an object with an "en" string');
  if (!isStr(v.en)) s.add(`${at}.en`, 'is required');
  for (const [k, val] of Object.entries(v)) {
    if (!LANGS.includes(k)) s.add(at, `unknown language "${k}"`);
    else checkStr(val, `${at}.${k}`, s, max);
  }
}

/** `source`, `reviewedBy`, `reviewed` on every learning item. */
export function checkReviewable(o: Obj, at: string, s: Sink): void {
  const p = (k: string): string => (at ? `${at}.${k}` : k);
  checkStr(o.source, p('source'), s);
  checkStr(o.reviewedBy, p('reviewedBy'), s);
  if (typeof o.reviewed !== 'boolean') s.add(p('reviewed'), 'must be a boolean');
  else if (o.reviewed && typeof o.reviewedBy === 'string' && PLACEHOLDER_RE.test(o.reviewedBy)) {
    s.add(
      p('reviewedBy'),
      'reviewed is true but reviewedBy is still a placeholder (TODO, TBD, pending, n/a, none)',
    );
  }
}

export function checkHistDate(v: unknown, at: string, s: Sink): number {
  if (!isObj(v)) {
    s.add(at, 'must be { year, month?, day? }');
    return 0;
  }
  checkInt(v.year, `${at}.year`, s, 1000, 1950);
  if (v.month !== undefined) checkInt(v.month, `${at}.month`, s, 1, 12);
  if (v.day !== undefined) {
    checkInt(v.day, `${at}.day`, s, 1, 31);
    if (v.month === undefined) s.add(`${at}.day`, 'needs a month');
  }
  checkKeys(v, ['year', 'month', 'day'], at, s);
  const n = (x: unknown): number => (typeof x === 'number' ? x : 0);
  return n(v.year) * 10000 + n(v.month) * 100 + n(v.day);
}

export function checkDateRange(v: unknown, at: string, s: Sink): void {
  if (!isObj(v)) return void s.add(at, 'must be { start, end?, circa?, sourcesDisagree? }');
  checkKeys(v, ['start', 'end', 'circa', 'sourcesDisagree'], at, s);
  const a = checkHistDate(v.start, `${at}.start`, s);
  if (v.end !== undefined && checkHistDate(v.end, `${at}.end`, s) < a) {
    s.add(`${at}.end`, 'is before start');
  }
  if (v.circa !== undefined && typeof v.circa !== 'boolean')
    s.add(`${at}.circa`, 'must be a boolean');
  if (v.sourcesDisagree !== undefined)
    checkStr(v.sourcesDisagree, `${at}.sourcesDisagree`, s, LIMITS.note);
}

export function checkHeader(o: Obj, kind: string, s: Sink): void {
  if (o.version !== 1) s.add('version', 'must be 1');
  if (o.kind !== kind) s.add('kind', `must be "${kind}"`);
  checkId(o.id, 'id', s);
}

/** Collect ids of an array of objects and report duplicates inside it. */
export function uniqueIds(items: unknown, at: string, s: Sink): void {
  if (!Array.isArray(items)) return;
  const seen = new Set<string>();
  items.forEach((it, i) => {
    const id = isObj(it) ? it.id : undefined;
    if (typeof id !== 'string') return;
    if (seen.has(id)) s.add(`${at}[${i}].id`, `"${id}" is duplicated`);
    seen.add(id);
  });
}

export const isPackLang = (v: unknown): v is PackLang => typeof v === 'string' && LANGS.includes(v);

export const REVIEW_KEYS = ['source', 'reviewedBy', 'reviewed'] as const;
