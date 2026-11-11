import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { kirijiOneBundle } from '../packages/core/src/content/story/fixtures';
import { validateChapter } from '../packages/core/src/content/story/chapter';
import { validateDialoguePack } from '../packages/core/src/content/story/dialogue';
import { validateGlossaryPack } from '../packages/core/src/content/story/glossary';
import { validateLearningPack } from '../packages/core/src/content/story/learning';
import { PLACEHOLDER_WORDS, placeholderPattern } from '../packages/core/src/content/story/check';
import { validateSchema } from './json-schema-lite';

/**
 * The JSON Schema files and the TypeScript validators must give the same verdict on every
 * mutation, except the ones marked 'ts-only': rules JSON Schema cannot express (uniqueness inside
 * an array, case-insensitive distinctness, comparing two fields). For those the TypeScript
 * validator is authoritative and the test only requires that it rejects.
 */
/**
 * A fixture document being mutated by a test: deliberately untyped, because the mutations break
 * the documents on purpose (delete a field, put a string where an array belongs).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally untyped fixture mutation
type Doc = Record<string, any>;
type Mut = (d: Doc) => void;
/** reject: both reject. accept: both accept. ts-only: TypeScript rejects, the schema cannot. */
type Verdict = 'reject' | 'accept' | 'ts-only';
const dir = path.resolve(process.cwd(), 'packages/core/content/schemas');
const schema = (n: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(dir, `${n}.schema.json`), 'utf8')) as Record<
    string,
    unknown
  >;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

interface Kind {
  name: string;
  base: Doc;
  validate: (d: unknown) => { ok: boolean };
  muts: Array<[string, Mut, Verdict?]>;
}
const reviewedBy = (who: string): Doc => ({ reviewed: true, reviewedBy: who });
const reviewedTodo = reviewedBy;
/** Every placeholder word, in odd casing and with trailing text, is rejected on a reviewed item. */
const placeholderMuts = (label: string, apply: (d: Doc, v: Doc) => void): Array<[string, Mut]> =>
  ['TBD', 'tbd', 'Pending', 'PENDING review', 'n/a', 'N/A', 'None', 'none yet', '  todo'].map(
    (who) => [`${label} reviewed with placeholder "${who}"`, (d) => apply(d, reviewedBy(who))],
  );
