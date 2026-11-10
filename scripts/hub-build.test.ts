import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPortal } from '../packages/core/src/portal';
import { createStorage } from '../packages/core/src/storage';

interface HubSource {
  games: Record<string, unknown>[];
  en: Record<string, unknown>;
  pcm: Record<string, unknown>;
}
interface HubLib {
  hubSlugs(root: string): string[];
  loadHubSource(root: string): HubSource;
  validateHub(root: string, slugs: string[], src?: HubSource): string[];
  assembleHub(o: { root: string; dist: string; outDir: string; slugs: string[] }): {
    problems: string[];
  };
  scanOutput(dir: string): string[];
  renderHeaders(slugs: string[], outDir: string): string;
  sizeReport(
    dir: string,
    slugs: string[],
  ): { hub: { gzip: number }; games: Record<string, { gzip: number }> };
  HUB_LIMIT: number;
  GAME_LIMIT: number;
}
const root = process.cwd();
const libPath = path.join(root, 'scripts/hub-lib.mjs');
const lib = (await import(/* @vite-ignore */ libPath)) as HubLib;
const slugs = lib.hubSlugs(root);

const tmps: string[] = [];
const tmp = (): string => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-'));
  tmps.push(d);
  return d;
};
afterEach(() => tmps.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

/** A fake `dist/` with the files assembleHub requires, so the test does not need a real build. */
function fakeDist(): string {
  const d = tmp();
  for (const s of slugs) {
    fs.mkdirSync(path.join(d, s, 'chunks'), { recursive: true });
    fs.mkdirSync(path.join(d, s, 'assets/packs'), { recursive: true });
    fs.writeFileSync(path.join(d, s, 'index.html'), '<div id="app"></div>');
    fs.writeFileSync(path.join(d, s, 'sw.js'), '// game sw');
    fs.writeFileSync(path.join(d, s, 'chunks/index-abc.js'), 'export{}');
    fs.writeFileSync(path.join(d, s, 'assets/packs/p.json'), '{}');
  }
  return d;
}
const assemble = (dist = fakeDist()) => {
  const outDir = tmp();
  const r = lib.assembleHub({ root, dist, outDir, slugs });
  return { outDir, ...r };
};

describe('hub slugs and games.json', () => {
  it('are exactly the deploy:true games, never the template', () => {
    expect(slugs).toEqual([
      'snakes-ladders',
      'naija-ludo',
      'ayo-olopon',
      'naija-whot',
      'sabi-quiz',
      'sabi-words',
      'draughts-naija',
    ]);
    expect(slugs.some((s) => s.startsWith('_'))).toBe(false);
  });
  it('validate against the registry', () => {
    expect(lib.validateHub(root, slugs)).toEqual([]);
  });
  it('reject a missing game, an unknown game, a bad category and a missing thumb', () => {
    const src = lib.loadHubSource(root);
    const missing = { ...src, games: src.games.slice(1) };
    expect(lib.validateHub(root, slugs, missing).join()).toMatch(/snakes-ladders.*not in hub/);
    const extra = { ...src, games: [...src.games, { ...src.games[0], slug: '_template' }] };
    expect(lib.validateHub(root, slugs, extra).join()).toMatch(/_template/);
    const bad = structuredClone(src);
    bad.games[0]!.category = 'gambling';
    bad.games[1]!.thumb = 'games/naija-ludo/assets/thumb/nope.svg';
    const msg = lib.validateHub(root, slugs, bad).join('\n');
    expect(msg).toMatch(/category must be one of/);
    expect(msg).toMatch(/thumb file not found/);
  });
  it('reject a Pidgin line with different placeholders, a key mismatch and cache-prefix clashes', () => {
    const src = structuredClone(lib.loadHubSource(root));
    src.pcm['hub.playAria'] = 'Play am';
    delete src.pcm['hub.list'];
    const msg = lib.validateHub(root, slugs, src).join('\n');
    expect(msg).toMatch(/placeholders differ/);
    expect(msg).toMatch(/keys differ/);
    expect(lib.validateHub(root, [...slugs, 'sabi'], lib.loadHubSource(root)).join()).toMatch(
      /prefixes collide/,
    );
  });
});

describe('assembleHub', () => {
  it('puts the hub at the root and each game at /<slug>/ with relative assets intact', () => {
    const { outDir, problems } = assemble();
    expect(problems).toEqual([]);
    for (const s of slugs) {
      expect(fs.existsSync(path.join(outDir, s, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, s, 'chunks/index-abc.js'))).toBe(true);
    }
    expect(fs.existsSync(path.join(outDir, '_template'))).toBe(false);
    const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
    expect(html.match(/class="card"/g)).toHaveLength(slugs.length);
    for (const s of slugs) expect(html).toContain(`href="./${s}/"`);
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/); // no external origins
    const cssFile = fs.readdirSync(path.join(outDir, 'assets')).find((f) => f.endsWith('.css'))!;
    const css = fs.readFileSync(path.join(outDir, 'assets', cssFile), 'utf8');
    expect(css).not.toContain('@asset(');
    expect(fs.existsSync(path.join(outDir, '404.html'))).toBe(true);
  });

  it('the hub worker caches only the hub shell and leaves every game to its own worker', () => {
    const { outDir } = assemble();
    const src = fs.readFileSync(path.join(outDir, 'sw.js'), 'utf8');
    expect(src).not.toMatch(/__\w+__/);
    for (const s of slugs) expect(src).not.toContain(`/${s}/`);
    const handlers: Record<string, (e: unknown) => void> = {};
    const sandbox = {
      self: {
        addEventListener: (t: string, f: (e: unknown) => void) => (handlers[t] = f),
        location: { origin: 'https://hub.test', href: 'https://hub.test/sw.js' },
      },
      caches: { open: async () => ({ match: async () => 'cached' }) },
      fetch: vi.fn(),
      URL,
      Set,
      Promise,
    };
    vm.runInNewContext(src, sandbox);
    const ask = (url: string) => {
      let responded = false;
      handlers.fetch!({
        request: { url, method: 'GET', mode: 'navigate' },
        respondWith: () => (responded = true),
      });
      return responded;
    };
    expect(ask('https://hub.test/')).toBe(true);
    expect(ask('https://hub.test/?lang=pcm')).toBe(true);
    expect(ask('https://hub.test/index.html')).toBe(true);
    expect(ask('https://hub.test/snakes-ladders/')).toBe(false);
    expect(ask('https://hub.test/sabi-quiz/assets/packs/sabi-core-en.json')).toBe(false);
    expect(ask('https://hub.test/404.html')).toBe(false);
    expect(ask('https://other.test/')).toBe(false);
  });

  it('refuses to build when a game build is missing', () => {
    const dist = fakeDist();
    fs.rmSync(path.join(dist, 'sabi-quiz/sw.js'));
    expect(assemble(dist).problems.join()).toMatch(/sabi-quiz.*missing/);
  });
});

