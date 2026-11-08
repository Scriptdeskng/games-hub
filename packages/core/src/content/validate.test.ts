import { describe, expect, it } from 'vitest';
import { countUnreviewed, validateQuizPack, validateWordPack } from './validate';
import { question, quizPack, wordPack } from './fixtures';

const errs = (r: { ok: boolean; errors?: string[] }): string => (r.errors ?? []).join('|');

describe('validateQuizPack', () => {
  it('accepts a good pack and returns it', () => {
    const p = quizPack();
    const r = validateQuizPack(p);
    expect(r.ok && r.value).toBe(p);
  });
  it.each([
    ['not an object', null, 'object'],
    ['array', [], 'object'],
    ['version', quizPack({ version: 2 }), 'version'],
    ['id', quizPack({ id: 'Bad Id' }), 'id'],
    ['title', quizPack({ title: ' ' }), 'title'],
    ['lang', quizPack({ lang: 'fr' }), 'lang'],
    ['no questions', quizPack({ questions: [] }), 'questions'],
    ['questions type', quizPack({ questions: 'x' }), 'questions'],
    ['question not object', quizPack({ questions: [5] }), 'must be an object'],
  ])('rejects %s', (_n, data, msg) => {
    const r = validateQuizPack(data);
    expect(r.ok).toBe(false);
    expect(errs(r)).toContain(msg);
  });
  it.each([
    ['id', { id: '!' }],
    ['category', { category: '' }],
    ['difficulty', { difficulty: 'insane' }],
    ['q', { q: 3 }],
    ['options', { options: ['a', 'b', 'c'] }],
    ['options', { options: ['a', 'b', 'c', 5] }],
    ['distinct', { options: ['a', 'A', 'c', 'd'] }],
    ['answer', { answer: 4 }],
    ['answer', { answer: 1.5 }],
    ['answer', { answer: -1 }],
    ['source', { source: '' }],
    ['reviewed', { reviewed: 'yes' }],
    ['tags', { tags: [1] }],
    ['tags', { tags: 'x' }],
  ])('rejects a bad question %s', (field, over) => {
    const r = validateQuizPack(quizPack({ questions: [question(1, over as never)] }));
    expect(r.ok).toBe(false);
    expect(errs(r)).toContain(field);
  });
  it('rejects duplicate ids and caps the error list', () => {
    expect(errs(validateQuizPack(quizPack({ questions: [question(1), question(1)] })))).toContain(
      'duplicated',
    );
    const many = Array.from({ length: 80 }, (_, i) => question(i, { answer: 9 as never }));
    const r = validateQuizPack(quizPack({ questions: many }));
    expect(!r.ok && r.errors.length).toBeLessThan(40);
  });
});

describe('validateWordPack', () => {
  it('accepts a good pack (unicode letters, optional fields)', () => {
    expect(validateWordPack(wordPack()).ok).toBe(true);
    expect(validateWordPack(wordPack({ blocklist: undefined })).ok).toBe(true);
  });
  it.each([
    ['not an object', 7, 'object'],
    ['theme', wordPack({ theme: 'Big Theme' }), 'theme'],
    ['blocklist', wordPack({ blocklist: [1] }), 'blocklist'],
    ['blocklist', wordPack({ blocklist: 'x' }), 'blocklist'],
    ['no words', wordPack({ words: [] }), 'words'],
    ['word not obj', wordPack({ words: ['x'] }), 'must be an object'],
    ['word shape', wordPack({ words: [{ word: 'two words' }] }), 'word must be'],
    ['word short', wordPack({ words: [{ word: 'a' }] }), 'word must be'],
    ['hint', wordPack({ words: [{ word: 'rice', hint: '' }] }), 'hint'],
    ['reviewed', wordPack({ words: [{ word: 'rice', reviewed: 1 }] }), 'reviewed'],
    ['tags', wordPack({ words: [{ word: 'rice', tags: [2] }] }), 'tags'],
    ['dup', wordPack({ words: [{ word: 'Rice' }, { word: 'rice' }] }), 'duplicated'],
    ['blocked', wordPack({ words: [{ word: 'BadWord' }] }), 'blocklist'],
    ['missing word', wordPack({ words: [{}] }), 'word must be'],
  ])('rejects %s', (_n, data, msg) => {
    const r = validateWordPack(data);
    expect(r.ok).toBe(false);
    expect(errs(r)).toContain(msg);
  });
  it('caps the error list', () => {
    const words = Array.from({ length: 80 }, () => ({ word: '1' }));
    const r = validateWordPack(wordPack({ words }));
    expect(!r.ok && r.errors.length).toBeLessThan(40);
  });
});

describe('countUnreviewed', () => {
  it('counts reviewed:false in quiz and word packs, ignores absent flags', () => {
    expect(
      countUnreviewed(quizPack({ questions: [question(1), question(2, { reviewed: false })] })),
    ).toBe(1);
    expect(countUnreviewed(wordPack())).toBe(1);
  });
});