const b = kirijiOneBundle();
const kinds: Kind[] = [
  {
    name: 'chapter-manifest',
    base: b.chapters[0] as unknown as Doc,
    validate: validateChapter,
    muts: [
      ['version', (d) => (d.version = 2)],
      ['kind', (d) => (d.kind = 'x')],
      ['id', (d) => (d.id = 'Bad Id')],
      ['campaign', (d) => (d.campaign = 'yoruba')],
      ['order', (d) => (d.order = -1)],
      ['title', (d) => (d.title = { pcm: 'x' })],
      ['title long', (d) => (d.title = { en: 'x'.repeat(61) })],
      ['tag', (d) => (d.tag = 'Fiction')],
      ['goals none', (d) => (d.goals = [])],
      ['goals many', (d) => (d.goals = [1, 2, 3, 4, 5].map((n) => ({ en: `g${n}` })))],
      ['objectives none', (d) => (d.objectives = [])],
      ['objective kind', (d) => (d.objectives[0].kind = 'win')],
      ['hero moment', (d) => (d.heroMoment.type = 'fight')],
      ['dates year', (d) => (d.dates.start = { year: 99 })],
      ['dates month', (d) => (d.dates.start = { year: 1886, month: 13 })],
      ['delivery', (d) => (d.delivery = 'cdn')],
      ['initial with pack', (d) => (d.pack = 'ch02')],
      ['pack needs fields', (d) => (d.delivery = 'pack')],
      [
        'pack budget too big',
        (d) => Object.assign(d, { delivery: 'pack', pack: 'ch02', packBudgetKb: 2000 }),
      ],
      ['pack id', (d) => Object.assign(d, { delivery: 'pack', pack: 'two', packBudgetKb: 10 })],
      ['flag', (d) => (d.featureFlag = 'Bad Flag')],
      ['content missing', (d) => delete d.content.pins],
      ['reviewed', (d) => (d.reviewed = 'no')],
      ['source missing', (d) => delete d.source],
      ['unknown field', (d) => (d.extra = 1)],
      [
        'chapter reviewed with TODO reviewer',
        (d) => Object.assign(d, reviewedTodo('TODO historian')),
      ],
      ...placeholderMuts('chapter', (d, v) => Object.assign(d, v)),
      [
        'chapter reviewed with a real reviewer',
        (d) => Object.assign(d, reviewedBy('Dr A. Okafor')),
        'accept',
      ],
      [
        'chapter unreviewed with TODO',
        (d) => Object.assign(d, { reviewed: false, reviewedBy: 'TODO historian' }),
        'accept',
      ],
      [
        'reviewer only looks like a placeholder',
        (d) => Object.assign(d, reviewedBy('Todorov Adeyemi')),
        'accept',
      ],
      ['reviewer blank', (d) => (d.reviewedBy = '   ')],
      ['chapter day without month', (d) => (d.dates.start = { year: 1886, day: 23 })],
      ['chapter end day without month', (d) => (d.dates.end = { year: 1893, day: 1 })],
      ['chapter month without day', (d) => (d.dates.start = { year: 1886, month: 9 }), 'accept'],
      ['chapter dates end before start', (d) => (d.dates.end = { year: 1800 }), 'ts-only'],
      ['chapter dates end equals start', (d) => (d.dates.end = { year: 1877 }), 'accept'],
      ['chapter depends on itself', (d) => (d.dependencies = [d.id]), 'ts-only'],
      ['chapter duplicate dependency', (d) => (d.dependencies = ['a', 'a'])],
      [
        'title 60 emoji (60 code points, 120 UTF-16 units)',
        (d) => (d.title = { en: '😀'.repeat(60) }),
        'accept',
      ],
      ['title 61 emoji', (d) => (d.title = { en: '😀'.repeat(61) })],
      ['title blank', (d) => (d.title = { en: '  ' })],
      [
        'pack budget 1024',
        (d) => Object.assign(d, { delivery: 'pack', pack: 'ch02', packBudgetKb: 1024 }),
        'accept',
      ],
      [
        'moremi-era chapter without flag (xref rule, not structure)',
        (d) => Object.assign(d, { id: 'ch00-moremi', tag: 'Legend' }),
        'accept',
      ],
    ],
  },
  {
    name: 'dialogue-pack',
    base: b.dialogue[0] as unknown as Doc,
    validate: validateDialoguePack,
    muts: [
      ['kind', (d) => (d.kind = 'learning')],
      ['no scenes', (d) => (d.scenes = [])],
      ['scene tag', (d) => (d.scenes[0].tag = 'Fiction')],
      ['no lines', (d) => (d.scenes[0].lines = [])],
      ['speaker', (d) => (d.scenes[0].lines[0].speaker = '')],
      ['text long', (d) => (d.scenes[0].lines[0].text = { en: 'x'.repeat(221) })],
      ['langs empty', (d) => (d.scenes[0].lines[0].langs = [])],
      ['langs bad', (d) => (d.scenes[0].lines[0].langs = ['fr'])],
      ['native_review needed (ig)', (d) => (d.scenes[0].lines[0].langs = ['en', 'ig'])],
      ['native_review needed (yo)', (d) => delete d.scenes[1].lines[2].native_review],
      ['native_review type', (d) => (d.scenes[0].lines[0].native_review = 'x')],
      ['unknown field', (d) => (d.scenes[0].lines[0].mood = 'x')],
      ['yo text but langs says en', (d) => (d.scenes[0].lines[0].text.yo = 'Ẹ káàbọ̀')],
      ['ig text but langs says en', (d) => (d.scenes[0].lines[0].text.ig = 'Nnọọ')],
      ['ha text but langs says en', (d) => (d.scenes[0].lines[0].text.ha = 'Sannu')],
      [
        'yo text with native_review false',
        (d) =>
          Object.assign(d.scenes[0].lines[0], {
            text: { en: 'x', yo: 'Ẹ káàbọ̀' },
            native_review: false,
          }),
        'accept',
      ],
      ['pcm text without pcm_review', (d) => delete d.scenes[1].lines[2].pcm_review],
      ['pcm in langs without pcm_review', (d) => (d.scenes[0].lines[0].langs = ['en', 'pcm'])],
      ['pcm_review type', (d) => (d.scenes[1].lines[2].pcm_review = 'yes')],
      ['pcm_review false', (d) => (d.scenes[1].lines[2].pcm_review = false), 'accept'],
      [
        'en-only line needs no review flags',
        (d) => (d.scenes[0].lines[0].text = { en: 'Hello.' }),
        'accept',
      ],
      [
        'duplicate line ids in a scene',
        (d) => d.scenes[1].lines.push(structuredClone(d.scenes[1].lines[0])),
        'ts-only',
      ],
      ['duplicate scene ids', (d) => d.scenes.push(structuredClone(d.scenes[0])), 'ts-only'],
      ['line 220 emoji', (d) => (d.scenes[0].lines[0].text = { en: '😀'.repeat(220) }), 'accept'],
      ['line 221 emoji', (d) => (d.scenes[0].lines[0].text = { en: '😀'.repeat(221) })],
      ['line text blank', (d) => (d.scenes[0].lines[0].text = { en: ' \n' })],
    ],
  },
  {
    name: 'learning-pack',
    base: b.learning[0] as unknown as Doc,
    validate: validateLearningPack,
    muts: [
      ['fact long', (d) => (d.facts[0].text = { en: 'x'.repeat(141) })],
      ['fact pcm long', (d) => (d.facts[0].text.pcm = 'x'.repeat(141))],
      ['fact no source', (d) => delete d.facts[0].source],
      ['fact no reviewedBy', (d) => delete d.facts[0].reviewedBy],
      ['fact no reviewed', (d) => delete d.facts[0].reviewed],
      ['source no source', (d) => delete d.sources[0].source],
      ['source shelf', (d) => (d.sources[0].codex.shelf = 'attic')],
      ['twoSides no reviewed', (d) => delete d.twoSides[0].reviewed],
      ['two sides count', (d) => (d.twoSides[0].sides.length = 1)],
      ['two sides basis', (d) => (d.twoSides[0].sides[0].basis = 'rumour')],
      ['pin no reviewedBy', (d) => delete d.pins[0].reviewedBy],
      ['map pin place', (d) => delete d.pins[0].place],
      ['pin place x', (d) => (d.pins[0].place.x = 2)],
      ['check options', (d) => (d.checks[0].options = ['a', 'b', 'c'])],
      ['check option long', (d) => (d.checks[0].options[0] = 'x'.repeat(49))],
      ['check answer', (d) => (d.checks[0].answer = 4)],
      ['check difficulty', (d) => (d.checks[0].difficulty = 'insane')],
      ['check explanation', (d) => delete d.checks[0].explanation],
      ['check no reviewed', (d) => delete d.checks[0].reviewed],
      ['check no source', (d) => delete d.checks[0].source],
      [
        'fact reviewed with TODO reviewer',
        (d) => Object.assign(d.facts[0], reviewedTodo('TODO historian')),
      ],
      ...(['sources', 'twoSides', 'pins', 'checks'] as const).map((k): [string, Mut] => [
        `${k} reviewed with TODO reviewer`,
        (d) => Object.assign(d[k][0], reviewedTodo('todo: ask')),
      ]),
      ...placeholderMuts('fact', (d, v) => Object.assign(d.facts[0], v)),
      [
        'fact reviewed with a real reviewer',
        (d) => Object.assign(d.facts[0], reviewedBy('Prof. B. Adeyemi')),
        'accept',
      ],
      ['fact reviewedBy blank', (d) => (d.facts[0].reviewedBy = ' ')],
      ['fact source blank', (d) => (d.facts[0].source = '')],
      ['duplicate fact ids', (d) => d.facts.push(structuredClone(d.facts[0])), 'ts-only'],
      ['duplicate source ids', (d) => d.sources.push(structuredClone(d.sources[0])), 'ts-only'],
      ['duplicate check ids', (d) => d.checks.push(structuredClone(d.checks[0])), 'ts-only'],
      [
        'check options distinct only by case',
        (d) => (d.checks[0].options = ['Ajele', 'ajele', 'Seriki', 'Saro']),
        'ts-only',
      ],
      [
        'check options distinct only by spaces',
        (d) => (d.checks[0].options = ['Ajele', ' Ajele ', 'Seriki', 'Saro']),
        'ts-only',
      ],
      [
        'check options exact duplicate',
        (d) => (d.checks[0].options = ['Ajele', 'Ajele', 'Seriki', 'Saro']),
      ],
      [
        'pin date end before start',
        (d) => (d.pins[0].date = { start: { year: 1893 }, end: { year: 1877 } }),
        'ts-only',
      ],
      [
        'pin date end before start (month)',
        (d) =>
          (d.pins[1].date = { start: { year: 1886, month: 9 }, end: { year: 1886, month: 3 } }),
        'ts-only',
      ],
      [
        'pin date end equals start',
        (d) => (d.pins[0].date = { start: { year: 1877 }, end: { year: 1877 } }),
        'accept',
      ],
      ['pin day without month', (d) => (d.pins[1].date = { start: { year: 1886, day: 23 } })],
      ['pin end day without month', (d) => (d.pins[0].date.end = { year: 1893, day: 2 })],
      [
        'pin month without day',
        (d) => (d.pins[1].date = { start: { year: 1886, month: 9 } }),
        'accept',
      ],
      ['pin year too early', (d) => (d.pins[0].date.start.year = 999)],
      [
        'fact 140 emoji (280 UTF-16 units)',
        (d) => (d.facts[0].text = { en: '😀'.repeat(140) }),
        'accept',
      ],
      ['fact 141 emoji', (d) => (d.facts[0].text = { en: '😀'.repeat(141) })],
      ['option 48 emoji', (d) => (d.checks[0].options[0] = '😀'.repeat(48)), 'accept'],
      ['option 49 emoji', (d) => (d.checks[0].options[0] = '😀'.repeat(49))],
      ['option blank', (d) => (d.checks[0].options[0] = '  ')],
      ['fact text blank', (d) => (d.facts[0].text = { en: '   ' })],
    ],
  },
  {
    name: 'glossary-pack',
    base: b.glossary[0] as unknown as Doc,
    validate: validateGlossaryPack,
    muts: [
      ['campaign', (d) => (d.campaign = 'all')],
      ['no terms', (d) => (d.terms = [])],
      ['language', (d) => (d.terms[0].language = 'fr')],
      ['definition', (d) => (d.terms[0].definition = { en: 'x'.repeat(161) })],
      ['flag', (d) => delete d.terms[0].diacriticChecked],
      ['no source', (d) => delete d.terms[0].source],
      ['no reviewedBy', (d) => delete d.terms[0].reviewedBy],
      ['no reviewed', (d) => delete d.terms[0].reviewed],
      [
        'term reviewed with TODO reviewer',
        (d) => Object.assign(d.terms[0], reviewedTodo('TODO historian')),
      ],
      ...placeholderMuts('term', (d, v) => Object.assign(d.terms[0], v)),
      [
        'term reviewed with a real reviewer',
        (d) => Object.assign(d.terms[0], reviewedBy('Chief N. Eze')),
        'accept',
      ],
      [
        'term unreviewed with TODO',
        (d) => Object.assign(d.terms[0], { reviewed: false, reviewedBy: 'TODO' }),
        'accept',
      ],
      ['duplicate term ids', (d) => d.terms.push(structuredClone(d.terms[0])), 'ts-only'],
      ['term blank', (d) => (d.terms[0].term = ' ')],
      ['definition 160 emoji', (d) => (d.terms[0].definition = { en: '😀'.repeat(160) }), 'accept'],
      ['definition 161 emoji', (d) => (d.terms[0].definition = { en: '😀'.repeat(161) })],
    ],
  },
];

