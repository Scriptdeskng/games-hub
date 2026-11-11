import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { kirijiOneBundle } from '../packages/core/src/content/story/fixtures';
import { validateChapter } from '../packages/core/src/content/story/chapter';
import { validateDialoguePack } from '../packages/core/src/content/story/dialogue';
import { validateGlossaryPack } from '../packages/core/src/content/story/glossary';
import { validateLearningPack } from '../packages/core/src/content/story/learning';
import { validateSchema } from './json-schema-lite';

/** The JSON Schema files and the TypeScript validators must give the same verdict. */
type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  muts: Array<[string, (d: Doc) => void]>;
}
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
  it.each(k.muts)('both reject: %s', (_name, mut) => {
    const d = clone(k.base);
    mut(d);
    expect(k.validate(d).ok).toBe(false);
    expect(validateSchema(s, d).length).toBeGreaterThan(0);
  });
});
