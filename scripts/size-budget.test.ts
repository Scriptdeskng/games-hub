import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface Row {
  file: string;
  gzip: number;
}
interface Manifest {
  ok: boolean;
  manifest?: { packs: Array<{ id: string; dir: string; budgetKb?: number }> } | null;
  missing?: boolean;
  error?: string;
}
interface Evaluation {
  total: number;
  initial: number;
  packs: Array<{ id: string; gzip: number; limit: number }>;
  coreGz: number;
  problems: string[];
  warnings: string[];
  packGame: boolean;
}
interface SizeLib {
  evaluateGame(o: { slug: string; rows: Row[]; manifest: Manifest }): Evaluation;
  readPackManifest(root: string, slug: string): Manifest;
  PACK_GAMES: string[];
}
const lib = (await import(
  /* @vite-ignore */ path.join(process.cwd(), 'scripts/size-lib.mjs')
)) as SizeLib;

const KB = 1024;
const MB = 1024 * KB;
const row = (file: string, gzip: number): Row => ({ file, gzip });
const core = row('chunks/core-abc.js', 25 * KB);
const none: Manifest = { ok: true, manifest: null, missing: true };
const declare = (...packs: Array<{ id: string; budgetKb?: number }>): Manifest => ({
  ok: true,
  manifest: { packs: packs.map((p) => ({ ...p, dir: `packs/${p.id}` })) },
  missing: false,
});
const akoni = (rows: Row[], manifest: Manifest): Evaluation =>
  lib.evaluateGame({ slug: 'akoni-dike', rows, manifest });

