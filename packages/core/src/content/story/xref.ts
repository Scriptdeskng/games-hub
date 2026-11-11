/**
 * Whole-campaign checks that a single document cannot do: duplicate ids, cross-references,
 * chapter wiring, feature flags, glossary use, diacritics and the guardrail text lint.
 * Pure: give it parsed, individually valid documents; get back findings (errors fail the check).
 */
import { checkDiacritics, foldDiacritics, isNfc } from './diacritics';
import { DEFAULT_GUARDRAILS, lintTexts, type GuardrailConfig } from './guardrails';
import { collectTexts } from './texts';
import type {
  CampaignBundle,
  ChapterManifest,
  FeatureConfig,
  Finding,
  GlossaryTerm,
  Severity,
} from './types';

export interface LintOptions {
  features?: FeatureConfig;
  guardrails?: GuardrailConfig;
}

type Add = (severity: Severity, rule: string, at: string, message: string) => void;
const SPEAKERS = ['narrator', 'guide'];
export const MOREMI_PROLOGUE_FLAG = 'moremiPrologue';
/** A Legend chapter dated before this year is the Moremi era (c. 12th century), whatever its campaign says. */
const MOREMI_ERA_BEFORE = 1200;

/** Does this chapter look like the Moremi prologue, whatever `campaign` says? */
export function looksLikeMoremi(c: ChapterManifest): boolean {
  return (
    c.campaign === 'moremi-prologue' ||
    c.id.startsWith('ch00') ||
    c.pack === 'ch00' ||
    (c.tag === 'Legend' && c.dates.start.year < MOREMI_ERA_BEFORE)
  );
}

function checkDuplicateIds(b: CampaignBundle, add: Add): void {
  interface Entry {
    id: string;
    at: string;
    campaign: string;
  }
  const all: Entry[] = [];
  const push = (id: string, at: string, campaign: string): number => all.push({ id, at, campaign });
  for (const c of b.chapters) push(c.id, c.id, c.campaign);
  for (const d of b.dialogue) {
    push(d.id, d.id, d.campaign);
    for (const sc of d.scenes) {
      push(sc.id, `${d.id}.${sc.id}`, d.campaign);
      for (const l of sc.lines) push(l.id, `${d.id}.${sc.id}.${l.id}`, d.campaign);
    }
  }
  for (const p of b.learning) {
    push(p.id, p.id, p.campaign);
    for (const k of ['facts', 'sources', 'twoSides', 'pins', 'checks'] as const) {
      for (const it of p[k]) push(it.id, `${p.id}.${k}.${it.id}`, p.campaign);
    }
  }
  for (const g of b.glossary) {
    push(g.id, g.id, g.campaign);
    for (const t of g.terms) push(t.id, `${g.id}.${t.id}`, g.campaign);
  }
  const campaigns = new Set(all.map((e) => e.campaign).filter((c) => c !== 'shared'));
  const reported = new Set<string>();
  for (const camp of campaigns.size ? campaigns : new Set(['shared'])) {
    const seen = new Map<string, string>();
    for (const e of all.filter((x) => x.campaign === camp || x.campaign === 'shared')) {
      const first = seen.get(e.id);
      if (first !== undefined && !reported.has(`${e.id}|${e.at}`)) {
        reported.add(`${e.id}|${e.at}`);
        add('error', 'xref/duplicate-id', e.at, `id "${e.id}" already used at ${first}`);
      }
      if (first === undefined) seen.set(e.id, e.at);
    }
  }
}

function hasCycle(c: ChapterManifest, byId: Map<string, ChapterManifest>): boolean {
  const walk = (id: string, path: Set<string>): boolean => {
    if (path.has(id)) return true;
    const n = byId.get(id);
    if (!n) return false;
    const next = new Set(path).add(id);
    return n.dependencies.some((d) => walk(d, next));
  };
  return walk(c.id, new Set());
}

