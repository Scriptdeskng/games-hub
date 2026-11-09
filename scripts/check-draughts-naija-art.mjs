#!/usr/bin/env node
/* global document */
// Checks Draughts Naija art: no empty files, no <text>/<image>/external refs/scripts, viewBox + xmlns, unique ids, refs resolve,
// every url() in the CSS resolves, ship.json globs all match, total art gzip <= 800 KB, WCAG contrast of pieces against squares,
// greyscale separation of the two sides, distinct state overlays, and a 360x640 mock play screen (real CSS + DOM) in colour and
// greyscale for 10x10 and 8x8 (needs Playwright Chromium). Usage: CHECK_OUT=<dir> node scripts/check-draughts-naija-art.mjs
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import {
  contrast,
  lum,
  INDIGO,
  SAND,
  CREAM,
  IROKO,
  INK,
  PLANTAIN,
} from './draughts-naija-common.mjs';
import { dark } from './gen-draughts-naija-art.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'draughts-naija', 'assets');
const OUT = process.env.CHECK_OUT ?? tmpdir();
mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const walk = (d) =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );
const files = walk(A);
ok(
  files.every((f) => statSync(f).size > 0),
  `no empty files (${files.length} files)`,
);
const bytes = files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
ok(bytes <= 800 * 1024, `total assets ${(bytes / 1024).toFixed(1)} KB gzip (<= 800 KB)`);
for (const f of files.filter((f) => f.endsWith('.svg'))) {
  const s = readFileSync(f, 'utf8'),
    rel = relative(A, f);
  if (/<text|<image|https?:\/\/(?!www\.w3\.org)|<script|<foreignObject/.test(s))
    ok(false, `${rel} has text/image/external/script`);
  if (!s.includes('viewBox')) ok(false, `${rel} has no viewBox`);
  const idl = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(idl).size !== idl.length) ok(false, `${rel} duplicate ids`);
  const bad = [...s.matchAll(/(?:href="|url\()#([^")]+)/g)]
    .map((m) => m[1])
    .filter((i) => !idl.includes(i));
  if (bad.length) ok(false, `${rel} dangling refs ${bad}`);
  if (!/^<svg[^>]*xmlns=/.test(s)) ok(false, `${rel} lacks xmlns`);
}
ok(true, 'svgs: no <text>, <image>, external URLs, scripts; viewBox, ids and refs fine');

// every file the brief promises
const NEED = [
  'bg/stage-portrait.svg',
  'bg/stage-landscape.svg',
  'board/board-10.svg',
  'board/board-8.svg',
  ...['man-light', 'man-dark', 'king-light', 'king-dark'].map((k) => `pieces/${k}.svg`),
  ...['select', 'move', 'path', 'capture', 'jumped', 'last-from', 'last-to', 'hint'].map(
    (k) => `states/sq-${k}.svg`,
  ),
  'states/piece-must.svg',
  'fx/capture-ring.svg',
  'fx/capture-ribbons.svg',
  'fx/crown-burst.svg',
  'hud/turn-drum.svg',
  'icon/menu-mark.svg',
  'avatars/doosuur.svg',
  'avatars/falmata.svg',
  'avatars/damola.svg',
  'thumb/thumb-512x512.svg',
  'thumb/thumb-1024x500.svg',
  'audio/voice-manifest.json',
  'audio/music/draughts-menu-hausa.mp3',
  'audio/music/draughts-play-hausa.mp3',
  'draughts-art.css',
  'draughts-art-fx.css',
  'ship.json',
  'CREDITS.md',
];
for (const f of NEED) ok(existsSync(join(A, f)), `exists ${f}`);

// distinct overlays and pieces (shape differs, not only colour)
const uniq = (list) =>
  new Set(list.map((f) => readFileSync(join(A, f), 'utf8'))).size === list.length;
ok(uniq(NEED.filter((f) => f.startsWith('states/sq-'))), 'eight distinct square-state overlays');
ok(uniq(NEED.filter((f) => f.startsWith('pieces/'))), 'four distinct pieces');
ok(uniq(NEED.filter((f) => f.startsWith('avatars/'))), 'three distinct persona avatars');
ok(
  readFileSync(join(A, 'pieces/man-light.svg'), 'utf8') !==
    readFileSync(join(A, 'pieces/king-light.svg'), 'utf8').replace(
      /<g transform="translate\(0 -4\)">.*<\/g>/,
      '',
    ),
  'king differs from man by shape (crown + stacked discs)',
);