describe('_headers', () => {
  const blocks = (txt: string): Map<string, Record<string, string>> => {
    const m = new Map<string, Record<string, string>>();
    let cur: Record<string, string> = {};
    for (const line of txt.split('\n')) {
      if (!line.trim()) continue;
      if (!line.startsWith(' ')) m.set(line, (cur = {}));
      else cur[line.slice(0, line.indexOf(':')).trim()] = line.slice(line.indexOf(':') + 1).trim();
    }
    return m;
  };
  let outDir = '';
  let txt = '';
  let b = new Map<string, Record<string, string>>();
  beforeAll(() => {
    outDir = assemble().outDir;
    tmps.splice(0); // keep this folder for the whole describe block
    txt = fs.readFileSync(path.join(outDir, '_headers'), 'utf8');
    b = blocks(txt);
  });
  afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }));

  it('sets the security headers once, with a CSP that has no external origin', () => {
    const all = b.get('/*')!;
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['Referrer-Policy']).toBe('no-referrer');
    expect(all['Permissions-Policy']).toContain('camera=()');
    const csp = all['Content-Security-Policy']!;
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'self' https://m.gamesplash.com.ng");
    expect(csp).not.toMatch(/https?:\/\/(?!m\.gamesplash\.com\.ng)/);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(txt).not.toMatch(/X-Frame-Options/i);
  });
  it('revalidates sw.js, index.html and packs; hashed chunks and hub assets are immutable', () => {
    const reval = 'public, max-age=0, must-revalidate';
    for (const p of ['/', '/index.html', '/sw.js', '/404.html']) {
      expect(b.get(p)!['Cache-Control']).toBe(reval);
    }
    expect(b.get('/assets/*')!['Cache-Control']).toContain('immutable');
    for (const s of slugs) {
      expect(b.get(`/${s}/sw.js`)!['Cache-Control']).toBe(reval);
      expect(b.get(`/${s}/index.html`)!['Cache-Control']).toBe(reval);
      expect(b.get(`/${s}/assets/packs/*`)!['Cache-Control']).toBe(reval);
      expect(b.get(`/${s}/chunks/*`)!['Cache-Control']).toContain('immutable');
    }
  });
  it('never has two Cache-Control rules matching the same path (hosts would merge them)', () => {
    const rules = [...b.entries()].filter(([, h]) => h['Cache-Control']);
    const re = (p: string) =>
      new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    const probes = ['/', '/index.html', '/sw.js', '/404.html', '/assets/x.js'];
    for (const s of slugs) {
      probes.push(
        `/${s}/`,
        `/${s}/index.html`,
        `/${s}/sw.js`,
        `/${s}/chunks/a.js`,
        `/${s}/assets/packs/p.json`,
        `/${s}/assets/a/b.svg`,
      );
    }
    for (const p of probes) {
      expect(rules.filter(([pat]) => re(pat).test(p)).length, p).toBeLessThanOrEqual(1);
    }
    expect(b.size).toBeLessThan(100); // Cloudflare Pages limit
  });
  it('adds MIME rules only when .mjs / .webmanifest files exist', () => {
    expect(txt).not.toContain('.mjs');
    fs.writeFileSync(path.join(outDir, 'x.mjs'), '');
    fs.writeFileSync(path.join(outDir, 'a.webmanifest'), '{}');
    const t2 = lib.renderHeaders(slugs, outDir);
    expect(t2).toContain('/*.mjs');
    expect(t2).toContain('application/manifest+json');
  });
});