function checkChapters(b: CampaignBundle, add: Add, features?: FeatureConfig): void {
  const byId = new Map(b.chapters.map((c) => [c.id, c]));
  const seenIds = new Set<string>();
  for (const c of b.chapters) {
    if (seenIds.has(c.id))
      add(
        'error',
        'xref/duplicate-id',
        c.id,
        `chapter id "${c.id}" is used by more than one chapter`,
      );
    seenIds.add(c.id);
  }
  const orders = new Map<string, string>();
  const packs = new Map<string, string>();
  for (const c of b.chapters) {
    const ok = `${c.campaign}#${c.order}`;
    if (orders.has(ok))
      add('error', 'xref/order', c.id, `order ${c.order} also used by ${orders.get(ok)}`);
    orders.set(ok, c.id);
    if (c.pack !== undefined) {
      if (packs.has(c.pack))
        add('error', 'xref/pack-id', c.id, `pack ${c.pack} also used by ${packs.get(c.pack)}`);
      packs.set(c.pack, c.id);
    }
    for (const d of c.dependencies) {
      const dep = byId.get(d);
      if (!dep) add('error', 'xref/dependency', c.id, `depends on unknown chapter "${d}"`);
      else if (dep.campaign !== c.campaign)
        add('error', 'xref/dependency', c.id, `"${d}" is in another campaign`);
    }
    if (hasCycle(c, byId)) add('error', 'xref/dependency-cycle', c.id, 'dependencies form a cycle');
    if (looksLikeMoremi(c) && c.featureFlag !== MOREMI_PROLOGUE_FLAG) {
      add(
        'error',
        'xref/feature-flag',
        c.id,
        `the Moremi prologue (campaign moremi-prologue, id ch00*, or an early Legend) must set featureFlag "${MOREMI_PROLOGUE_FLAG}"`,
      );
    }
    if (c.featureFlag && features && !(c.featureFlag in features.features)) {
      add(
        'error',
        'xref/feature-flag',
        c.id,
        `featureFlag "${c.featureFlag}" is not declared in features.json`,
      );
    }
  }
  if (b.chapters.filter((c) => c.delivery === 'initial').length > 1) {
    add(
      'warning',
      'xref/initial-chapters',
      'chapters',
      'more than one chapter ships in the 3 MB first download',
    );
  }
}

function itemIds(b: CampaignBundle, chapter: string): Record<string, Set<string>> {
  const d = b.dialogue.filter((x) => x.chapter === chapter);
  const l = b.learning.filter((x) => x.chapter === chapter);
  const ids = <T extends { id: string }>(xs: T[]): Set<string> => new Set(xs.map((x) => x.id));
  return {
    scenes: ids(d.flatMap((x) => x.scenes)),
    facts: ids(l.flatMap((x) => x.facts)),
    sources: ids(l.flatMap((x) => x.sources)),
    twoSides: ids(l.flatMap((x) => x.twoSides)),
    pins: ids(l.flatMap((x) => x.pins)),
    checks: ids(l.flatMap((x) => x.checks)),
  };
}

function checkChapterItems(b: CampaignBundle, add: Add): void {
  const chapterIds = new Set(b.chapters.map((c) => c.id));
  for (const p of [...b.dialogue, ...b.learning]) {
    if (!chapterIds.has(p.chapter))
      add('error', 'xref/chapter', p.id, `refers to unknown chapter "${p.chapter}"`);
  }
  for (const kind of ['dialogue', 'learning'] as const) {
    const seen = new Set<string>();
    for (const p of b[kind]) {
      if (seen.has(p.chapter))
        add('error', 'xref/chapter', p.id, `second ${kind} pack for chapter "${p.chapter}"`);
      seen.add(p.chapter);
    }
  }
  for (const c of b.chapters) {
    const have = itemIds(b, c.id);
    for (const [k, listed] of Object.entries(c.content)) {
      for (const id of listed) {
        if (!have[k]?.has(id))
          add(
            'error',
            'xref/chapter-item',
            `${c.id}.content.${k}`,
            `lists "${id}" but no ${k} item has that id in this chapter`,
          );
      }
      for (const id of have[k] ?? []) {
        if (!listed.includes(id))
          add(
            'warning',
            'xref/orphan-item',
            `${c.id}.content.${k}`,
            `"${id}" exists but the chapter does not list it`,
          );
      }
    }
    const learn = b.learning.find((x) => x.chapter === c.id);
    if (learn && learn.checks.length !== 3)
      add(
        'warning',
        'chapter/checks',
        c.id,
        `has ${learn.checks.length} knowledge-check items (target 3)`,
      );
    if (learn && learn.facts.length < 2)
      add(
        'warning',
        'chapter/facts',
        c.id,
        `has ${learn.facts.length} did-you-know cards (target 2-3)`,
      );
    if (learn && learn.sources.length < 1)
      add('warning', 'chapter/sources', c.id, 'has no source card');
  }
}

