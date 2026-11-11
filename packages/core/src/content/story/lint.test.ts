import { describe, expect, it } from 'vitest';
import { checkDiacritics, foldDiacritics, hasDiacritics, isNfc } from './diacritics';
import { featuresFixture, kirijiOneBundle } from './fixtures';
import {
  DEFAULT_GUARDRAILS,
  lintTexts,
  mergeGuardrails,
  PROTECTED_RULES,
  validateGuardrailOverride,
} from './guardrails';
import { collectTexts } from './texts';
import { errorsOf, formatFinding, lintBundle } from './xref';
import type { CampaignBundle, ChapterManifest } from './types';

const rules = (b: CampaignBundle, o = {}): string[] => lintBundle(b, o).map((f) => f.rule);
const lint = (text: string): string[] =>
  lintTexts([{ at: 'x', text }]).map((f) => f.rule.replace('guardrail/', ''));

describe('diacritics helpers (flag-only)', () => {
  it('folds, detects marks and NFC', () => {
    expect(foldDiacritics('Ọ̀yọ́')).toBe('oyo');
    expect(hasDiacritics('Ọ̀yọ́')).toBe(true);
    expect(hasDiacritics('Oyo')).toBe(false);
    expect(isNfc('ọ'.normalize('NFD'))).toBe(false);
    expect(isNfc('ọ'.normalize('NFC'))).toBe(true);
  });
  it('flags a yo or ig term with no marks, not hausa, short terms or allowed terms', () => {
    expect(checkDiacritics('Ajele', 'yo').map((i) => i.code)).toEqual(['no-marks']);
    expect(checkDiacritics('Ekwe', 'ig').map((i) => i.code)).toEqual(['no-marks']);
    expect(checkDiacritics('Ajele', 'ha')).toEqual([]);
    expect(checkDiacritics('Ọ̀ba', 'yo')).toEqual([]);
    expect(checkDiacritics('Oyo', 'yo', { minLetters: 4 })).toEqual([]);
    expect(checkDiacritics('Ajele', 'yo', { allow: new Set(['ajele']) })).toEqual([]);
  });
  it('flags text that is not NFC even for English', () => {
    expect(checkDiacritics('ọ'.normalize('NFD') + 'ba', 'en').map((i) => i.code)).toEqual([
      'not-nfc',
    ]);
  });
});

