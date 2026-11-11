import type { ValidationResult } from '../types';
import type { DialoguePack } from './types';
import {
  CAMPAIGNS,
  LIMITS,
  TAGS,
  checkEnum,
  checkHeader,
  checkId,
  checkIdList,
  checkKeys,
  checkLocalized,
  isObj,
  isPackLang,
  sink,
  uniqueIds,
  type Obj,
  type Sink,
} from './check';

const NATIVE_LANGS = ['yo', 'ig', 'ha'];

function checkLine(l: unknown, at: string, s: Sink): void {
  if (!isObj(l)) return void s.add(at, 'must be an object');
  checkKeys(
    l,
    [
      'id',
      'speaker',
      'text',
      'langs',
      'glossary',
      'native_review',
      'pcm_review',
      'fictional',
      'tag',
    ],
    at,
    s,
  );
  checkId(l.id, `${at}.id`, s);
  checkId(l.speaker, `${at}.speaker`, s);
  checkLocalized(l.text, `${at}.text`, s, LIMITS.line);
  const langs = l.langs;
  const listed = Array.isArray(langs) ? langs : [];
  if (!Array.isArray(langs) || langs.length === 0 || !langs.every(isPackLang)) {
    s.add(`${at}.langs`, 'must list the languages in the line, e.g. ["en"]');
  }
  // The text keys are the truth: a line with yo/ig/ha text is native_review-checked even when
  // `langs` says ["en"], and a line with Pidgin needs a pcm_review flag.
  const present = new Set<unknown>([...listed, ...(isObj(l.text) ? Object.keys(l.text) : [])]);
  if (NATIVE_LANGS.some((x) => present.has(x)) && typeof l.native_review !== 'boolean') {
    s.add(`${at}.native_review`, 'is required (true or false) when the line has yo, ig or ha text');
  }
  if (present.has('pcm') && typeof l.pcm_review !== 'boolean') {
    s.add(`${at}.pcm_review`, 'is required (true or false) when the line has Pidgin (pcm) text');
  }
  if (l.pcm_review !== undefined && typeof l.pcm_review !== 'boolean') {
    s.add(`${at}.pcm_review`, 'must be a boolean');
  }
  if (l.native_review !== undefined && typeof l.native_review !== 'boolean') {
    s.add(`${at}.native_review`, 'must be a boolean');
  }
  if (l.glossary !== undefined) checkIdList(l.glossary, `${at}.glossary`, s);
  if (l.fictional !== undefined && typeof l.fictional !== 'boolean') {
    s.add(`${at}.fictional`, 'must be a boolean');
  }
  if (l.tag !== undefined) checkEnum(l.tag, `${at}.tag`, s, TAGS);
}

function checkScene(sc: unknown, at: string, s: Sink): void {
  if (!isObj(sc)) return void s.add(at, 'must be an object');
  checkKeys(sc, ['id', 'tag', 'lines'], at, s);
  checkId(sc.id, `${at}.id`, s);
  checkEnum(sc.tag, `${at}.tag`, s, TAGS);
  if (!Array.isArray(sc.lines) || sc.lines.length === 0)
    return void s.add(`${at}.lines`, 'needs a line');
  uniqueIds(sc.lines, `${at}.lines`, s);
  sc.lines.forEach((l, i) => checkLine(l, `${at}.lines[${i}]`, s));
}

export function validateDialoguePack(data: unknown): ValidationResult<DialoguePack> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['dialogue pack must be an object'] };
  const o: Obj = data;
  checkHeader(o, 'dialogue', s);
  checkKeys(o, ['$schema', 'version', 'kind', 'id', 'campaign', 'chapter', 'scenes'], '', s);
  checkEnum(o.campaign, 'campaign', s, CAMPAIGNS);
  checkId(o.chapter, 'chapter', s);
  if (!Array.isArray(o.scenes) || o.scenes.length === 0) s.add('scenes', 'needs a scene');
  else {
    uniqueIds(o.scenes, 'scenes', s);
    o.scenes.forEach((sc, i) => checkScene(sc, `scenes[${i}]`, s));
  }
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as unknown as DialoguePack };
}