describe('safety scan and prod gate', () => {
  it('a clean assembly passes both', () => {
    const { outDir } = assemble();
    expect(lib.scanOutput(outDir)).toEqual([]);
    expect(spawnSync('node', ['scripts/prod-gate.mjs', outDir], { cwd: root }).status).toBe(0);
  });
  it.each([
    ['a source map', 'snakes-ladders/chunks/a.js.map', '{}'],
    ['a test hook', 'naija-ludo/chunks/x.js', 'window.__naijaTest={}'],
    ['autoplay', 'naija-ludo/chunks/x.js', 'var a={autoplay(){}}'],
    ['a tempo param', 'ayo-olopon/chunks/x.js', 'new URLSearchParams(s).get("tempo")'],
    ['a clock param', 'sabi-quiz/chunks/x.js', 'location.search.includes("?clock=")'],
    ['a pack param', 'sabi-words/chunks/x.js', 'q.get("pack")'],
    ['a sourcemap link', 'naija-whot/chunks/x.js', '//# sourceMappingURL=x.js.map'],
    ['an env file', '.env', 'KEY=1'],
    ['a qa report', 'docs/qa/x-report.md', 'PASS'],
    ['the template', '_template/index.html', 'x'],
    ['a tmp file', 'tmp/a.txt', 'x'],
  ])('both reject %s', (_n, file, body) => {
    const { outDir } = assemble();
    fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
    fs.writeFileSync(path.join(outDir, file), body);
    expect(lib.scanOutput(outDir).length).toBeGreaterThan(0);
    // the gate checks what lives in the code (hooks, params, maps); folders are the scan's job
    if (/\.(js|map)$/.test(file)) {
      expect(spawnSync('node', ['scripts/prod-gate.mjs', outDir], { cwd: root }).status).toBe(1);
    }
  });
});

describe('size budget', () => {
  it('the hub shell is far below 40 KB gzip with the real art', () => {
    const { outDir } = assemble();
    const rep = lib.sizeReport(outDir, slugs);
    expect(rep.hub.gzip).toBeLessThan(lib.HUB_LIMIT);
    for (const s of slugs) expect(rep.games[s]!.gzip).toBeLessThan(lib.GAME_LIMIT);
  });
});

describe('opened directly (no ?portal): progress stays on the phone', () => {
  const setup = (search: string) => {
    const fetchFn = vi.fn();
    const storage = createStorage('hubtest');
    const portal = createPortal({ game: 'hubtest', storage, search, fetchFn });
    return { fetchFn, storage, portal };
  };
  afterEach(() => localStorage.clear());

  it('saves and loads through localStorage and never calls the network', async () => {
    const { fetchFn, portal } = setup('');
    await portal.saveProgress({ level: 3 });
    expect(localStorage.getItem('naija:hubtest:progress')).toBe(JSON.stringify({ level: 3 }));
    expect(await portal.loadProgress({ level: 0 })).toEqual({ level: 3 });
    expect(portal.params.portalOrigin).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('ignores a token without a portal, and a portal that is not the allowed origin', async () => {
    for (const q of ['?token=abc', '?token=abc&portal=https://evil.example']) {
      const { fetchFn, portal } = setup(q);
      await portal.saveProgress({ ok: 1 });
      await portal.loadProgress({});
      expect(portal.params.portalOrigin).toBeNull();
      expect(fetchFn).not.toHaveBeenCalled();
      expect(JSON.stringify({ ...localStorage })).not.toContain('abc');
      localStorage.clear();
    }
  });
});

describe('vercel.json mirrors the generated _headers', () => {
  it('uses the same CSP and builds the same folder', () => {
    const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
    const csp = v.headers[0].headers.find(
      (h: { key: string }) => h.key === 'Content-Security-Policy',
    ).value;
    expect(csp).toBe((lib as unknown as { CSP_POLICY: string }).CSP_POLICY);
    expect(v.outputDirectory).toBe('dist-hub');
    expect(v.trailingSlash).toBe(true); // /slug must become /slug/ or the games' ./chunks paths break
    expect(fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8')).toContain(
      'publish = "dist-hub"',
    );
  });
});
