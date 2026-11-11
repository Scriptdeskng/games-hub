import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { featuresFixture, kirijiOneBundle } from '../packages/core/src/content/story/fixtures';
import { runContentCheck } from './content-gate';

const tmps: string[] = [];
afterEach(() => tmps.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

type Bundle = ReturnType<typeof kirijiOneBundle>;
interface Opts {
  mutate?: (b: Bundle) => void;
  extra?: Record<string, unknown | string>;
  features?: unknown;
  noContent?: boolean;
}
/** A throw-away repo root holding the Kiriji 1 skeleton under games/akoni-dike/content. */
function repo(o: Opts = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
  tmps.push(root);
  const game = path.join(root, 'games/akoni-dike');
  fs.mkdirSync(game, { recursive: true });
  if (o.noContent) return root;
  const b = kirijiOneBundle();
  o.mutate?.(b);
  const put = (rel: string, body: unknown): void => {
    const f = path.join(game, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof body === 'string' ? body : JSON.stringify(body));
  };
  put('content/chapters/kiriji-1.json', b.chapters[0]);
  put('content/dialogue/kiriji-1.json', b.dialogue[0]);
  put('content/learning/kiriji-1.json', b.learning[0]);
  put('content/glossary/kiriji.json', b.glossary[0]);
  put('features.json', o.features ?? featuresFixture());
  for (const [k, v] of Object.entries(o.extra ?? {})) put(k, v);
  return root;
}
const reviewAll = (b: Bundle): void => {
  const ok = (x: { reviewed: boolean; reviewedBy: string }): void => {
    x.reviewed = true;
    x.reviewedBy = 'Dr A. Historian';
  };
  b.chapters.forEach(ok);
  b.learning.forEach((p) =>
    [...p.facts, ...p.sources, ...p.twoSides, ...p.pins, ...p.checks].forEach(ok),
  );
  b.glossary.forEach((g) => g.terms.forEach(ok));
};
const text = (r: { lines: string[] }): string => r.lines.join('\n');

describe('runContentCheck', () => {
  it('is a clear no-op when games/akoni-dike/content does not exist', () => {
    const r = runContentCheck(repo({ noContent: true }), { release: true });
    expect(r.code).toBe(0);
    expect(text(r)).toContain('not found, nothing to check');
  });
  it('passes the skeleton in a dev/preview build and reports the unreviewed count', () => {
    const r = runContentCheck(repo(), { release: false });
    expect(r.code).toBe(0);
    expect(text(r)).toContain('13 with reviewed:false');
    expect(text(r)).toContain('dev/preview build');
  });
  it('FAILS the same content in a release build', () => {
    const r = runContentCheck(repo(), { release: true });
    expect(r.code).toBe(1);
    expect(text(r)).toContain('RELEASE GATE FAILED');
  });
  it('a release build passes once every item is reviewed', () => {
    const r = runContentCheck(repo({ mutate: reviewAll }), { release: true });
    expect(r.code).toBe(0);
    expect(text(r)).toContain('release gate passed');
  });
  it('reports invalid JSON, invalid documents and wrong folders', () => {
    const bad = runContentCheck(repo({ extra: { 'content/dialogue/x.json': '{nope' } }), {
      release: false,
    });
    expect(bad.code).toBe(1);
    expect(text(bad)).toContain('not valid JSON');
    const wrong = runContentCheck(
      repo({ extra: { 'content/dialogue/glossary.json': kirijiOneBundle().glossary[0] } }),
      { release: false },
    );
    expect(wrong.code).toBe(1);
    expect(text(wrong)).toContain('kind');
  });
  it('fails on a guardrail violation, with the file location', () => {
    const r = runContentCheck(
      repo({ mutate: (b) => (b.learning[0]!.facts[0]!.text.en = 'A skull on the road.') }),
      { release: false },
    );
    expect(r.code).toBe(1);
    expect(text(r)).toContain('[guardrail/skull] kiriji-1-learning.facts[0]');
  });
  it('fails on a broken cross-reference', () => {
    const r = runContentCheck(
      repo({ mutate: (b) => b.dialogue[0]!.scenes[1]!.lines[1]!.glossary!.push('nope') }),
      { release: false },
    );
    expect(r.code).toBe(1);
    expect(text(r)).toContain('xref/glossary');
  });
  it('merges content/guardrails.json over the defaults (and rejects a broken one)', () => {
    const rule = { id: 'banned', severity: 'error', patterns: ['\\bajele\\b'], message: 'custom' };
    const custom = runContentCheck(
      repo({ extra: { 'content/guardrails.json': { version: 1, rules: [rule] } } }),
      { release: false },
    );
    expect(custom.code).toBe(1);
    expect(text(custom)).toContain('guardrail/banned');
    const broken = runContentCheck(repo({ extra: { 'content/guardrails.json': { version: 9 } } }), {
      release: false,
    });
    expect(text(broken)).toContain('guardrails.json: version');
  });
  it('uses the default flags when features.json is missing, and rejects a broken one', () => {
    const root = repo();
    fs.rmSync(path.join(root, 'games/akoni-dike/features.json'));
    expect(text(runContentCheck(root, { release: false }))).toContain('features.json missing');
    const broken = runContentCheck(
      repo({ features: { version: 1, features: { moremiPrologue: 'off' } } }),
      {
        release: false,
      },
    );
    expect(broken.code).toBe(1);
    expect(text(broken)).toContain('features.json');
  });
  it('keeps the Moremi prologue behind featureFlag moremiPrologue (default off)', () => {
    const root = repo();
    const m = structuredClone(kirijiOneBundle().chapters[0]!);
    m.id = 'moremi-prologue';
    m.campaign = 'moremi-prologue';
    m.order = 0;
    m.content = { scenes: [], facts: [], sources: [], twoSides: [], pins: [], checks: [] };
    const f = path.join(root, 'games/akoni-dike/content/chapters/moremi.json');
    fs.writeFileSync(f, JSON.stringify(m));
    expect(text(runContentCheck(root, { release: false }))).toContain(
      'must set featureFlag "moremiPrologue"',
    );
    m.featureFlag = 'moremiPrologue';
    fs.writeFileSync(f, JSON.stringify(m));
    expect(runContentCheck(root, { release: false }).code).toBe(0);
  });
  it('cross-checks chapter packs with packs.json when it is given', () => {
    const mutate = (b: Bundle): void => {
      b.chapters[0]!.delivery = 'pack';
      b.chapters[0]!.pack = 'ch02';
      b.chapters[0]!.packBudgetKb = 900;
    };
    const missing = runContentCheck(repo({ mutate }), { release: false, declaredPacks: [] });
    expect(text(missing)).toContain('pack ch02 is not declared in packs.json');
    expect(missing.code).toBe(1);
    const extra = runContentCheck(repo({ mutate }), {
      release: false,
      declaredPacks: ['ch02', 'ch03'],
    });
    expect(extra.code).toBe(0);
    expect(text(extra)).toContain('declares ch03 but no chapter uses it');
  });
});

function run(script: string, root: string, env: Record<string, string> = {}, args: string[] = []) {
  const r = spawnSync('node', [script, '--root', root, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, NAIJA_RELEASE: '', ...env },
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

describe('npm scripts: content:check and content:release-check', () => {
  it('content-check is a no-op without content, and tolerant in dev/preview mode', () => {
    expect(run('scripts/content-check.mjs', repo({ noContent: true })).out).toContain(
      'nothing to check',
    );
    expect(run('scripts/content-check.mjs', repo()).code).toBe(0);
  }, 30_000);
  it('NAIJA_RELEASE=1 and --release turn content-check into the release gate', () => {
    const root = repo();
    for (const [env, args] of [
      [{ NAIJA_RELEASE: '1' }, []],
      [{}, ['--release']],
    ] as const) {
      const r = run('scripts/content-check.mjs', root, { ...env }, [...args]);
      expect(r.code).toBe(1);
      expect(r.out).toContain('RELEASE GATE FAILED');
    }
    expect(run('scripts/content-check.mjs', root, { NAIJA_RELEASE: '0' }).code).toBe(0);
  }, 30_000);
  it('a mistyped NAIJA_RELEASE fails instead of silently allowing unreviewed content', () => {
    const r = run('scripts/content-check.mjs', repo(), { NAIJA_RELEASE: 'ture' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('NAIJA_RELEASE must be 1 or 0');
  }, 30_000);
  it('content-release-check always gates, with or without the env flag', () => {
    const r = run('scripts/content-release-check.mjs', repo(), { NAIJA_RELEASE: '0' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('RELEASE GATE FAILED');
    const ok = run('scripts/content-release-check.mjs', repo({ mutate: reviewAll }));
    expect(ok.code).toBe(0);
    expect(ok.out).toContain('release gate passed');
    expect(run('scripts/content-release-check.mjs', repo({ noContent: true })).code).toBe(0);
  }, 30_000);
  it('the real repo has no content yet, so both scripts are a clear no-op', () => {
    const r = spawnSync('node', ['scripts/content-release-check.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('nothing to check');
  }, 30_000);
});