describe('size rules: akoni-dike (3 MB initial + 1 MB per declared chapter pack)', () => {
  it('passes with a 0.9 MB pack, and the whole game may exceed 3 MB', () => {
    const r = akoni(
      [core, row('chunks/app.js', 1 * MB), row('packs/ch02/pack.json', 0.9 * MB)],
      declare({ id: 'ch02' }),
    );
    expect(r.problems).toEqual([]);
    expect(r.packs[0]).toMatchObject({ id: 'ch02', limit: MB });
    const big = akoni(
      [
        core,
        row('chunks/app.js', 2.9 * MB),
        row('packs/ch02/a.json', 0.99 * MB),
        row('packs/ch03/a.json', 0.99 * MB),
      ],
      declare({ id: 'ch02' }, { id: 'ch03' }),
    );
    expect(big.problems).toEqual([]);
    expect(big.total).toBeGreaterThan(4.5 * MB);
    expect(big.initial).toBeLessThan(3 * MB);
  });
  it('fails with a 1.2 MB pack', () => {
    const r = akoni(
      [core, row('chunks/app.js', 1 * MB), row('packs/ch02/pack.json', 1.2 * MB)],
      declare({ id: 'ch02' }),
    );
    expect(r.problems.join('|')).toMatch(/pack ch02 .* > 1024 KB/);
  });
  it('fails when the initial download is over 3 MB, whatever the packs hold', () => {
    const r = akoni(
      [core, row('chunks/app.js', 3.1 * MB), row('packs/ch02/pack.json', 0.1 * MB)],
      declare({ id: 'ch02' }),
    );
    expect(r.problems.join('|')).toContain('initial download');
    expect(r.initial).toBeGreaterThan(3 * MB);
  });
  it('a manifest budgetKb can only LOWER a pack cap, never raise it', () => {
    const low = akoni(
      [core, row('packs/ch02/p.json', 0.6 * MB)],
      declare({ id: 'ch02', budgetKb: 500 }),
    );
    expect(low.problems.join('|')).toContain('pack ch02');
    const m = {
      packs: [{ id: 'ch02', dir: 'packs/ch02', budgetKb: 2000 }],
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-'));
    tmps.push(dir);
    fs.mkdirSync(path.join(dir, 'games/akoni-dike'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'games/akoni-dike/packs.json'),
      JSON.stringify({ version: 1, ...m }),
    );
    const read = lib.readPackManifest(dir, 'akoni-dike');
    expect(read.ok).toBe(false);
    expect(read.error).toContain('budgetKb');
  });
  it('files under packs/ that no manifest entry declares count as INITIAL', () => {
    const r = akoni(
      [core, row('chunks/app.js', 2 * MB), row('packs/ch09/x.json', 1.5 * MB)],
      declare({ id: 'ch02' }),
    );
    expect(r.initial).toBeGreaterThan(3 * MB);
    expect(r.problems.join('|')).toContain('initial download');
    expect(r.problems.join('|')).toContain('declared pack ch02 has no files');
  });
  it('a missing manifest is handled: everything counts as initial, with a warning', () => {
    const small = akoni([core, row('packs/ch02/a.json', 0.5 * MB)], none);
    expect(small.problems).toEqual([]);
    expect(small.warnings.join('|')).toContain('no games/akoni-dike/packs.json');
    expect(small.initial).toBe(small.total);
    const big = akoni(
      [core, row('chunks/app.js', 2 * MB), row('packs/ch02/a.json', 1.5 * MB)],
      none,
    );
    expect(big.problems.join('|')).toContain('initial download');
  });
  it('a broken manifest fails with its message', () => {
    const r = akoni([core], { ok: false, error: 'packs.json is not valid JSON (x)' });
    expect(r.problems).toEqual(['packs.json is not valid JSON (x)']);
  });
  it('core stays <= 60 KB even for akoni-dike', () => {
    const r = akoni([row('chunks/core-x.js', 61 * KB)], declare());
    expect(r.problems.join('|')).toContain('core');
  });
  it('is the only pack game', () => {
    expect(lib.PACK_GAMES).toEqual(['akoni-dike']);
  });
});

describe('size rules: every other game keeps the plain 3 MB total', () => {
  const other = (rows: Row[], manifest: Manifest = none): Evaluation =>
    lib.evaluateGame({ slug: 'danfo-dash', rows, manifest });
  it('a "packs" directory counts fully toward the 3 MB', () => {
    const r = other([core, row('chunks/app.js', 2.2 * MB), row('packs/ch02/pack.json', 0.9 * MB)]);
    expect(r.problems.join('|')).toContain('game total');
    expect(r.packGame).toBe(false);
    expect(r.initial).toBe(r.total);
    expect(
      other([core, row('chunks/app.js', 1 * MB), row('packs/ch02/p.json', 0.9 * MB)]).problems,
    ).toEqual([]);
  });
  it('declaring packs.json does not help: it is itself a failure', () => {
    const r = other([core, row('chunks/app.js', 1 * MB)], declare({ id: 'ch02' }));
    expect(r.problems.join('|')).toContain('only akoni-dike may declare chapter packs');
  });
  it('3 MB plus one byte still fails, core 60 KB plus one still fails, 1.5 MB target warns', () => {
    expect(other([row('a.js', 3 * MB + 1)]).problems.join('|')).toContain('game total');
    expect(other([row('chunks/core-a.js', 60 * KB + 1)]).problems.join('|')).toContain('core');
    expect(other([core, row('a.js', 1.6 * MB)]).warnings.join('|')).toContain('1.5 MB target');
    expect(other([row('a.js', 10 * KB)]).warnings.join('|')).toContain('no core-*.js');
  });
});

describe('readPackManifest', () => {
  const read = (body: string | null): Manifest => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    tmps.push(dir);
    if (body !== null) {
      fs.mkdirSync(path.join(dir, 'games/akoni-dike'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'games/akoni-dike/packs.json'), body);
    }
    return lib.readPackManifest(dir, 'akoni-dike');
  };
  it('missing file is not an error', () => {
    expect(read(null)).toMatchObject({ ok: true, missing: true, manifest: null });
  });
  it('the manifest shipped in the repo is valid and declares no pack yet', () => {
    const m = lib.readPackManifest(process.cwd(), 'akoni-dike');
    expect(m).toMatchObject({ ok: true, missing: false });
    expect(m.manifest?.packs).toEqual([]);
  });
  it.each([
    ['not JSON', '{nope', 'not valid JSON'],
    ['null', 'null', 'version'],
    ['version', '{"version":2,"packs":[]}', 'version'],
    ['packs type', '{"version":1,"packs":{}}', 'array'],
    ['pack type', '{"version":1,"packs":[1]}', 'object'],
    ['unknown field', '{"version":1,"packs":[{"id":"ch02","dir":"packs/ch02","x":1}]}', 'unknown'],
    ['id', '{"version":1,"packs":[{"id":"two","dir":"packs/two"}]}', 'ch02'],
    ['dir', '{"version":1,"packs":[{"id":"ch02","dir":"assets/ch02"}]}', 'dir'],
    ['dir traversal', '{"version":1,"packs":[{"id":"ch02","dir":"packs/../ch02"}]}', 'dir'],
    ['budget', '{"version":1,"packs":[{"id":"ch02","dir":"packs/ch02","budgetKb":0}]}', 'budgetKb'],
    [
      'budget raise',
      '{"version":1,"packs":[{"id":"ch02","dir":"packs/ch02","budgetKb":1025}]}',
      'budgetKb',
    ],
    [
      'duplicate',
      '{"version":1,"packs":[{"id":"ch02","dir":"packs/ch02"},{"id":"ch02","dir":"packs/ch02"}]}',
      'twice',
    ],
  ])('rejects %s', (_n, body, msg) => {
    const r = read(body);
    expect(r.ok).toBe(false);
    expect(r.error).toContain(msg);
  });
  it('accepts a good manifest', () => {
    const r = read('{"version":1,"packs":[{"id":"ch02","dir":"packs/ch02","budgetKb":900}]}');
    expect(r.ok).toBe(true);
  });
});

