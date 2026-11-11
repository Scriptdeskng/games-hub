import { describe, expect, it } from 'vitest';
import { validateChapter, validateFeatureConfig, chapterEnabled, isFeatureOn } from './chapter';
import { validateDialoguePack } from './dialogue';
import { validateGlossaryPack } from './glossary';
import { validateLearningPack } from './learning';
import { featuresFixture, kirijiOneBundle } from './fixtures';

type Mut = (x: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
const errs = (r: { ok: boolean; errors?: string[] }): string => (r.errors ?? []).join('|');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function expectRejects<T>(
  validate: (d: unknown) => { ok: boolean; errors?: string[] },
  base: T,
  cases: Array<[string, Mut, string]>,
): void {
  for (const [name, mut, msg] of cases) {
    const d = clone(base) as Record<string, unknown>;
    mut(d);
    const r = validate(d);
    expect(r.ok, name).toBe(false);
    expect(errs(r), name).toContain(msg);
  }
}

describe('validateChapter', () => {
  const base = kirijiOneBundle().chapters[0]!;
  it('accepts the Kiriji 1 skeleton', () => {
    const r = validateChapter(base);
    expect(r.ok && r.value.id).toBe('kiriji-1');
  });
  it('rejects non-objects', () => {
    expect(errs(validateChapter(null))).toContain('object');
  });
  it('rejects each bad field with a pointed message', () => {
    expectRejects(validateChapter, base, [
      ['version', (d) => (d.version = 2), 'version'],
      ['kind', (d) => (d.kind = 'x'), 'kind'],
      ['id', (d) => (d.id = 'Bad Id'), 'id'],
      ['campaign', (d) => (d.campaign = 'yoruba'), 'campaign'],
      ['order', (d) => (d.order = -1), 'order'],
      ['title en', (d) => (d.title = { pcm: 'x' }), 'title.en'],
      ['title lang', (d) => (d.title = { en: 'x', fr: 'y' }), 'unknown language'],
      ['title long', (d) => (d.title = { en: 'x'.repeat(61) }), 'over 60'],
      ['tag', (d) => (d.tag = 'Fiction'), 'tag'],
      ['goals none', (d) => (d.goals = []), 'goals'],
      ['goals many', (d) => (d.goals = [1, 2, 3, 4, 5].map((n) => ({ en: `g${n}` }))), 'goals'],
      ['environment', (d) => (d.environment = ''), 'environment'],
      ['companions', (d) => (d.companions = 'akin'), 'companions'],
      ['companions dup', (d) => (d.companions = ['akin', 'akin']), 'duplicate'],
      ['cast', (d) => (d.cast = [1]), 'cast[0]'],
      ['objectives', (d) => (d.objectives = []), 'objectives'],
      ['objective', (d) => (d.objectives = [5]), 'objectives[0]'],
      ['objective kind', (d) => (d.objectives[0].kind = 'win'), 'objectives[0].kind'],
      ['objective amount', (d) => (d.objectives[0].amount = 0), 'amount'],
      ['hero moment', (d) => (d.heroMoment = 1), 'heroMoment'],
      ['hero moment type', (d) => (d.heroMoment.type = 'fight'), 'heroMoment.type'],
      ['dates', (d) => (d.dates = 1), 'dates'],
      ['dates end', (d) => (d.dates.end = { year: 1800 }), 'before start'],
      ['dates year', (d) => (d.dates.start = { year: 99 }), 'year'],
      ['dates day', (d) => (d.dates.start = { year: 1886, day: 3 }), 'needs a month'],
      ['dates circa', (d) => (d.dates.circa = 'yes'), 'circa'],
      ['dates note', (d) => (d.dates.sourcesDisagree = 'x'.repeat(201)), 'over 200'],
      ['dates shape', (d) => (d.dates.start = 5), 'start'],
      ['self dependency', (d) => (d.dependencies = ['kiriji-1']), 'itself'],
      ['delivery', (d) => (d.delivery = 'cdn'), 'delivery'],
      ['initial with pack', (d) => (d.pack = 'ch02'), 'only for delivery'],
      ['initial with budget', (d) => (d.packBudgetKb = 500), 'only for delivery'],
      ['featureFlag', (d) => (d.featureFlag = 'Bad Flag'), 'featureFlag'],
      ['content', (d) => (d.content = 1), 'content'],
      ['content ids', (d) => (d.content.facts = 'x'), 'content.facts'],
      ['source', (d) => (d.source = ''), 'source'],
      ['reviewedBy', (d) => delete d.reviewedBy, 'reviewedBy'],
      ['reviewed', (d) => (d.reviewed = 'no'), 'reviewed'],
      ['reviewed with TODO', (d) => (d.reviewed = true), 'TODO placeholder'],
    ]);
  });
  it('requires pack id and budget (1..1024 KB) for a pack chapter', () => {
    const ok = { ...clone(base), delivery: 'pack', pack: 'ch02', packBudgetKb: 900 };
    expect(validateChapter(ok).ok).toBe(true);
    expect(errs(validateChapter({ ...ok, pack: 'chapter2' }))).toContain('ch02');
    expect(errs(validateChapter({ ...ok, packBudgetKb: 1025 }))).toContain('packBudgetKb');
    const missing = { ...clone(base), delivery: 'pack' };
    expect(errs(validateChapter(missing))).toContain('packBudgetKb');
  });
  it('accepts reviewed true with a named reviewer', () => {
    expect(
      validateChapter({ ...clone(base), reviewed: true, reviewedBy: 'Dr A. Historian' }).ok,
    ).toBe(true);
  });
  it('caps the error list instead of flooding', () => {
    const r = validateChapter({ version: 3, kind: 1, id: 1, campaign: 1, order: 'x', goals: 1 });
    expect((r.ok ? [] : r.errors).length).toBeLessThanOrEqual(40);
  });
});

describe('validateDialoguePack', () => {
  const base = kirijiOneBundle().dialogue[0]!;
  it('accepts the skeleton', () => expect(validateDialoguePack(base).ok).toBe(true));
  it('rejects bad scenes and lines', () => {
    expect(errs(validateDialoguePack(7))).toContain('object');
    expectRejects(validateDialoguePack, base, [
      ['kind', (d) => (d.kind = 'learning'), 'kind'],
      ['chapter', (d) => (d.chapter = ''), 'chapter'],
      ['no scenes', (d) => (d.scenes = []), 'scenes'],
      ['scene', (d) => (d.scenes = [3]), 'scenes[0]'],
      ['scene tag', (d) => (d.scenes[0].tag = 'Fiction'), 'tag'],
      ['no lines', (d) => (d.scenes[0].lines = []), 'lines'],
      ['dup scene', (d) => d.scenes.push(clone(d.scenes[0])), 'duplicated'],
      ['dup line', (d) => d.scenes[0].lines.push(clone(d.scenes[0].lines[0])), 'duplicated'],
      ['line', (d) => (d.scenes[0].lines = [1]), 'lines[0]'],
      ['speaker', (d) => (d.scenes[0].lines[0].speaker = ''), 'speaker'],
      ['text long', (d) => (d.scenes[0].lines[0].text = { en: 'x'.repeat(221) }), 'over 220'],
      ['langs', (d) => (d.scenes[0].lines[0].langs = []), 'langs'],
      ['langs bad', (d) => (d.scenes[0].lines[0].langs = ['fr']), 'langs'],
      [
        'native_review required',
        (d) => (d.scenes[0].lines[0].langs = ['en', 'ig']),
        'native_review',
      ],
      ['native_review type', (d) => (d.scenes[0].lines[0].native_review = 'x'), 'native_review'],
      ['fictional type', (d) => (d.scenes[0].lines[0].fictional = 'x'), 'fictional'],
      ['glossary', (d) => (d.scenes[0].lines[0].glossary = 'x'), 'glossary'],
      ['line tag', (d) => (d.scenes[0].lines[0].tag = 'x'), 'tag'],
    ]);
  });
});

describe('validateLearningPack', () => {
  const base = kirijiOneBundle().learning[0]!;
  it('accepts the skeleton', () => expect(validateLearningPack(base).ok).toBe(true));
  it('rejects bad items, and requires source, reviewedBy and reviewed on every kind', () => {
    expect(errs(validateLearningPack([]))).toContain('object');
    const each = ['facts', 'sources', 'twoSides', 'pins', 'checks'] as const;
    for (const k of each) {
      for (const field of ['source', 'reviewedBy', 'reviewed']) {
        const d = clone(base) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        delete d[k][0][field];
        expect(errs(validateLearningPack(d)), `${k}.${field}`).toContain(`${k}[0].${field}`);
      }
      const d2 = clone(base) as unknown as Record<string, unknown>;
      d2[k] = 'x';
      expect(errs(validateLearningPack(d2))).toContain(k);
      const d3 = clone(base) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      d3[k] = [d3[k][0], d3[k][0]];
      expect(errs(validateLearningPack(d3))).toContain('duplicated');
      d3[k] = [1];
      expect(errs(validateLearningPack(d3))).toContain('must be an object');
    }
    expectRejects(validateLearningPack, base, [
      ['fact too long', (d) => (d.facts[0].text = { en: 'x'.repeat(141) }), 'over 140'],
      ['fact pcm too long', (d) => (d.facts[0].text.pcm = 'x'.repeat(141)), 'text.pcm'],
      ['fact trigger', (d) => (d.facts[0].trigger = ''), 'trigger'],
      ['fact tag', (d) => (d.facts[0].tag = 'x'), 'tag'],
      ['fact sourceRef', (d) => (d.facts[0].sourceRef = 'Bad Id'), 'sourceRef'],
      ['source author', (d) => (d.sources[0].author = ''), 'author'],
      ['source codex', (d) => (d.sources[0].codex = 1), 'codex'],
      ['source codex shelf', (d) => (d.sources[0].codex.shelf = 'attic'), 'shelf'],
      ['source quote', (d) => (d.sources[0].quote = 'x'.repeat(241)), 'quote'],
      ['two sides count', (d) => (d.twoSides[0].sides.length = 1), 'sides'],
      ['two sides item', (d) => (d.twoSides[0].sides = [1, 2]), 'sides[0]'],
      ['two sides basis', (d) => (d.twoSides[0].sides[0].basis = 'rumour'), 'basis'],
      ['pin kind', (d) => (d.pins[0].kind = 'x'), 'kind'],
      ['map pin place', (d) => delete d.pins[0].place, 'place'],
      ['pin place shape', (d) => (d.pins[0].place = 1), 'place'],
      ['pin place x', (d) => (d.pins[0].place.x = 2), 'place.x'],
      ['pin date', (d) => (d.pins[1].date = {}), 'date'],
      ['check options', (d) => (d.checks[0].options = ['a', 'b', 'c']), 'options'],
      ['check distinct', (d) => (d.checks[0].options = ['a', 'A', 'c', 'd']), 'distinct'],
      ['check option long', (d) => (d.checks[0].options[0] = 'x'.repeat(49)), 'over 48'],
      ['check answer', (d) => (d.checks[0].answer = 4), 'answer'],
      ['check difficulty', (d) => (d.checks[0].difficulty = 'insane'), 'difficulty'],
      ['check q', (d) => (d.checks[0].q = 'x'.repeat(141)), 'over 140'],
      ['check explanation', (d) => delete d.checks[0].explanation, 'explanation'],
    ]);
  });
  it('allows a timeline pin without a place', () => {
    const d = clone(base);
    expect(d.pins[1]!.place).toBeUndefined();
    expect(validateLearningPack(d).ok).toBe(true);
  });
});

describe('validateGlossaryPack', () => {
  const base = kirijiOneBundle().glossary[0]!;
  it('accepts the skeleton and a shared pack', () => {
    expect(validateGlossaryPack(base).ok).toBe(true);
    expect(validateGlossaryPack({ ...clone(base), campaign: 'shared' }).ok).toBe(true);
  });
  it('rejects bad terms', () => {
    expect(errs(validateGlossaryPack(null))).toContain('object');
    expectRejects(validateGlossaryPack, base, [
      ['campaign', (d) => (d.campaign = 'all'), 'campaign'],
      ['no terms', (d) => (d.terms = []), 'terms'],
      ['term', (d) => (d.terms = [1]), 'terms[0]'],
      ['dup', (d) => d.terms.push(clone(d.terms[0])), 'duplicated'],
      ['term text', (d) => (d.terms[0].term = ''), 'term'],
      ['language', (d) => (d.terms[0].language = 'fr'), 'language'],
      ['definition', (d) => (d.terms[0].definition = { en: 'x'.repeat(161) }), 'over 160'],
      ['checked flag', (d) => delete d.terms[0].diacriticChecked, 'diacriticChecked'],
      ['reviewed', (d) => delete d.terms[0].reviewed, 'reviewed'],
    ]);
  });
});

describe('feature flags', () => {
  it('ships the Moremi prologue OFF by default and treats unknown flags as off', () => {
    const f = featuresFixture();
    expect(validateFeatureConfig(f).ok).toBe(true);
    expect(isFeatureOn(f, 'moremiPrologue')).toBe(false);
    expect(isFeatureOn(f, 'nope')).toBe(false);
    expect(chapterEnabled({ featureFlag: 'moremiPrologue' }, f)).toBe(false);
    expect(chapterEnabled({}, f)).toBe(true);
    expect(
      chapterEnabled(
        { featureFlag: 'moremiPrologue' },
        { version: 1, features: { moremiPrologue: true } },
      ),
    ).toBe(true);
  });
  it('rejects malformed config', () => {
    expect(validateFeatureConfig(1).ok).toBe(false);
    expect(errs(validateFeatureConfig({ version: 2, features: 5 }))).toContain('features');
    expect(errs(validateFeatureConfig({ version: 1, features: { Bad: 1 } }))).toContain('boolean');
  });
});
