// Pure-ish helpers for scripts/build-hub.mjs (kept separate so tests can import them).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const HUB_RESERVED = ['assets', 'art', 'hub', 'index', '404', 'sw', '_headers', 'chunks'];
export const MB = 1024 * 1024;
export const GAME_LIMIT = 3 * MB;
export const HUB_LIMIT = 40 * 1024;
export const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const CATEGORIES = ['board', 'cards', 'quiz', 'words'];

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const rel = (base, f) => path.relative(base, f).split(path.sep).join('/');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const hash = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8);
export const gzipSize = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const text = (v) => (typeof v === 'string' ? v : v?.text);
const params = (s) =>
  [...String(s).matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

/** Games that go on the hub: `deploy: true` in the registry, never the template. */
export function hubSlugs(root) {
  return readJson(path.join(root, 'games/registry.json'))
    .games.filter((g) => g.deploy && !g.slug.startsWith('_'))
    .map((g) => g.slug);
}

export function loadHubSource(root) {
  return {
    games: readJson(path.join(root, 'hub/games.json')).games,
    en: readJson(path.join(root, 'hub/i18n/en.json')),
    pcm: readJson(path.join(root, 'hub/i18n/pcm.json')),
  };
}

/** Returns a list of problems (empty = valid). */
export function validateHub(root, slugs, src = loadHubSource(root)) {
  const bad = [];
  const seen = new Set();
  for (const g of src.games) {
    const id = g.slug ?? '(no slug)';
    if (seen.has(g.slug)) bad.push(`${id}: listed twice`);
    seen.add(g.slug);
    if (!SLUG_RE.test(g.slug ?? '')) bad.push(`${id}: invalid slug`);
    if (g.slug && !slugs.includes(g.slug))
      bad.push(`${id}: not a deploy:true game in the registry`);
    if (HUB_RESERVED.includes(g.slug)) bad.push(`${id}: slug collides with a hub path`);
    for (const f of ['title', 'description']) {
      for (const l of ['en', 'pcm']) {
        if (typeof g[f]?.[l] !== 'string' || !g[f][l].trim()) bad.push(`${id}: ${f}.${l} missing`);
      }
    }
    if (!CATEGORIES.includes(g.category)) bad.push(`${id}: category must be one of ${CATEGORIES}`);
    const prefix = `games/${g.slug}/assets/`;
    if (!String(g.thumb).startsWith(prefix) || !String(g.thumb).endsWith('.svg')) {
      bad.push(`${id}: thumb must be an .svg under ${prefix}`);
    } else if (!fs.existsSync(path.join(root, g.thumb))) bad.push(`${id}: thumb file not found`);
    for (const r of g._review ?? []) {
      const [f, l] = r.split('.');
      if (!g[f]?.[l]) bad.push(`${id}: _review names unknown line "${r}"`);
    }
  }
  for (const s of slugs)
    if (!seen.has(s)) bad.push(`${s}: deploy:true in registry but not in hub/games.json`);
  // service-worker cache names are `naija-<slug>-`: no slug may be a hyphen-prefix of another
  for (const a of slugs) {
    for (const b of slugs) {
      if (a !== b && b.startsWith(a + '-')) bad.push(`${a} / ${b}: cache name prefixes collide`);
    }
  }
  const ek = Object.keys(src.en).sort().join('|');
  if (ek !== Object.keys(src.pcm).sort().join('|'))
    bad.push('hub i18n: en.json and pcm.json keys differ');
  for (const k of Object.keys(src.en)) {
    const a = text(src.en[k]);
    const b = text(src.pcm[k]);
    if (!a || !b) bad.push(`hub i18n: "${k}" is empty`);
    else if (params(a) !== params(b)) bad.push(`hub i18n: "${k}" placeholders differ`);
  }
  for (const c of CATEGORIES)
    if (!src.en[`hub.cat.${c}`]) bad.push(`hub i18n: hub.cat.${c} missing`);
  return bad;
}

/** Lines in the Pidgin copy that a human still has to check. */
export function reviewLines(src) {
  return [
    ...Object.entries(src.pcm)
      .filter(([, v]) => v && typeof v === 'object' && v._review)
      .map(([k]) => `i18n ${k}`),
    ...src.games.flatMap((g) => (g._review ?? []).map((r) => `${g.slug} ${r}`)),
  ];
}

const flat = (strings) => Object.fromEntries(Object.entries(strings).map(([k, v]) => [k, text(v)]));
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

export function renderPage({ src, files, kind }) {
  const en = flat(src.en);
  const pcm = flat(src.pcm);
  const abs = kind === '404' ? '/' : './';
  const data = {
    strings: { en, pcm },
    games: Object.fromEntries(
      src.games.map((g) => [
        g.slug,
        { title: g.title, description: g.description, category: g.category },
      ]),
    ),
  };
  const t = (k) => esc(en[k]);
  const head = (title) => `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#122055">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<meta name="description" content="${t('hub.tagline')}">
<link rel="icon" type="image/svg+xml" href="${abs}${files.logo}">
<link rel="stylesheet" href="${abs}${files.css}">
</head>`;
  const top = `<div class="band" aria-hidden="true"></div>
<header><div class="wrap">
<div class="brand"><img src="${abs}${files.logo}" width="56" height="56" alt=""><h1 data-t="hub.title">${t('hub.title')}</h1></div>
${
  kind === '404'
    ? ''
    : `<p class="tagline" data-t="hub.tagline">${t('hub.tagline')}</p>
<div class="lang" role="group" aria-labelledby="lang-l"><span id="lang-l" data-t="hub.lang">${t('hub.lang')}</span>
<button type="button" data-lang="en" data-t="hub.lang.en" aria-pressed="true">${t('hub.lang.en')}</button>
<button type="button" data-lang="pcm" data-t="hub.lang.pcm" aria-pressed="false">${t('hub.lang.pcm')}</button></div>`
}
</div></header>`;
  const foot = `<footer><div class="band" aria-hidden="true"></div>${
    kind === '404' ? '' : `<div class="wrap"><p data-t="hub.footer">${t('hub.footer')}</p></div>`
  }</footer>`;
  if (kind === '404') {
    return `${head(`${en['hub.notFound.title']} | ${en['hub.title']}`)}
<body>
${top}
<main><div class="wrap notfound"><h2 data-t="hub.notFound.title">${t('hub.notFound.title')}</h2>
<p data-t="hub.notFound.text">${t('hub.notFound.text')}</p>
<a class="play" href="/" data-t="hub.notFound.back">${t('hub.notFound.back')}</a></div></main>
${foot}
<script type="application/json" id="hub-data">${JSON.stringify({ strings: data.strings, games: {} })}</script>
<script src="/${files.js}"></script>
</body></html>
`;
  }
  const cards = src.games
    .map((g) => {
      const title = esc(g.title.en);
      return `<li class="card" data-slug="${g.slug}">
<img class="thumb" src="${abs}${files.thumbs[g.slug]}" width="96" height="96" alt="${esc(fill(en['hub.thumbAlt'], { title: g.title.en }))}" loading="lazy" decoding="async">
<div class="meta"><h2 class="name">${title}</h2><p class="cat">${esc(en[`hub.cat.${g.category}`])}</p></div>
<p class="desc">${esc(g.description.en)}</p>
<a class="play" href="./${g.slug}/" aria-label="${esc(fill(en['hub.playAria'], { title: g.title.en }))}" data-t="hub.play">${t('hub.play')}</a>
</li>`;
    })
    .join('\n');
  return `${head(en['hub.title'])}
<body>
${top}
<main><div class="wrap"><ul class="games" aria-label="${t('hub.list')}">
${cards}
</ul></div></main>
${foot}
<script type="application/json" id="hub-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="${abs}${files.js}"></script>
</body></html>
`;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://m.gamesplash.com.ng",
].join('; ');
export const CSP_POLICY = CSP;
const REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Netlify / Cloudflare Pages `_headers`. Cache-Control rules are DISJOINT on purpose: both hosts
 * merge every matching rule, so two rules setting Cache-Control would join their values.
 * Unhashed game files under /<slug>/assets/ (except packs) get no rule: the host default applies.
 */
export function renderHeaders(slugs, outDir) {
  const out = [];
  const rule = (p, headers) => {
    out.push(p, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`), '');
  };
  rule('/*', {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Content-Security-Policy': CSP,
  });
  for (const p of ['/', '/index.html', '/404.html', '/sw.js'])
    rule(p, { 'Cache-Control': REVALIDATE });
  rule('/assets/*', { 'Cache-Control': IMMUTABLE });
  for (const s of slugs) {
    for (const p of [`/${s}/`, `/${s}/index.html`, `/${s}/sw.js`]) {
      rule(p, { 'Cache-Control': REVALIDATE });
    }
    rule(`/${s}/chunks/*`, { 'Cache-Control': IMMUTABLE });
    if (fs.existsSync(path.join(outDir, s, 'assets/packs'))) {
      rule(`/${s}/assets/packs/*`, { 'Cache-Control': REVALIDATE });
    }
  }
  const exts = new Set(walk(outDir).map((f) => path.extname(f)));
  if (exts.has('.mjs')) rule('/*.mjs', { 'Content-Type': 'text/javascript; charset=utf-8' });
  if (exts.has('.webmanifest')) {
    rule('/*.webmanifest', { 'Content-Type': 'application/manifest+json; charset=utf-8' });
  }
  return out.join('\n');
}

const FORBIDDEN_WORDS = [
  '__naijaTest',
  '__NAIJA_TEST__',
  'autoplay',
  'setBot',
  'setSeed',
  'fastForward',
  'liveMoves',
  'sourceMappingURL',
];
const FORBIDDEN_PARAM = /\.get\(\s*["'`](tempo|clock|pack)["'`]\s*\)|[?&](tempo|clock|pack)=/;
const FORBIDDEN_PATH =
  /(^|\/)(\.env[^/]*|\.git[^/]*|tmp|docs|qa|_template|node_modules|[^/]+\.map|[^/]+\.md|[^/]+\.test\.[a-z]+)(\/|$)/;

/** Safety scan of the finished output folder. Returns a list of problems. */
export function scanOutput(outDir) {
  const bad = [];
  for (const f of walk(outDir)) {
    const r = rel(outDir, f);
    if (FORBIDDEN_PATH.test(r)) bad.push(`${r}: must not ship`);
    if (!/\.(js|mjs|html|css|json|svg)$/.test(r) || r.endsWith('_headers')) continue;
    const body = fs.readFileSync(f, 'utf8');
    for (const w of FORBIDDEN_WORDS) if (body.includes(w)) bad.push(`${r}: contains "${w}"`);
    if (FORBIDDEN_PARAM.test(body))
      bad.push(`${r}: reads a test-only URL param (tempo/clock/pack)`);
  }
  return bad;
}

function copyDir(from, to) {
  for (const f of walk(from)) {
    const dest = path.join(to, path.relative(from, f));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
  }
}

/**
 * Assemble the hub. `dist` holds the production game builds (dist/<slug>/). Returns the report.
 * Hub shell files are content-hashed into /assets/ (immutable); index.html, 404.html and sw.js are not.
 */
export function assembleHub({ root, dist, outDir, slugs }) {
  const src = loadHubSource(root);
  const problems = validateHub(root, slugs, src);
  if (problems.length) return { problems };
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  for (const s of slugs) {
    const from = path.join(dist, s);
    for (const need of ['index.html', 'sw.js']) {
      if (!fs.existsSync(path.join(from, need)))
        return { problems: [`${s}: ${from}/${need} missing, build first`] };
    }
    copyDir(from, path.join(outDir, s));
  }

  const put = (name, buf) => {
    const ext = path.extname(name);
    const out = `assets/${path.basename(name, ext)}.${hash(buf)}${ext}`;
    fs.writeFileSync(path.join(outDir, out), buf);
    return out;
  };
  const core = path.join(root, 'packages/core/assets');
  const files = { thumbs: {} };
  const named = {};
  for (const [key, file] of [
    ['aso-oke.svg', path.join(core, 'patterns/aso-oke.svg')],
    ['adire.svg', path.join(core, 'patterns/adire.svg')],
    ['bungee-subset.woff2', path.join(core, 'fonts/bungee-subset.woff2')],
  ]) {
    named[key] = put(key, fs.readFileSync(file)).slice('assets/'.length);
  }
  files.logo = put('logo-mark.svg', fs.readFileSync(path.join(core, 'logo/logo-mark.svg')));
  for (const g of src.games) {
    files.thumbs[g.slug] = put(`${g.slug}.svg`, fs.readFileSync(path.join(root, g.thumb)));
  }
  const css = fs
    .readFileSync(path.join(root, 'hub/hub.css'), 'utf8')
    .replace(/@asset\(([^)]+)\)/g, (_, k) => {
      if (!named[k]) throw new Error(`hub.css references unknown asset ${k}`);
      return named[k]; // the css lives in /assets/ next to the file
    });
  files.css = put('hub.css', Buffer.from(css));
  files.js = put('hub.js', fs.readFileSync(path.join(root, 'hub/hub.js')));

  fs.writeFileSync(path.join(outDir, 'index.html'), renderPage({ src, files, kind: 'index' }));
  fs.writeFileSync(path.join(outDir, '404.html'), renderPage({ src, files, kind: '404' }));

  // hub service worker: shell only
  const shell = [
    './',
    ...Object.values({ ...files, thumbs: undefined }).filter(Boolean),
    ...Object.values(files.thumbs),
  ];
  const font = fs.readdirSync(path.join(outDir, 'assets')).filter((f) => /\.(woff2|svg)$/.test(f));
  const list = [
    ...new Set([
      ...shell.filter((f) => f !== './').map((f) => `./${f}`),
      ...font.map((f) => `./assets/${f}`),
    ]),
  ];
  const h = createHash('sha1');
  for (const f of ['index.html', ...list.map((l) => l.slice(2))].sort()) {
    h.update(f).update(fs.readFileSync(path.join(outDir, f)));
  }
  const sw = fs
    .readFileSync(path.join(root, 'hub/sw.js'), 'utf8')
    .replace('__VERSION__', () => h.digest('hex').slice(0, 10))
    .replace('__FILES__', () => JSON.stringify(['./', ...list]));
  fs.writeFileSync(path.join(outDir, 'sw.js'), sw);
  fs.writeFileSync(path.join(outDir, '_headers'), renderHeaders(slugs, outDir));

  const problemsOut = scanOutput(outDir);
  return { problems: problemsOut, files, src };
}

/** gzip sizes: per game folder, and the hub shell (everything outside the game folders). */
export function sizeReport(outDir, slugs) {
  const sum = (files) => files.reduce((s, f) => s + gzipSize(fs.readFileSync(f)), 0);
  const raw = (files) => files.reduce((s, f) => s + fs.statSync(f).size, 0);
  const all = walk(outDir);
  const isGame = (f) => slugs.some((s) => rel(outDir, f).startsWith(`${s}/`));
  const hubFiles = all.filter((f) => !isGame(f));
  return {
    games: Object.fromEntries(
      slugs.map((s) => {
        const fs_ = all.filter((f) => rel(outDir, f).startsWith(`${s}/`));
        return [s, { gzip: sum(fs_), raw: raw(fs_), files: fs_.length }];
      }),
    ),
    hub: { gzip: sum(hubFiles), raw: raw(hubFiles), files: hubFiles.length },
    total: { gzip: sum(all), raw: raw(all), files: all.length },
  };
}
