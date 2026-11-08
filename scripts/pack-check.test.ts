import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { quizPack, wordPack } from '../packages/core/src/content/fixtures';
import { question } from '../packages/core/src/content/fixtures';
import { validateQuizPack, validateWordPack } from '../packages/core/src/content/validate';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function run(files: Record<string, unknown | string>, release = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'packs-'));
  dirs.push(root);
  for (const [name, body] of Object.entries(files)) {
    const f = path.join(root, 'games/g/assets/packs', name);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof body === 'string' ? body : JSON.stringify(body));
  }
  const args = ['scripts/pack-check.mjs', '--root', root, ...(release ? ['--release'] : [])];
  const r = spawnSync('node', args, { cwd: process.cwd(), encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

describe('pack-check.mjs', () => {
  it('passes valid quiz and word packs, and passes with no packs at all', () => {
    expect(run({ 'q.json': quizPack(), 'w.json': wordPack() }).code).toBe(0);
    expect(run({}).code).toBe(0);
  });
  it('fails on schema violations, bad JSON, unknown shape and semantic errors', () => {
    const bad = quizPack({ questions: [question(1, { answer: 7 as never, source: '' })] });
    const r = run({ 'q.json': bad });
    expect(r.code).toBe(1);
    expect(r.out).toContain('answer');
    expect(run({ 'x.json': '{nope' }).out).toContain('not valid JSON');
    expect(run({ 'x.json': { hello: 1 } }).code).toBe(1);
    expect(run({ 'q.json': quizPack({ questions: [question(1), question(1)] }) }).out).toContain(
      'duplicate',
    );
    expect(run({ 'w.json': wordPack({ words: [{ word: 'badword' }] }) }).out).toContain(
      'blocklist',
    );
    expect(run({ 'w.json': wordPack({ words: [{ word: 'ab' }, { word: 'AB' }] }) }).out).toContain(
      'duplicate word',
    );
  });
  it('release mode fails while anything is unreviewed and prints the count', () => {
    const pack = quizPack({ questions: [question(1, { reviewed: false }), question(2)] });
    expect(run({ 'q.json': pack }).code).toBe(0);
    const r = run({ 'q.json': pack }, true);
    expect(r.code).toBe(1);
    expect(r.out).toContain('1 item(s)');
    expect(run({ 'q.json': quizPack() }, true).code).toBe(0);
  });
  it('agrees with the TypeScript validators on a set of fixtures', () => {
    const cases: Array<[unknown, boolean, 'quiz' | 'word']> = [
      [quizPack(), true, 'quiz'],
      [quizPack({ lang: 'xx' }), false, 'quiz'],
      [quizPack({ questions: [question(1, { options: ['a', 'a', 'b', 'c'] })] }), false, 'quiz'],
      [quizPack({ questions: [question(1, { tags: [''] as never })] }), false, 'quiz'],
      [wordPack(), true, 'word'],
      [wordPack({ theme: 'No Good' }), false, 'word'],
      [wordPack({ words: [{ word: 'x1' }] }), false, 'word'],
    ];
    for (const [pack, ok, kind] of cases) {
      const ts = (kind === 'quiz' ? validateQuizPack(pack) : validateWordPack(pack)).ok;
      expect(ts).toBe(ok);
      expect(run({ 'p.json': pack }).code === 0).toBe(ok);
    }
  });
});
