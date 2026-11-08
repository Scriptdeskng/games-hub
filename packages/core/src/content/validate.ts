import type { QuizPack, QuizQuestion, ValidationResult, WordEntry, WordPack } from './types';

export const PACK_VERSION = 1;
const LANGS: readonly string[] = ['en', 'pcm', 'yo', 'ig', 'ha'];
const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const WORD_RE = /^[\p{L}\p{M}]{2,20}$/u;
const MAX_ERRORS = 25;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function finish<T>(errors: string[], value: unknown): ValidationResult<T> {
  return errors.length ? { ok: false, errors } : { ok: true, value: value as T };
}

function checkHeader(o: Obj, errors: string[]): void {
  if (o.version !== PACK_VERSION) errors.push(`version must be ${PACK_VERSION}`);
  if (typeof o.id !== 'string' || !ID_RE.test(o.id)) errors.push('id must match [a-z0-9_-]');
  if (!isStr(o.title)) errors.push('title must be a non-empty string');
  if (typeof o.lang !== 'string' || !LANGS.includes(o.lang)) {
    errors.push(`lang must be one of ${LANGS.join(', ')}`);
  }
}

function checkTags(o: Obj, at: string, errors: string[]): void {
  if (o.tags === undefined) return;
  if (!Array.isArray(o.tags) || !o.tags.every(isStr)) {
    errors.push(`${at}.tags must be an array of non-empty strings`);
  }
}

function checkQuestion(q: unknown, at: string, errors: string[]): void {
  if (!isObj(q)) return void errors.push(`${at} must be an object`);
  if (typeof q.id !== 'string' || !ID_RE.test(q.id)) errors.push(`${at}.id invalid`);
  if (!isStr(q.category)) errors.push(`${at}.category must be a non-empty string`);
  if (typeof q.difficulty !== 'string' || !DIFFICULTIES.includes(q.difficulty)) {
    errors.push(`${at}.difficulty must be easy, medium or hard`);
  }
  if (!isStr(q.q)) errors.push(`${at}.q must be a non-empty string`);
  const opts = q.options;
  if (!Array.isArray(opts) || opts.length !== 4 || !opts.every(isStr)) {
    errors.push(`${at}.options must be 4 non-empty strings`);
  } else if (new Set(opts.map((s: string) => s.trim().toLowerCase())).size !== 4) {
    errors.push(`${at}.options must be distinct`);
  }
  if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) > 3) {
    errors.push(`${at}.answer must be an integer 0-3`);
  }
  if (!isStr(q.source)) errors.push(`${at}.source must be a non-empty string`);
  if (typeof q.reviewed !== 'boolean') errors.push(`${at}.reviewed must be a boolean`);
  checkTags(q, at, errors);
}

export function validateQuizPack(data: unknown): ValidationResult<QuizPack> {
  const errors: string[] = [];
  if (!isObj(data)) return { ok: false, errors: ['pack must be an object'] };
  checkHeader(data, errors);
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('questions must be a non-empty array');
  } else {
    const ids = new Set<string>();
    data.questions.forEach((q: unknown, i: number) => {
      if (errors.length >= MAX_ERRORS) return;
      checkQuestion(q, `questions[${i}]`, errors);
      const id = isObj(q) ? q.id : undefined;
      if (typeof id === 'string') {
        if (ids.has(id)) errors.push(`questions[${i}].id "${id}" is duplicated`);
        ids.add(id);
      }
    });
  }
  return finish<QuizPack>(errors, data);
}

function checkWord(w: unknown, at: string, errors: string[]): void {
  if (!isObj(w)) return void errors.push(`${at} must be an object`);
  if (typeof w.word !== 'string' || !WORD_RE.test(w.word)) {
    errors.push(`${at}.word must be 2-20 letters, no spaces`);
  }
  if (w.hint !== undefined && !isStr(w.hint)) errors.push(`${at}.hint must be a non-empty string`);
  if (w.reviewed !== undefined && typeof w.reviewed !== 'boolean') {
    errors.push(`${at}.reviewed must be a boolean`);
  }
  checkTags(w, at, errors);
}

export function validateWordPack(data: unknown): ValidationResult<WordPack> {
  const errors: string[] = [];
  if (!isObj(data)) return { ok: false, errors: ['pack must be an object'] };
  checkHeader(data, errors);
  if (typeof data.theme !== 'string' || !ID_RE.test(data.theme)) {
    errors.push('theme must match [a-z0-9_-]');
  }
  let blocked = new Set<string>();
  if (data.blocklist !== undefined) {
    const b = data.blocklist;
    if (!Array.isArray(b) || !b.every((x) => typeof x === 'string' && WORD_RE.test(x))) {
      errors.push('blocklist must be an array of words');
    } else {
      blocked = new Set(b.map((x: string) => x.toLowerCase()));
    }
  }
  if (!Array.isArray(data.words) || data.words.length === 0) {
    errors.push('words must be a non-empty array');
  } else {
    const seen = new Set<string>();
    data.words.forEach((w: unknown, i: number) => {
      if (errors.length >= MAX_ERRORS) return;
      checkWord(w, `words[${i}]`, errors);
      const word = isObj(w) && typeof w.word === 'string' ? w.word.toLowerCase() : null;
      if (word === null) return;
      if (seen.has(word)) errors.push(`words[${i}].word "${word}" is duplicated`);
      if (blocked.has(word)) errors.push(`words[${i}].word "${word}" is on the blocklist`);
      seen.add(word);
    });
  }
  return finish<WordPack>(errors, data);
}

/** Number of items a human has not signed off (quiz `reviewed:false`, word `reviewed:false`). */
export function countUnreviewed(pack: QuizPack | WordPack): number {
  const items: Array<QuizQuestion | WordEntry> = 'questions' in pack ? pack.questions : pack.words;
  return items.filter((x) => x.reviewed === false).length;
}