function checkDialogue(b: CampaignBundle, add: Add, real: ReadonlySet<string>): void {
  for (const d of b.dialogue) {
    const ch = b.chapters.find((c) => c.id === d.chapter);
    const known = new Map<string, GlossaryTerm>();
    for (const g of b.glossary) {
      if (g.campaign === d.campaign || g.campaign === 'shared')
        g.terms.forEach((t) => known.set(t.id, t));
    }
    const allowed = new Set([
      ...SPEAKERS,
      ...(ch ? [ch.hero, ...ch.companions, ...(ch.cast ?? [])] : []),
    ]);
    for (const sc of d.scenes) {
      for (const [i, l] of sc.lines.entries()) {
        const at = `${d.id}.${sc.id}.lines[${i}]`;
        if (ch && !allowed.has(l.speaker))
          add(
            'error',
            'xref/speaker',
            at,
            `speaker "${l.speaker}" is not the hero, a companion or in the chapter cast`,
          );
        if (real.has(l.speaker) && l.fictional !== true)
          add(
            'error',
            'cameo/fictional',
            at,
            `real person "${l.speaker}" needs fictional: true (the words are invented)`,
          );
        for (const g of l.glossary ?? []) {
          if (!known.has(g)) add('error', 'xref/glossary', at, `unknown glossary term "${g}"`);
        }
        const text = foldDiacritics(l.text.en);
        for (const t of known.values()) {
          const f = foldDiacritics(t.term);
          if (f.length < 4 || (l.glossary ?? []).includes(t.id)) continue;
          if (
            new RegExp(
              `(^|[^\\p{L}])${f.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}($|[^\\p{L}])`,
              'u',
            ).test(text)
          ) {
            add(
              'warning',
              'glossary/untagged',
              at,
              `says "${t.term}" but does not list glossary id "${t.id}"`,
            );
          }
        }
      }
    }
  }
}

function checkFacts(b: CampaignBundle, add: Add): void {
  for (const p of b.learning) {
    const sources = new Set(p.sources.map((s) => s.id));
    for (const f of p.facts) {
      const at = `${p.id}.facts.${f.id}`;
      if (f.sourceRef === undefined)
        add('warning', 'xref/fact-source', at, 'has no sourceRef to a source card');
      else if (!sources.has(f.sourceRef))
        add(
          'error',
          'xref/fact-source',
          at,
          `sourceRef "${f.sourceRef}" is not a source card of this chapter`,
        );
    }
  }
}

function checkGlossary(b: CampaignBundle, add: Add): void {
  for (const g of b.glossary) {
    for (const t of g.terms) {
      const issues = checkDiacritics(t.term, t.language);
      for (const i of issues) {
        // not-nfc is an error for every string (checkNfc), so it is not repeated here.
        if (i.code === 'not-nfc' || t.diacriticChecked) continue;
        add('warning', `diacritics/${i.code}`, `${g.id}.${t.id}`, `"${t.term}" ${i.message}`);
      }
    }
  }
}

/** Every player-visible string must be NFC, or the same word compares and renders two ways. */
function checkNfc(b: CampaignBundle, add: Add): void {
  for (const { at, text } of collectTexts(b)) {
    if (!isNfc(text)) add('error', 'text/not-nfc', at, 'is not Unicode NFC normalised');
  }
}

/** Run every check. Errors fail `content:check`; warnings are advice. */
export function lintBundle(b: CampaignBundle, o: LintOptions = {}): Finding[] {
  const out: Finding[] = [];
  const add: Add = (severity, rule, at, message) => void out.push({ severity, rule, at, message });
  const cfg = o.guardrails ?? DEFAULT_GUARDRAILS;
  checkDuplicateIds(b, add);
  checkChapters(b, add, o.features);
  checkChapterItems(b, add);
  checkDialogue(b, add, new Set(cfg.realPeople));
  checkFacts(b, add);
  checkGlossary(b, add);
  checkNfc(b, add);
  out.push(...lintTexts(collectTexts(b), cfg));
  return out;
}

export const errorsOf = (f: readonly Finding[]): Finding[] =>
  f.filter((x) => x.severity === 'error');
export const formatFinding = (f: Finding): string =>
  `${f.severity.toUpperCase()} [${f.rule}] ${f.at}: ${f.message}`;