describe('guardrail linter', () => {
  it.each([
    ['blood', 'The ground ran with blood.'],
    ['blood', 'A bloody fight.'],
    ['skull', 'a skull on a pole'],
    ['beheading', 'He was beheaded.'],
    ['gore', 'Too much gore here.'],
    ['tribe-of', 'the tribe of the hills'],
    ['colonial-ethnic-label', 'Hausa constables marched in.'],
    ['colonial-ethnic-label', 'the constabulary from the Yoruba country'],
    ['colonial-ethnic-label', 'The Company sent Hausa soldiers.'],
    ['colonial-ethnic-label', 'Company officers and soldiers of the Igbo arrived.'],
    ['colonial-ethnic-label', 'The Crown paid Fulani-speaking troops.'],
    ['colonial-ethnic-label', 'Ijesa soldiers served the colonial government.'],
    ['colonial-ethnic-label', 'Ekiti constables walked the road.'],
    ['colonial-ethnic-label', 'The Company posted Anioma police at the ford.'],
    ['colonial-ethnic-label', 'Royal Niger Company Ebira forces came upriver.'],
    ['colonial-ethnic-label', 'The Ugbo constabulary waited.'],
    ['colonial-ethnic-label', 'Ilaje askaris took the landing.'],
    ['yoruba-igbo-enemies', 'The Yoruba were our enemies.'],
    ['yoruba-igbo-enemies', 'Igbo and Yoruba are enemies, said the trader.'],
    ['yoruba-igbo-enemies', 'The Igbo raiders attacked Ife.'],
    ['yoruba-igbo-enemies', 'Yoruba enemies at the gate'],
    ['ugbo-villain', 'The Ugbo were the villains of the tale.'],
  ])('is a hard ERROR: %s in "%s"', (rule, text) => {
    const f = lintTexts([{ at: 'x', text }]);
    expect(f.find((x) => x.rule === `guardrail/${rule}`)?.severity).toBe('error');
  });
  it.each([
    ['villain-city', 'Ibadan was a cruel city.'],
    ['tribe-word', 'a tribal quarrel'],
    ['violence-words', 'The captain was killed.'],
    ['trophy', 'He kept a trophy.'],
    ['enslavement', 'slave raiding'],
    ['sacred-imagery', 'near the shrine'],
    ['ethnic-army-label', 'Hausa soldiers marched in.'],
    ['ethnic-army-label', 'soldiers of the Igbo'],
    ['ethnic-army-label', 'Fulani-speaking troops'],
    ['ethnic-army-label', 'Hausa forces attacked the village.'],
    ['ethnic-army-label', 'Ijesa soldiers held the pass.'],
    ['ethnic-army-label', 'Yoruba soldiers held the hill path while the villagers escaped.'],
    ['people-in-flames', 'the flames reached the villagers'],
    ['people-in-flames', 'The firebrand burns his cloak until he flees.'],
    ['people-in-flames', 'The firebrand burned the raider chief.'],
    ['anachronism', 'a corrugated roof'],
  ])('is a WARNING: %s in "%s"', (rule, text) => {
    const f = lintTexts([{ at: 'x', text }]);
    expect(f.find((x) => x.rule === `guardrail/${rule}`)?.severity).toBe('warning');
  });
  it.each([
    'The Yoruba soldiers of Ibadan marched on Ikirun.',
    'Yoruba soldiers held the hill path while the villagers escaped.',
    'The Igbo soldiers of Onitsha fought at the ford.',
    'Yoruba troops of Oyo fought the Ibadan army.',
    'The raffia raiders of the forest are never called Igbo.',
    'Company raiders burned no Igbo towns in this telling.',
    'The Yoruba were never our enemies.',
    'Igbo and Yoruba were not enemies, they were neighbours.',
    'A bloodline of drummers; a skulking guard; a bloodless day.',
    'Ekumeku survived, and the codex states the real outcome: a British victory.',
    'The Ekitiparapo and the Ekiti Parapo hold the ridge.',
  ])('regression: compliant text is never an ERROR: %s', (text) => {
    expect(lintTexts([{ at: 'x', text }]).filter((f) => f.severity === 'error')).toEqual([]);
  });
  it('the required Moremi sentence passes with no finding at all', () => {
    expect(lint('The raffia raiders of the forest are never called Igbo.')).toEqual([]);
  });
  it('negation reaches only its own clause: a true violation after a negation is still caught', () => {
    expect(lint('Raiders are never called Igbo. The Igbo raiders attacked Ife.')).toContain(
      'yoruba-igbo-enemies',
    );
    expect(lint('Company raiders burned the Igbo towns.')).toContain('yoruba-igbo-enemies');
  });
  it('an allow entry matches on a segment boundary', () => {
    const cfg = mergeGuardrails(DEFAULT_GUARDRAILS, {
      allow: [{ rule: 'enslavement', at: 'kiriji-1', reason: 'codex' }],
    });
    const f = lintTexts(
      [
        { at: 'kiriji-1.facts[0]', text: 'slave raiding' },
        { at: 'kiriji-1', text: 'slave raiding' },
        { at: 'kiriji-10.facts[0]', text: 'slave raiding' },
        { at: 'kiriji-1x', text: 'slave raiding' },
      ],
      cfg,
    );
    expect(f.map((x) => x.at)).toEqual(['kiriji-10.facts[0]', 'kiriji-1x']);
  });
  it('passes clean text, honours word boundaries and ignores the colonial rule for places', () => {
    expect(lint('The Company and its constabulary arrive. Ibadan soldiers march.')).toEqual([]);
    expect(lint('A bloodline of drummers; a skullcap.')).toEqual([]);
    expect(lint('The Ekitiparapo hold the ridge.')).toEqual([]);
  });
  it('is case-insensitive and NFC-normalises', () => {
    expect(lint('BLOOD')).toContain('blood');
    expect(lint('s' + 'ọ'.normalize('NFD') + ' skull')).toContain('skull');
  });
  it('merges a project override: replace, add, disable, union, allow-list', () => {
    const cfg = mergeGuardrails(DEFAULT_GUARDRAILS, {
      rules: [
        {
          id: 'trophy',
          severity: 'error',
          patterns: ['\\btrophy\\b'],
          message: 'm',
          reason: 'stricter here',
        },
        {
          id: 'villain-city',
          severity: 'off',
          patterns: ['x'],
          message: 'm',
          reason: 'not used',
        },
        { id: 'custom', severity: 'error', patterns: ['\\bbanned\\b'], message: 'custom' },
      ],
      ethnicGroups: ['Gwari'],
      realPeople: ['Someone'],
      allow: [{ rule: 'enslavement', at: 'x', reason: 'codex sentence' }],
    });
    expect(cfg.ethnicGroups).toContain('gwari');
    expect(cfg.realPeople).toContain('someone');
    const f = lintTexts(
      [
        { at: 'x', text: 'trophy cruel Ibadan banned slaves Company Gwari soldiers' },
        { at: 'y', text: 'slaves' },
      ],
      cfg,
    );
    const by = Object.fromEntries(f.map((x) => [`${x.at}:${x.rule}`, x.severity]));
    expect(by['x:guardrail/trophy']).toBe('error');
    expect(by['x:guardrail/villain-city']).toBeUndefined();
    expect(by['x:guardrail/custom']).toBe('error');
    expect(by['x:guardrail/enslavement']).toBeUndefined();
    expect(by['y:guardrail/enslavement']).toBe('warning');
    expect(by['x:guardrail/colonial-ethnic-label']).toBe('error');
  });
  it('the eight SCRIPT guardrail rules cannot be switched off, downgraded or re-patterned', () => {
    expect(PROTECTED_RULES).toHaveLength(8);
    const base = DEFAULT_GUARDRAILS.rules.filter((r) => PROTECTED_RULES.includes(r.id));
    expect(base.map((r) => r.severity)).toEqual(Array(8).fill('error'));
    for (const r of base) {
      const bad = (over: object): string => {
        const v = validateGuardrailOverride({
          version: 1,
          rules: [{ ...r, reason: 'x', ...over }],
        });
        return v.ok ? '' : v.errors.join('|');
      };
      expect(bad({}), r.id).toBe('');
      expect(bad({ severity: 'off' }), r.id).toContain('severity must stay');
      expect(bad({ severity: 'warning' }), r.id).toContain('severity must stay');
      expect(bad({ patterns: ['zzz'] }), r.id).toContain('patterns cannot be replaced');
      // even if a caller skips validation, merge keeps the built-in rule
      const merged = mergeGuardrails(DEFAULT_GUARDRAILS, {
        rules: [{ ...r, severity: 'off', patterns: ['zzz'] }],
      });
      expect(merged.rules.find((x) => x.id === r.id)).toEqual(r);
    }
  });
  it('overriding any built-in rule needs a reason; a new rule id does not', () => {
    const rule = { severity: 'warning', patterns: ['x'], message: 'm' };
    const bad = (id: string, extra: object = {}): string => {
      const v = validateGuardrailOverride({ version: 1, rules: [{ id, ...rule, ...extra }] });
      return v.ok ? '' : v.errors.join('|');
    };
    expect(bad('trophy')).toContain('needs a reason');
    expect(bad('trophy', { reason: '  ' })).toContain('needs a reason');
    expect(bad('trophy', { reason: 'codex sentence' })).toBe('');
    expect(bad('my-own-rule')).toBe('');
    expect(bad('my-own-rule', { reason: 3 })).toContain('needs id');
  });
  it('merging with no override returns the defaults', () => {
    expect(mergeGuardrails(DEFAULT_GUARDRAILS).rules).toHaveLength(DEFAULT_GUARDRAILS.rules.length);
  });
  it('validates an override file', () => {
    expect(validateGuardrailOverride({ version: 1 }).ok).toBe(true);
    const bad = (d: unknown): string => {
      const r = validateGuardrailOverride(d);
      return r.ok ? '' : r.errors.join('|');
    };
    expect(bad(3)).toContain('object');
    expect(bad({ version: 2 })).toContain('version');
    expect(bad({ version: 1, rules: 'x' })).toContain('rules');
    expect(bad({ version: 1, rules: [{ id: 'a' }] })).toContain('needs id');
    expect(
      bad({ version: 1, rules: [{ id: 'a', severity: 'error', patterns: ['('], message: 'm' }] }),
    ).toContain('compile');
    expect(bad({ version: 1, ethnicGroups: [1] })).toContain('ethnicGroups');
    expect(bad({ version: 1, allow: [{ rule: 'a' }] })).toContain('reason');
  });
  it('the Kiriji 1 skeleton text is clean', () => {
    const f = lintTexts(collectTexts(kirijiOneBundle()));
    expect(f).toEqual([]);
  });
});