describe.each(kinds)('$name.schema.json agrees with the TypeScript validator', (k) => {
  const s = schema(k.name);
  it('has an $id and is draft 2020-12', () => {
    expect(String(s.$schema)).toContain('2020-12');
    expect(String(s.$id)).toContain(`${k.name}`.replace('-manifest', ''));
  });
  it('accepts the Kiriji 1 skeleton', () => {
    expect(validateSchema(s, k.base)).toEqual([]);
    expect(k.validate(k.base).ok).toBe(true);
  });
  it('documents its TypeScript-only rules in the header', () => {
    expect(String(s.$comment)).toContain('TypeScript-only');
    expect(String(s.$comment)).toContain('authoritative');
  });
  const verdictOf = (v: Verdict | undefined): Verdict => v ?? 'reject';
  it.each(k.muts.filter((m) => verdictOf(m[2]) === 'reject'))('both reject: %s', (_n, mut) => {
    const d = clone(k.base);
    mut(d);
    expect(k.validate(d).ok).toBe(false);
    expect(validateSchema(s, d).length).toBeGreaterThan(0);
  });
  it.each(k.muts.filter((m) => m[2] === 'accept'))('both accept: %s', (_n, mut) => {
    const d = clone(k.base);
    mut(d);
    expect(validateSchema(s, d)).toEqual([]);
    expect(k.validate(d).ok).toBe(true);
  });
  it.each(k.muts.filter((m) => m[2] === 'ts-only'))(
    'TypeScript-only rule rejects: %s',
    (_n, mut) => {
      const d = clone(k.base);
      mut(d);
      expect(k.validate(d).ok).toBe(false);
    },
  );
  it('every mutation name is unique (so a verdict cannot hide behind a duplicate)', () => {
    const names = k.muts.map((m) => m[0]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('placeholder reviewer rule is shared', () => {
  it('every schema carries the exact case-expanded pattern generated from the TypeScript words', () => {
    for (const name of ['chapter-manifest', 'learning-pack', 'glossary-pack']) {
      const text = fs.readFileSync(path.join(dir, `${name}.schema.json`), 'utf8');
      expect(text, name).toContain(JSON.stringify(placeholderPattern()).slice(1, -1));
    }
    expect(PLACEHOLDER_WORDS).toEqual(['todo', 'tbd', 'pending', 'n/a', 'none']);
  });
});
