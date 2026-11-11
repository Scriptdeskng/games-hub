import type { ValidationResult } from '../types';
import type { LearningPack } from './types';
import {
  CAMPAIGNS,
  LIMITS,
  TAGS,
  checkDateRange,
  checkEnum,
  checkHeader,
  checkId,
  checkInt,
  checkKeys,
  REVIEW_KEYS,
  checkLocalized,
  checkReviewable,
  checkStr,
  isObj,
  isStr,
  sink,
  uniqueIds,
  type Obj,
  type Sink,
} from './check';

const eachItem = (
  v: unknown,
  at: string,
  s: Sink,
  keys: readonly string[],
  fn: (o: Obj, at: string) => void,
): void => {
  if (!Array.isArray(v)) return void s.add(at, 'must be an array');
  uniqueIds(v, at, s);
  v.forEach((o, i) => {
    if (!isObj(o)) return void s.add(`${at}[${i}]`, 'must be an object');
    checkKeys(o, [...keys, 'id', ...REVIEW_KEYS], `${at}[${i}]`, s);
    checkId(o.id, `${at}[${i}].id`, s);
    checkReviewable(o, `${at}[${i}]`, s);
    fn(o, `${at}[${i}]`);
  });
};

function checkFact(o: Obj, at: string, s: Sink): void {
  checkId(o.trigger, `${at}.trigger`, s);
  checkLocalized(o.text, `${at}.text`, s, LIMITS.fact);
  checkEnum(o.tag, `${at}.tag`, s, TAGS);
  if (o.sourceRef !== undefined) checkId(o.sourceRef, `${at}.sourceRef`, s);
}

function checkSource(o: Obj, at: string, s: Sink): void {
  checkStr(o.title, `${at}.title`, s, 100);
  checkStr(o.author, `${at}.author`, s, 100);
  checkStr(o.when, `${at}.when`, s, 40);
  checkLocalized(o.why, `${at}.why`, s, LIMITS.why);
  checkStr(o.citation, `${at}.citation`, s, 300);
  if (o.quote !== undefined) checkStr(o.quote, `${at}.quote`, s, LIMITS.quote);
  checkEnum(o.tag, `${at}.tag`, s, TAGS);
  if (!isObj(o.codex)) return void s.add(`${at}.codex`, 'must be { shelf, slot }');
  checkKeys(o.codex, ['shelf', 'slot'], `${at}.codex`, s);
  checkEnum(o.codex.shelf, `${at}.codex.shelf`, s, [
    'documents',
    'books',
    'objects',
    'oral-history',
  ]);
  checkInt(o.codex.slot, `${at}.codex.slot`, s, 0, 99);
}

function checkTwoSides(o: Obj, at: string, s: Sink): void {
  checkLocalized(o.event, `${at}.event`, s, 80);
  checkEnum(o.tag, `${at}.tag`, s, TAGS);
  const sides = o.sides;
  if (!Array.isArray(sides) || sides.length < 2 || sides.length > 3) {
    return void s.add(`${at}.sides`, 'needs 2 or 3 sides');
  }
  uniqueIds(sides, `${at}.sides`, s);
  sides.forEach((sd, i) => {
    const p = `${at}.sides[${i}]`;
    if (!isObj(sd)) return void s.add(p, 'must be an object');
    checkKeys(sd, ['id', 'label', 'account', 'basis'], p, s);
    checkId(sd.id, `${p}.id`, s);
    checkStr(sd.label, `${p}.label`, s, 60);
    checkLocalized(sd.account, `${p}.account`, s, LIMITS.account);
    checkEnum(sd.basis, `${p}.basis`, s, ['oral', 'written', 'official-report', 'tradition']);
  });
}

function checkPin(o: Obj, at: string, s: Sink): void {
  checkEnum(o.kind, `${at}.kind`, s, ['timeline', 'map', 'both']);
  checkLocalized(o.label, `${at}.label`, s, 60);
  checkDateRange(o.date, `${at}.date`, s);
  checkEnum(o.tag, `${at}.tag`, s, TAGS);
  const needsPlace = o.kind === 'map' || o.kind === 'both';
  if (o.place === undefined) {
    if (needsPlace) s.add(`${at}.place`, 'is required for map pins');
    return;
  }
  const p = o.place;
  if (!isObj(p)) return void s.add(`${at}.place`, 'must be { name, x, y }');
  checkKeys(p, ['name', 'x', 'y'], `${at}.place`, s);
  checkStr(p.name, `${at}.place.name`, s, 60);
  for (const k of ['x', 'y'] as const) {
    const v = p[k];
    if (typeof v !== 'number' || v < 0 || v > 1) s.add(`${at}.place.${k}`, 'must be a number 0..1');
  }
}

function checkCheck(o: Obj, at: string, s: Sink): void {
  checkStr(o.category, `${at}.category`, s);
  checkEnum(o.difficulty, `${at}.difficulty`, s, ['easy', 'medium', 'hard']);
  checkStr(o.q, `${at}.q`, s, LIMITS.question);
  const opts = o.options;
  if (!Array.isArray(opts) || opts.length !== 4 || !opts.every(isStr)) {
    s.add(`${at}.options`, 'must be 4 non-empty strings');
  } else {
    if (new Set(opts.map((x: string) => x.trim().toLowerCase())).size !== 4) {
      s.add(`${at}.options`, 'must be distinct');
    }
    opts.forEach((x: string, i) => checkStr(x, `${at}.options[${i}]`, s, LIMITS.option));
  }
  checkInt(o.answer, `${at}.answer`, s, 0, 3);
  checkStr(o.explanation, `${at}.explanation`, s, LIMITS.explanation);
}

export function validateLearningPack(data: unknown): ValidationResult<LearningPack> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['learning pack must be an object'] };
  checkHeader(data, 'learning', s);
  checkKeys(
    data,
    [
      '$schema',
      'version',
      'kind',
      'id',
      'campaign',
      'chapter',
      'facts',
      'sources',
      'twoSides',
      'pins',
      'checks',
    ],
    '',
    s,
  );
  checkEnum(data.campaign, 'campaign', s, CAMPAIGNS);
  checkId(data.chapter, 'chapter', s);
  eachItem(data.facts, 'facts', s, ['trigger', 'text', 'tag', 'sourceRef'], (o, at) =>
    checkFact(o, at, s),
  );
  eachItem(
    data.sources,
    'sources',
    s,
    ['title', 'author', 'when', 'why', 'citation', 'quote', 'codex', 'tag'],
    (o, at) => checkSource(o, at, s),
  );
  eachItem(data.twoSides, 'twoSides', s, ['event', 'sides', 'tag'], (o, at) =>
    checkTwoSides(o, at, s),
  );
  eachItem(data.pins, 'pins', s, ['kind', 'label', 'date', 'place', 'tag'], (o, at) =>
    checkPin(o, at, s),
  );
  eachItem(
    data.checks,
    'checks',
    s,
    ['category', 'difficulty', 'q', 'options', 'answer', 'explanation', 'tags'],
    (o, at) => checkCheck(o, at, s),
  );
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as unknown as LearningPack };
}
