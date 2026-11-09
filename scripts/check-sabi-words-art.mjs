#!/usr/bin/env node
/* global document */
// Checks Sabi Words art: no empty files, no <text>/<image>/external refs/scripts, every SVG has a viewBox and xmlns,
// ids unique and every href resolves, the pack sprite has all symbols, every url() in words-art.css resolves to a file,
// ship.json globs all match a file, total art gzip <= 800 KB, the six lane patterns are all different, and a 360x640
// mock play screen (real words-art.css + DOM) is rendered in colour and greyscale (needs Playwright Chromium).
// Usage: CHECK_OUT=<dir> node scripts/check-sabi-words-art.mjs
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'sabi-words', 'assets');
const OUT = process.env.CHECK_OUT ?? tmpdir();
mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(A);
ok(
  files.every((f) => statSync(f).size > 0),
  `no empty files (${files.length} files)`,
);
const bytes = files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
ok(bytes <= 800 * 1024, `total assets ${(bytes / 1024).toFixed(1)} KB gzip (<= 800 KB)`);
for (const f of files.filter((f) => f.endsWith('.svg'))) {
  const s = readFileSync(f, 'utf8');
  const rel = relative(A, f);
  if (/<text|<image|https?:\/\/(?!www\.w3\.org)|<script|<foreignObject/.test(s))
    ok(false, `${rel} has text/image/external/script`);
  if (!s.includes('viewBox')) ok(false, `${rel} has no viewBox`);
  const idl = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(idl).size !== idl.length) ok(false, `${rel} duplicate ids`);
  const bad = [...s.matchAll(/(?:href|url\()="?#([^")]+)/g)]
    .map((m) => m[1])
    .filter((i) => !idl.includes(i));
  if (bad.length) ok(false, `${rel} dangling refs ${bad}`);
  if (!/^<svg[^>]*xmlns=/.test(s)) ok(false, `${rel} lacks xmlns`);
}
ok(true, 'svgs: no <text>, <image>, external URLs, scripts; viewBox, ids and refs fine');
const sprite = readFileSync(join(A, 'icons', 'packs.svg'), 'utf8');
for (const c of ['food', 'lagos', 'football', 'pidgin', 'states', 'cloth', 'lock'])
  ok(sprite.includes(`id="pack-${c}"`), `pack symbol pack-${c}`);
const pats = [1, 2, 3, 4, 5, 6].map((i) => readFileSync(join(A, 'lanes', `pat-${i}.svg`), 'utf8'));
ok(new Set(pats).size === 6, 'six distinct lane patterns (colour is never the only cue)');
const css =
  readFileSync(join(A, 'words-art.css'), 'utf8') +
  readFileSync(join(A, 'words-art-ui.css'), 'utf8'); // words-art.css @imports the second part