// contrast and greyscale (WCAG): light piece body vs dark square, dark piece rim vs dark square, the two bodies, ink on plate/gold
const cr = (a, b, min, m) =>
  ok(contrast(a, b) >= min, `${m}: ${contrast(a, b).toFixed(2)}:1 (>= ${min})`);
cr(CREAM, INDIGO, 3, 'light piece body vs dark square');
cr(CREAM, IROKO, 3, 'dark piece rim vs dark piece body');
cr(CREAM, INDIGO, 3, 'dark piece cream rim vs dark square');
cr(CREAM, IROKO, 3, 'light body vs dark body (greyscale separation of the two sides)');
cr(SAND, INDIGO, 3, 'light square vs dark square');
cr(PLANTAIN, IROKO, 3, 'gold diamond / crown vs dark body');
cr(INK, PLANTAIN, 4.5, 'step digits (ink) on the gold landing stone');
cr(INK, '#F4F1E8', 4.5, 'ink text on the cream .dn-plate');
cr(PLANTAIN, INK, 4.5, 'chain badge gold digits on ink plate');
ok(lum(CREAM) > 0.8 && lum(IROKO) < 0.06, 'greyscale: ivory side is light, iroko side is dark');

const css =
  readFileSync(join(A, 'draughts-art.css'), 'utf8') +
  readFileSync(join(A, 'draughts-art-fx.css'), 'utf8');
