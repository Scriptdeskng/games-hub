import type { ValidationResult } from '../types';
import type { ChapterManifest, FeatureConfig } from './types';
import {
  CAMPAIGNS,
  LIMITS,
  TAGS,
  checkDateRange,
  checkEnum,
  checkFlag,
  checkHeader,
  checkId,
  checkIdList,
  checkInt,
  checkKeys,
  REVIEW_KEYS,
  checkLocalized,
  checkReviewable,
  isObj,
  sink,
  uniqueIds,
  type Sink,
} from './check';

export const HERO_MOMENTS = ['brawl', 'duel', 'aim', 'chase', 'rhythm', 'stealth', 'escape'];
export const OBJECTIVE_KINDS = [
  'escort',
  'defend',
  'hold',
  'raid',
  'stealth',
  'ambush',
  'relay',
  'protect',
  'choice',
  'cut',
  'survive',
];
/** Hard ceiling for one chapter pack (gzip). The size script enforces the same number. */
export const PACK_MAX_KB = 1024;
export const PACK_ID_RE = /^ch\d{2}$/;
const CHAPTER_KEYS = [
  '$schema',
  'version',
  'kind',
  'id',
  'campaign',
  'order',
  'title',
  'tag',
  'goals',
  'environment',
  'hero',
  'companions',
  'cast',
  'objectives',
  'heroMoment',
  'dates',
  'dependencies',
  'delivery',
  'pack',
  'packBudgetKb',
  'featureFlag',
  'content',
  ...REVIEW_KEYS,
];
const CONTENT_KEYS = ['scenes', 'facts', 'sources', 'twoSides', 'pins', 'checks'] as const;

function checkObjectives(v: unknown, s: Sink): void {
  if (!Array.isArray(v) || v.length === 0) return void s.add('objectives', 'needs at least one');
  uniqueIds(v, 'objectives', s);
  v.forEach((o, i) => {
    const at = `objectives[${i}]`;
    if (!isObj(o)) return void s.add(at, 'must be an object');
    checkKeys(o, ['id', 'kind', 'text', 'amount'], at, s);
    checkId(o.id, `${at}.id`, s);
    checkEnum(o.kind, `${at}.kind`, s, OBJECTIVE_KINDS);
    checkLocalized(o.text, `${at}.text`, s, LIMITS.objective);
    if (o.amount !== undefined) checkInt(o.amount, `${at}.amount`, s, 1, 3600);
  });
}

function checkDelivery(o: Record<string, unknown>, s: Sink): void {
  checkEnum(o.delivery, 'delivery', s, ['initial', 'pack']);
  if (o.delivery === 'pack') {
    if (typeof o.pack !== 'string' || !PACK_ID_RE.test(o.pack))
      s.add('pack', 'must look like ch02');
    checkInt(o.packBudgetKb, 'packBudgetKb', s, 1, PACK_MAX_KB);
  } else if (o.delivery === 'initial') {
    if (o.pack !== undefined) s.add('pack', 'is only for delivery "pack"');
    if (o.packBudgetKb !== undefined) s.add('packBudgetKb', 'is only for delivery "pack"');
  }
}

export function validateChapter(data: unknown): ValidationResult<ChapterManifest> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['chapter must be an object'] };
  checkHeader(data, 'chapter', s);
  checkKeys(data, CHAPTER_KEYS, '', s);
  checkEnum(data.campaign, 'campaign', s, CAMPAIGNS);
  checkInt(data.order, 'order', s, 0, 20);
  checkLocalized(data.title, 'title', s, LIMITS.title);
  checkEnum(data.tag, 'tag', s, TAGS);
  if (!Array.isArray(data.goals) || data.goals.length < 1 || data.goals.length > 4) {
    s.add('goals', 'needs 1 to 4 learning goals');
  } else {
    data.goals.forEach((g, i) => checkLocalized(g, `goals[${i}]`, s, LIMITS.goal));
  }
  checkId(data.environment, 'environment', s);
  checkId(data.hero, 'hero', s);
  checkIdList(data.companions, 'companions', s);
  if (data.cast !== undefined) checkIdList(data.cast, 'cast', s);
  checkObjectives(data.objectives, s);
  if (!isObj(data.heroMoment)) s.add('heroMoment', 'must be { type, text }');
  else {
    checkKeys(data.heroMoment, ['type', 'text'], 'heroMoment', s);
    checkEnum(data.heroMoment.type, 'heroMoment.type', s, HERO_MOMENTS);
    checkLocalized(data.heroMoment.text, 'heroMoment.text', s, LIMITS.objective);
  }
  checkDateRange(data.dates, 'dates', s);
  checkIdList(data.dependencies, 'dependencies', s);
  if (Array.isArray(data.dependencies) && data.dependencies.includes(data.id)) {
    s.add('dependencies', 'a chapter cannot depend on itself');
  }
  checkDelivery(data, s);
  if (data.featureFlag !== undefined) checkFlag(data.featureFlag, 'featureFlag', s);
  if (!isObj(data.content)) s.add('content', 'must list the chapter item ids');
  else {
    checkKeys(data.content, CONTENT_KEYS, 'content', s);
    for (const k of CONTENT_KEYS) checkIdList(data.content[k], `content.${k}`, s);
  }
  checkReviewable(data, '', s);
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as unknown as ChapterManifest };
}

/** `features.json`: `{ "version": 1, "features": { "moremiPrologue": false } }`. */
export function validateFeatureConfig(data: unknown): ValidationResult<FeatureConfig> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['features must be an object'] };
  if (data.version !== 1) s.add('version', 'must be 1');
  checkKeys(data, ['$schema', 'version', 'features'], '', s);
  if (!isObj(data.features)) s.add('features', 'must be an object of booleans');
  else {
    for (const [k, v] of Object.entries(data.features)) {
      checkFlag(k, `features.${k}`, s);
      if (typeof v !== 'boolean') s.add(`features.${k}`, 'must be a boolean');
    }
  }
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as unknown as FeatureConfig };
}