const urls = [...css.matchAll(/url\('?\.\/([^')]+)'?\)/g)].map((m) => m[1]);
ok(
  urls.length > 10 && urls.every((u) => existsSync(join(A, u))),
  `all ${urls.length} url() in words-art.css resolve`,
);
ok(!/https?:\/\//.test(css), 'words-art.css has no external URL');

const ship = JSON.parse(readFileSync(join(A, 'ship.json'), 'utf8'));
const re = (g) =>
  new RegExp(
    '^' +
      g
        .split('**')
        .map((p) =>
          p
            .split('*')
            .map((l) => l.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
            .join('[^/]*'),
        )
        .join('.*') +
      '$',
  );
const rels = files.map((f) => relative(A, f));
for (const g of [...ship.include, ...(ship.dynamic ?? []), ...(ship.keep ?? [])])
  ok(
    rels.some((r) => re(g).test(r)),
    `ship.json glob matches a file: ${g}`,
  );

// mock play screen built from the real CSS and art
const cells = 8;
const GRID = [
  'SABIWORD',
  'JOLLOFAB',
  'EGUSIKEN',
  'AMALAYOB',
  'DODOFURA',
  'OKRONAIR',
  'SUYAWUSE',
  'BOLEGARI',
];
const found = [
  { r: 1, c: 0, len: 5, a: 0, lane: 1 },
  { r: 3, c: 0, len: 4, a: 0, lane: 2 },
  { r: 2, c: 0, len: 4, a: 45, lane: 3 },
  { r: 4, c: 0, len: 3, a: 0, lane: 4 },
  { r: 5, c: 0, len: 3, a: 0, lane: 5 },
  { r: 6, c: 0, len: 3, a: 0, lane: 6 },
];
const cell = 36,
  step = cell + 0; // grid cell is the layout pitch; tile margin is inside
const centre = (r, c) => [c * step + cell / 2, r * step + cell / 2];
const ang = (a) => ({ 0: [0, 1], 45: [1, 1] })[a];
const sel = { r: 7, c: 0, len: 4, a: 0 };
const trailEl = (cls, { r, c, len, a }, lane) => {
  const [x, y] = centre(r, c);
  return `<i class="${cls}${lane ? ` sw-lane--${lane}` : ''}" style="--x:${x};--y:${y};--len:${(len - 1) * step * (a === 45 ? Math.SQRT2 : 1)};--a:${a}"></i>`;
};
const inFound = new Map();
for (const f of found) {
  const [dr, dc] = ang(f.a);
  for (let i = 0; i < f.len; i++) inFound.set(`${f.r + i * dr},${f.c + i * dc}`, f.lane);
}
const tiles = GRID.flatMap((row, r) =>
  [...row].map((ch, c) => {
    const lane = inFound.get(`${r},${c}`);
    const s = r === sel.r && c < sel.len ? ' is-sel' : '';
    return `<button class="sw-tile${lane ? ' is-found' : ''}${s}${r === 0 && c === 7 ? ' is-hint' : ''}"${lane ? ` data-lane="${lane}"` : ''}><span class="sw-tile__l">${ch}</span></button>`;
  }),
).join('');
const words = ['SABI', 'JOLLOF', 'EGUSI', 'AMALA', 'DODO', 'OKRO', 'SUYA', 'BOLE'];
const html = `<!doctype html><link rel="stylesheet" href="file://${join(A, 'words-art.css')}"><body class="sw-mock" style="margin:0;width:360px;height:640px;position:relative;overflow:hidden;font-family:Arial Black,sans-serif">
<div class="sw-stage"></div>
<div class="sw-hud" style="position:absolute;top:58px;left:0;right:0"><div class="sw-time is-low"><i class="sw-time__fill" style="--sw-p:.35"></i></div><div class="sw-stars"><i class="sw-star is-on"></i><i class="sw-star is-on"></i><i class="sw-star"></i></div><button class="sw-hint" aria-label="hint"></button></div>
<div class="sw-board" style="--sw-n:${cells};--sw-cell:${cell}px;position:absolute;left:16px;top:120px;width:${cell * cells + 28}px"><div class="sw-grid">${tiles}</div>
<div class="sw-lanes">${found.map((f) => trailEl('sw-lane', f, f.lane)).join('')}${trailEl('sw-trail', sel)}</div></div>
<ul class="sw-words" style="position:absolute;left:16px;top:446px;width:328px">${words.map((x, i) => `<li class="sw-word${i < 6 ? ' is-found' : ''}"${i < 6 ? ` data-lane="${i + 1}"` : ''}><i class="sw-word__sw"></i><span>${x}</span></li>`).join('')}</ul>
<div style="position:absolute;left:16px;top:566px;width:328px;display:flex;gap:6px"><svg width="0" height="0" style="position:absolute">${sprite.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>${['food', 'lagos', 'football', 'pidgin', 'states', 'cloth'].map((k) => `<span class="sw-pack sw-pack--${k}" style="width:50px;min-height:50px;padding:0;background:#fff1dc;border-radius:12px"><svg class="sw-pack__i" viewBox="0 0 48 48" style="left:0;top:0;margin:0;width:50px;height:50px"><use href="#pack-${k}"/></svg></span>`).join('')}</div>
</body>`;
const sheet2 = `<!doctype html><link rel="stylesheet" href="file://${join(A, 'words-art.css')}"><body style="margin:0;width:360px;height:640px;position:relative;background:#430e07;font-family:Arial Black,sans-serif">
<div class="sw-stage"></div>
<div style="position:absolute;left:16px;top:20px;width:328px"><button class="sw-pack sw-pack--food"><svg class="sw-pack__i" viewBox="0 0 48 48"><use href="#pack-food"/></svg><span class="sw-pack__t">Naija Food</span></button></div>
<svg width="0" height="0" style="position:absolute">${sprite.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
<div style="position:absolute;left:10px;top:130px;width:340px"><div class="sw-banner"><div class="sw-stars"><i class="sw-star is-on"></i><i class="sw-star is-on"></i><i class="sw-star"></i></div></div></div>
<img src="file://${join(A, 'avatars/osas.svg')}" width="96" style="position:absolute;left:20px;top:290px;border-radius:50%">
<img src="file://${join(A, 'icon/menu-mark.svg')}" width="96" style="position:absolute;left:140px;top:290px">
<img src="file://${join(A, 'fx/found-burst.svg')}" width="96" style="position:absolute;left:250px;top:290px">
<img src="file://${join(A, 'hud/hint-lantern.svg')}" width="64" style="position:absolute;left:20px;top:420px">
<img src="file://${join(A, 'fx/hint-ring.svg')}" width="64" style="position:absolute;left:100px;top:420px">
<img src="file://${join(A, 'hud/time-low.svg')}" width="48" style="position:absolute;left:180px;top:428px">
<img src="file://${join(A, 'hud/check-disc.svg')}" width="48" style="position:absolute;left:240px;top:428px">
<img src="file://${join(A, 'thumb/thumb-512x512.svg')}" width="240" style="position:absolute;left:20px;top:490px;height:140px;object-fit:cover">
</body>`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
  });
  for (const [name, h] of [
    ['sabi-words-sheet1.png', html],
    [
      'sabi-words-sheet1-grey.png',
      html.replace('class="sw-mock" style="', 'class="sw-mock" style="filter:grayscale(1);'),
    ],
    ['sabi-words-sheet2.png', sheet2],
  ]) {
    const f = join(OUT, name.replace('.png', '.html'));
    writeFileSync(f, h);
    await page.goto('file://' + f);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, name) });
    console.log('wrote', join(OUT, name));
  }
  const broken = await page.evaluate(
    () => [...document.images].filter((i) => !i.complete || !i.naturalWidth).length,
  );
  ok(broken === 0, 'all contact-sheet images decoded');
} finally {
  await browser.close();
}
process.exit(fail);