describe('lintBundle (cross-references and wiring)', () => {
  it('the skeleton has no errors, and only the two expected diacritics warnings', () => {
    const f = lintBundle(kirijiOneBundle(), { features: featuresFixture() });
    expect(errorsOf(f)).toEqual([]);
    expect(f.map((x) => x.rule)).toEqual(['diacritics/no-marks', 'diacritics/no-marks']);
  });
  it('finds duplicate ids across files of one campaign, including shared glossary', () => {
    const b = kirijiOneBundle();
    b.learning[0]!.facts[0]!.id = 'k1-m-1'; // a dialogue line id
    expect(rules(b)).toContain('xref/duplicate-id');
    const c = kirijiOneBundle();
    c.glossary.push({ ...structuredClone(c.glossary[0]!), id: 'shared-g', campaign: 'shared' });
    expect(errorsOf(lintBundle(c)).map((x) => x.rule)).toContain('xref/duplicate-id');
  });
  it('allows the same id in different campaigns', () => {
    const b = kirijiOneBundle();
    const other = structuredClone(b.glossary[0]!);
    other.id = 'ekumeku-glossary';
    other.campaign = 'ekumeku';
    b.glossary.push(other);
    expect(rules(b)).not.toContain('xref/duplicate-id');
  });
  it('checks dialogue to glossary, speakers and the fictional marker', () => {
    const b = kirijiOneBundle();
    const lines = b.dialogue[0]!.scenes[1]!.lines;
    lines[1]!.glossary = ['nope'];
    lines[0]!.speaker = 'stranger';
    lines[2]!.speaker = 'akin'; // not in Chapter 1 (introduced in Chapter 3)
    expect(rules(b).filter((r) => r.startsWith('xref/'))).toEqual([
      'xref/speaker',
      'xref/glossary',
      'xref/speaker',
    ]);
    const c = kirijiOneBundle();
    c.chapters[0]!.cast!.push('ogedengbe');
    c.dialogue[0]!.scenes[0]!.lines[0]!.speaker = 'ogedengbe';
    expect(errorsOf(lintBundle(c)).map((x) => x.rule)).toEqual(['cameo/fictional']);
    c.dialogue[0]!.scenes[0]!.lines[0]!.fictional = true;
    expect(errorsOf(lintBundle(c))).toEqual([]);
  });
  it('warns when a glossary term is spoken but not tagged', () => {
    const b = kirijiOneBundle();
    b.dialogue[0]!.scenes[1]!.lines[1]!.glossary = [];
    expect(rules(b)).toContain('glossary/untagged');
  });
  it('checks facts to sources', () => {
    const b = kirijiOneBundle();
    b.learning[0]!.facts[0]!.sourceRef = 'missing';
    expect(errorsOf(lintBundle(b)).map((x) => x.rule)).toEqual(['xref/fact-source']);
    const c = kirijiOneBundle();
    delete c.learning[0]!.facts[2]!.sourceRef;
    expect(lintBundle(c).find((f) => f.rule === 'xref/fact-source')?.severity).toBe('warning');
  });
  it('checks chapter to items both ways', () => {
    const b = kirijiOneBundle();
    b.chapters[0]!.content.facts.push('ghost');
    b.learning[0]!.pins.push({ ...structuredClone(b.learning[0]!.pins[1]!), id: 'extra-pin' });
    const f = lintBundle(b);
    expect(f.find((x) => x.rule === 'xref/chapter-item')?.message).toContain('ghost');
    expect(f.find((x) => x.rule === 'xref/orphan-item')?.severity).toBe('warning');
  });
  it('checks packs point at real chapters and one pack per chapter', () => {
    const b = kirijiOneBundle();
    b.dialogue[0]!.chapter = 'kiriji-9';
    b.learning.push({ ...structuredClone(b.learning[0]!), id: 'second' });
    const f = errorsOf(lintBundle(b)).filter((x) => x.rule === 'xref/chapter');
    expect(f.length).toBeGreaterThanOrEqual(2);
  });
  it('warns on incomplete chapters (target 3 checks, 2-3 facts, 1 source)', () => {
    const b = kirijiOneBundle();
    b.learning[0]!.checks.length = 1;
    b.learning[0]!.facts.length = 1;
    b.learning[0]!.sources.length = 0;
    const r = rules(b);
    expect(r).toEqual(
      expect.arrayContaining(['chapter/checks', 'chapter/facts', 'chapter/sources']),
    );
  });
  it('checks chapter order, pack ids, dependencies and cycles', () => {
    const b = kirijiOneBundle();
    const two = structuredClone(b.chapters[0]!);
    two.id = 'kiriji-2';
    two.dependencies = ['kiriji-1', 'ghost', 'ekumeku-x'];
    two.delivery = 'pack';
    two.pack = 'ch02';
    two.packBudgetKb = 900;
    two.content = { scenes: [], facts: [], sources: [], twoSides: [], pins: [], checks: [] };
    b.chapters.push(two);
    b.chapters[0]!.dependencies = ['kiriji-2'];
    const eknum = structuredClone(two);
    eknum.id = 'ekumeku-x';
    eknum.campaign = 'ekumeku';
    eknum.order = 5;
    eknum.dependencies = [];
    b.chapters.push(eknum);
    const r = errorsOf(lintBundle(b));
    const by = (rule: string): string =>
      r
        .filter((x) => x.rule === rule)
        .map((x) => x.message)
        .join('|');
    expect(by('xref/order')).toContain('order 1');
    expect(by('xref/dependency')).toContain('unknown chapter "ghost"');
    expect(by('xref/dependency')).toContain('another campaign');
    expect(by('xref/dependency-cycle')).not.toBe('');
    expect(by('xref/pack-id')).toContain('ch02');
    b.chapters.push({ ...structuredClone(two), id: 'kiriji-3' });
    expect(rules(b)).toContain('xref/order');
  });
  it('warns when more than one chapter is in the initial download', () => {
    const b = kirijiOneBundle();
    const two = structuredClone(b.chapters[0]!);
    two.id = 'kiriji-2';
    two.order = 2;
    two.content = { scenes: [], facts: [], sources: [], twoSides: [], pins: [], checks: [] };
    b.chapters.push(two);
    expect(rules(b)).toContain('xref/initial-chapters');
  });
  it('gates the Moremi prologue behind the moremiPrologue flag and declared flags', () => {
    const b = kirijiOneBundle();
    const m = structuredClone(b.chapters[0]!);
    m.id = 'moremi-prologue';
    m.campaign = 'moremi-prologue';
    m.order = 0;
    m.tag = 'Legend';
    m.content = { scenes: [], facts: [], sources: [], twoSides: [], pins: [], checks: [] };
    b.chapters.push(m);
    const noFlag = errorsOf(lintBundle(b, { features: featuresFixture() }));
    expect(noFlag.some((x) => x.rule === 'xref/feature-flag' && x.at === 'moremi-prologue')).toBe(
      true,
    );
    m.featureFlag = 'moremiPrologue';
    expect(errorsOf(lintBundle(b, { features: featuresFixture() }))).toEqual([]);
    expect(
      errorsOf(lintBundle(b, { features: { version: 1, features: {} } })).map((x) => x.rule),
    ).toEqual(['xref/feature-flag']);
  });
  it('rejects a chapter id used twice, even across campaigns', () => {
    const b = kirijiOneBundle();
    const other = structuredClone(b.chapters[0]!);
    other.campaign = 'ekumeku';
    other.order = 9;
    b.chapters.push(other);
    const f = errorsOf(lintBundle(b)).filter((x) => x.rule === 'xref/duplicate-id');
    expect(f.some((x) => x.message.includes('more than one chapter'))).toBe(true);
  });
  it('requires featureFlag moremiPrologue for ch00 ids, ch00 packs and early Legend chapters', () => {
    const make = (patch: (c: ChapterManifest) => void): ChapterManifest => {
      const c = structuredClone(kirijiOneBundle().chapters[0]!);
      c.id = 'moremi-x';
      c.order = 0;
      c.content = { scenes: [], facts: [], sources: [], twoSides: [], pins: [], checks: [] };
      patch(c);
      return c;
    };
    const flagged = (c: ChapterManifest): boolean => {
      const b = kirijiOneBundle();
      b.chapters.push(c);
      return errorsOf(lintBundle(b, { features: featuresFixture() })).some(
        (x) => x.rule === 'xref/feature-flag' && x.at === c.id,
      );
    };
    expect(flagged(make((c) => (c.id = 'ch00-moremi')))).toBe(true);
    expect(
      flagged(make((c) => Object.assign(c, { delivery: 'pack', pack: 'ch00', packBudgetKb: 9 }))),
    ).toBe(true);
    expect(
      flagged(make((c) => Object.assign(c, { tag: 'Legend', dates: { start: { year: 1100 } } }))),
    ).toBe(true);
    // a Legend chapter in the Kiriji era, or an ordinary History chapter, is not the prologue
    expect(
      flagged(make((c) => Object.assign(c, { tag: 'Legend', dates: { start: { year: 1877 } } }))),
    ).toBe(false);
    expect(
      flagged(make((c) => Object.assign(c, { tag: 'History', dates: { start: { year: 1100 } } }))),
    ).toBe(false);
    const ok = make((c) => Object.assign(c, { id: 'ch00-moremi', featureFlag: 'moremiPrologue' }));
    expect(flagged(ok)).toBe(false);
  });
  it('NFC-checks every player-visible string and tells which one', () => {
    const b = kirijiOneBundle();
    b.dialogue[0]!.scenes[1]!.lines[2]!.text.en = 'ọ'.normalize('NFD') + 'ba';
    b.learning[0]!.facts[0]!.text.pcm = 'e' + '\u0301';
    const f = errorsOf(lintBundle(b)).filter((x) => x.rule === 'text/not-nfc');
    expect(f.map((x) => x.at)).toEqual([
      'kiriji-1-dialogue.scenes[1].lines[2].en',
      'kiriji-1-learning.facts[0].pcm',
    ]);
    expect(rules(kirijiOneBundle())).not.toContain('text/not-nfc');
  });
  it('lints source author and citation too, not only the title', () => {
    const b = kirijiOneBundle();
    b.learning[0]!.sources[0]!.citation = 'Hausa constables, 1886';
    b.learning[0]!.sources[0]!.author = 'The Company, Ijesa police';
    const at = errorsOf(lintBundle(b)).map((x) => x.at);
    expect(at).toContain('kiriji-1-learning.sources[0].citation');
    expect(at).toContain('kiriji-1-learning.sources[0].author');
  });
  it('flags guardrail violations anywhere in the bundle with their location', () => {
    const b = kirijiOneBundle();
    b.learning[0]!.facts[0]!.text.en = 'Hausa constables took the town.';
    const f = errorsOf(lintBundle(b));
    expect(f).toHaveLength(1);
    expect(f[0]!.at).toContain('kiriji-1-learning.facts[0]');
    expect(formatFinding(f[0]!)).toMatch(/^ERROR \[guardrail\/colonial-ethnic-label\]/);
  });
  it('a checked glossary term is not flagged for missing marks', () => {
    const b = kirijiOneBundle();
    b.glossary[0]!.terms.forEach((t) => (t.diacriticChecked = true));
    expect(rules(b)).not.toContain('diacritics/no-marks');
  });
  it('works with an empty bundle', () => {
    expect(lintBundle({ chapters: [], dialogue: [], learning: [], glossary: [] })).toEqual([]);
  });
});