/** End to end through scripts/size-budget.mjs with real (incompressible) bytes. */
const tmps: string[] = [];
afterEach(() => tmps.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function runBudget(
  files: Record<string, number>,
  slug: string,
  manifest?: object,
): { code: number | null; out: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'size-'));
  tmps.push(root);
  const dist = path.join(root, 'dist');
  for (const [name, bytes] of Object.entries(files)) {
    const f = path.join(dist, slug, name);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, randomBytes(bytes));
  }
  if (manifest) {
    fs.mkdirSync(path.join(root, 'games', slug), { recursive: true });
    fs.writeFileSync(path.join(root, 'games', slug, 'packs.json'), JSON.stringify(manifest));
  }
  const r = spawnSync('node', ['scripts/size-budget.mjs', dist, '--root', root], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
}
const decl = { version: 1, packs: [{ id: 'ch02', dir: 'packs/ch02' }] };

describe('scripts/size-budget.mjs (real files)', () => {
  it('akoni-dike: 0.9 MB pack passes', () => {
    const r = runBudget(
      { 'index.html': 2000, 'packs/ch02/pack.bin': 0.9 * MB },
      'akoni-dike',
      decl,
    );
    expect(r.out).toContain('pack ch02');
    expect(r.code).toBe(0);
  }, 60_000);
  it('akoni-dike: 1.2 MB pack fails', () => {
    const r = runBudget(
      { 'index.html': 2000, 'packs/ch02/pack.bin': 1.2 * MB },
      'akoni-dike',
      decl,
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain('FAIL: pack ch02');
  }, 60_000);
  it('akoni-dike: missing manifest is handled (counts as initial)', () => {
    const r = runBudget({ 'index.html': 2000, 'packs/ch02/pack.bin': 5000 }, 'akoni-dike');
    expect(r.code).toBe(0);
    expect(r.out).toContain('no games/akoni-dike/packs.json');
  });
  it('another game with a packs directory is measured as one 3 MB total', () => {
    const r = runBudget({ 'index.html': 2000, 'packs/ch02/pack.bin': 5000 }, 'danfo-dash');
    expect(r.code).toBe(0);
    expect(r.out).toContain('game total');
    expect(r.out).not.toContain('initial (gzip)');
  });
});