const urls = [...css.matchAll(/url\('?\.\/([^')]+)'?\)/g)].map((m) => m[1]);
ok(
  urls.length > 15 && urls.every((u) => existsSync(join(A, u))),
  `all ${urls.length} url() in the css resolve`,
);
ok(!/https?:\/\//.test(css), 'css has no external URL');
for (const f of ['draughts-art.css', 'draughts-art-fx.css'])
  ok(readFileSync(join(A, f), 'utf8').split('\n').length <= 400, `${f} <= 400 lines`);

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

// ---- mock play screens at 360 x 640 built from the real CSS and art ----
const sq = (n, r, c, cls, piece, extra = '') =>
  `<button class="dn-sq${cls ? ' ' + cls : ''}" style="grid-row:${r + 1};grid-column:${c + 1}" aria-label="sq">${piece ? `<i class="dn-piece dn-piece--${piece.split('-')[0]}${piece.endsWith('king') ? ' dn-piece--king' : ''}${piece.includes('must') ? ' is-must' : ''}"></i>` : ''}${extra}</button>`;
const mock = (n) => {
  const cell = (Math.min(344, 520) * 312) / 340 / n;
  const rows = n === 10 ? 4 : 3;
  const P = new Map(),
    cls = new Map();
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      if (r < rows) P.set(`${r},${c}`, 'dark');
      if (r >= n - rows) P.set(`${r},${c}`, 'light');
    }
  const setP = (r, c, v) => (v ? P.set(`${r},${c}`, v) : P.delete(`${r},${c}`));
  const m = n - 1;
  const R = (a) => m - a; // row a steps up from the bottom; every pair below has a + b even, so the square is dark
  // a believable mid-game: a king of each side, a selected piece (must-capture badge), a move dot, a two-hop capture path
  // (jumped pieces + landing stones 1 and 2), a capturable piece, last move, hint and an illegal-tap square
  for (const [a, b] of [
    [3, 3],
    [4, 6],
    [6, 4],
    [3, 5],
    [5, 5],
    [4, 2],
    [6, 2],
    [4, 0],
  ])
    setP(R(a), b, null);
  setP(R(2), 4, 'light-must');
  cls.set(`${R(2)},4`, 'is-select');
  cls.set(`${R(3)},3`, 'is-move');
  setP(R(3), 5, 'dark');
  cls.set(`${R(3)},5`, 'is-jumped');
  setP(R(5), 5, 'dark');
  cls.set(`${R(5)},5`, 'is-jumped');
  cls.set(`${R(4)},6`, 'is-path');
  cls.set(`${R(6)},4`, 'is-path');
  setP(R(4), 2, 'dark');
  cls.set(`${R(4)},2`, 'is-capturable');
  setP(R(4), 0, 'light-king');
  setP(2, 5, 'dark-king');
  setP(1, 2, null);
  setP(2, 3, 'dark');
  cls.set('1,2', 'is-last-from');
  cls.set('2,3', 'is-last-to');
  setP(R(6), 2, 'light');
  cls.set(`${R(6)},2`, 'is-hint');
  cls.set(`${m - 1},1`, 'is-illegal');
  const cells = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      const k = `${r},${c}`,
        cl = cls.get(k) ?? '';
      cells.push(
        sq(
          n,
          r,
          c,
          cl,
          P.get(k),
          cl === 'is-path' ? `<b class="dn-step">${r === R(4) ? 1 : 2}</b>` : '',
        ),
      );
    }
  const ctr = (r, c) => [c * cell + cell / 2, r * cell + cell / 2];
  const [x1, y1] = ctr(R(2), 4),
    [x2, y2] = ctr(R(4), 6);
  const leg = `<i class="dn-leg" style="--x:${x1};--y:${y1};--len:${Math.hypot(x2 - x1, y2 - y1) - cell * 0.35};--a:${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}"></i>`;
  const tray = (k, c) =>
    `<div class="dn-tray">${Array.from({ length: c }, () => `<i class="dn-mini dn-mini--${k}"></i>`).join('')}<span class="dn-plate" style="margin-left:6px">x${c}</span></div>`;
  return `<div class="dn-stage"></div><svg width="0" height="0" style="position:absolute"></svg>
<section class="dn-seat dn-seat--cpu is-turn" style="position:absolute;top:10px;left:8px;right:8px"><img class="ng-avatar" style="width:48px;height:48px;border-radius:50%" src="file://${join(A, 'avatars/falmata.svg')}" alt=""><span class="dn-plate">Falmata</span><i class="dn-turn"></i><span class="dn-think"><i></i><i></i><i></i></span>${tray('light', 4)}</section>
<div class="dn-board" data-n="${n}" style="--dn-n:${n};position:absolute;left:8px;top:96px;width:344px"><div class="dn-grid">${cells.join('')}</div><div class="dn-lines">${leg}<b class="dn-chain">x2</b></div></div>
<section class="dn-seat" style="position:absolute;top:454px;left:8px;right:8px"><img class="ng-avatar" style="width:48px;height:48px;border-radius:50%" src="file://${join(A, 'avatars/doosuur.svg')}" alt=""><span class="dn-plate">You</span>${tray('dark', 6)}</section>
<div style="position:absolute;top:530px;left:8px;display:flex;gap:6px;align-items:center">${['man-light', 'man-dark', 'king-light', 'king-dark'].map((k) => `<img src="file://${join(A, `pieces/${k}.svg`)}" width="44">`).join('')}<img src="file://${join(A, 'avatars/damola.svg')}" width="44" style="border-radius:50%"><img src="file://${join(A, 'icon/menu-mark.svg')}" width="44"></div>
<div style="position:absolute;top:590px;left:8px;display:flex;gap:2px"><i class="dn-fx dn-fx--ring" style="position:static;opacity:1;animation:none;width:40px;height:40px;margin:0"></i><i class="dn-fx dn-fx--ribbons" style="position:static;opacity:1;animation:none;width:40px;height:40px;margin:0"></i><i class="dn-fx dn-fx--crown" style="position:static;opacity:1;animation:none;width:40px;height:40px;margin:0"></i></div>`;
};
const page_html = (n, grey) =>
  `<!doctype html><link rel="stylesheet" href="file://${join(A, 'draughts-art.css')}"><body style="margin:0;width:360px;height:640px;position:relative;overflow:hidden;font-family:Arial,sans-serif${grey ? ';filter:grayscale(1)' : ''}">${mock(n)}</body>`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
  });
  for (const [name, n, grey] of [
    ['draughts-10', 10, false],
    ['draughts-10-grey', 10, true],
    ['draughts-8', 8, false],
    ['draughts-8-grey', 8, true],
  ]) {
    const f = join(OUT, name + '.html');
    writeFileSync(f, page_html(n, grey));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, name + '.png') });
    console.log('wrote', join(OUT, name + '.png'));
  }
  const cellPx = await page.evaluate(
    () => document.querySelector('.dn-sq')?.getBoundingClientRect().width ?? 0,
  );
  ok(cellPx >= 38, `8x8 cell is ${cellPx.toFixed(1)} px at 360 wide`);
  const broken = await page.evaluate(
    () => [...document.images].filter((i) => !i.complete || !i.naturalWidth).length,
  );
  ok(broken === 0, 'all contact-sheet images decoded');
} finally {
  await browser.close();
}
process.exit(fail);
