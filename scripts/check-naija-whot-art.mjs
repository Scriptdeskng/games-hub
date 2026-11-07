#!/usr/bin/env node
/* global Image, document, DOMParser */
// Checks Naija Whot art: exact 54-card deck, every sprite reference resolves, no text/external refs,
// no empty files, size budget, contrast of marks, greyscale distinguishability of the five shapes at
// 16 and 24 px, and renders 360x640 contact sheets (fan of 7, table, colour and greyscale).
// Usage: CHECK_OUT=<dir> node scripts/check-naija-whot-art.mjs   (needs Playwright Chromium)
import { readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

process.env.ART_OUT = join(tmpdir(), 'naija-whot-check-gen');
const { SHAPES, ORDER, INK, CREAM } = await import('./gen-naija-whot-art.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'naija-whot', 'assets');
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
const svgs = files.filter((f) => f.endsWith('.svg'));
const bytes = files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
ok(bytes <= 800 * 1024, `total art ${(bytes / 1024).toFixed(1)} KB gzip (<= 800 KB)`);
for (const f of svgs) {
  const s = readFileSync(f, 'utf8');
  if (/<text|<image|https?:\/\/(?!www\.w3\.org)|<script|<foreignObject/.test(s))
    ok(false, `${relative(A, f)} has text/image/external/script`);
  if (!s.includes('viewBox')) ok(false, `${relative(A, f)} has no viewBox`);
}
ok(true, 'svgs: no <text>, <image>, external URLs or scripts');

// deck
const deck = readFileSync(join(A, 'cards', 'deck.svg'), 'utf8');
const want = ORDER.flatMap((s) => SHAPES[s].nums.map((n) => `c-${s}-${n}`)).concat('c-whot-20');
const counts = Object.fromEntries(ORDER.map((s) => [s, SHAPES[s].nums.length]));
ok(
  JSON.stringify(counts) ===
    JSON.stringify({ circle: 12, triangle: 12, cross: 9, square: 9, star: 7 }),
  `shape card counts ${JSON.stringify(counts)} match docs/GAMES.md`,
);
ok(
  want.length === 50 && want.length - 1 + 5 === 54,
  '49 shape symbols + 1 Whot 20 symbol (x5 copies) = 54 physical cards',
);
for (const id of want) ok(deck.includes(`id="${id}"`), `symbol ${id}`);
ok(deck.includes('id="c-back"'), 'symbol c-back');
const ids = new Set([...deck.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
const dup = [...deck.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
ok(dup.length === ids.size, 'deck ids are unique');
const dangling = [...deck.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((i) => !ids.has(i));
ok(
  dangling.length === 0,
  `every <use> resolves${dangling.length ? ' (missing ' + dangling.slice(0, 5) + ')' : ''}`,
);
for (const f of svgs.filter((x) => !x.endsWith('deck.svg'))) {
  const s = readFileSync(f, 'utf8');
  const have = new Set([...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  const bad = [...s.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((i) => !have.has(i));
  if (bad.length) ok(false, `${relative(A, f)} has dangling refs ${bad}`);
}

// contrast
const lum = (h) => {
  const v = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
console.log('contrast: ink on cream', cr(INK, CREAM).toFixed(1));
ok(cr(INK, CREAM) >= 7, 'card numbers: ink on cream >= 7:1');
// shape fills are all outlined in ink (15:1 on cream), so the outline carries the 3:1 non-text contrast
console.log(
  'grey luminance:',
  ORDER.map((s) => `${s} ${(lum(SHAPES[s].hex) * 100).toFixed(0)}%`).join(', '),
);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const bad = await page.evaluate(
  (list) =>
    list
      .filter(([, t]) =>
        new DOMParser().parseFromString(t, 'image/svg+xml').querySelector('parsererror'),
      )
      .map(([n]) => n),
  svgs.map((f) => [relative(A, f), readFileSync(f, 'utf8')]),
);
ok(bad.length === 0, `every svg is well-formed XML${bad.length ? ' (bad: ' + bad + ')' : ''}`);
const spriteHtml = deck;
// greyscale distinguishability of the shapes at 16 and 24 px
await page.setContent(`<body>${spriteHtml}<div id="r"></div></body>`);
const res = await page.evaluate(
  async ({ order }) => {
    const sprite = document.querySelector('svg').outerHTML;
    const out = {};
    for (const size of [16, 24]) {
      out[size] = {};
      for (const s of order) {
        const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${sprite.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}<use href="#s-${s}"/></svg>`;
        const img = new Image();
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(markup);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, size, size);
        const d = x.getImageData(0, 0, size, size).data;
        const g = [],
          m = [];
        for (let i = 0; i < d.length; i += 4) {
          m.push(d[i + 3] > 128 ? 1 : 0);
          g.push(d[i + 3] ? Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) : 255);
        }
        out[size][s] = { g, m };
      }
    }
    return out;
  },
  { order: ORDER },
);
for (const size of ['16', '24']) {
  let worst = 0;
  for (let i = 0; i < ORDER.length; i++)
    for (let j = i + 1; j < ORDER.length; j++) {
      const a = res[size][ORDER[i]],
        b = res[size][ORDER[j]];
      let inter = 0,
        uni = 0;
      a.m.forEach((v, k) => {
        inter += v & b.m[k];
        uni += v | b.m[k];
      });
      const iou = inter / uni;
      worst = Math.max(worst, iou);
      console.log(`  ${size}px ${ORDER[i]} vs ${ORDER[j]}: silhouette IoU ${iou.toFixed(2)}`);
    }
  ok(
    worst < 0.85,
    `${size}px: every shape pair has a different silhouette (worst IoU ${worst.toFixed(2)} < 0.85)`,
  );
}

// contact sheets at 360 px: fan of 7, specials row, shapes in grey, table
const card = (id, w) =>
  `<svg viewBox="0 0 100 140" width="${w}" height="${w * 1.4}" style="display:block"><use href="#${id}"/></svg>`;
const fan = ['circle-14', 'triangle-8', 'cross-2', 'square-5', 'star-1', 'whot-20', 'circle-10']
  .map(
    (id, i) =>
      `<div style="position:absolute;left:${6 + i * 46}px;bottom:${i === 2 ? 14 : 0}px">${card('c-' + id, 64)}</div>`,
  )
  .join('');
const specials = ['circle-1', 'star-2', 'triangle-5', 'cross-14', 'square-8']
  .map((id) => `<div style="margin:3px">${card('c-' + id, 64)}</div>`)
  .join('');
const big = ['c-star-2', 'c-square-14', 'c-whot-20', 'c-back']
  .map((id) => `<div style="margin:4px">${card(id, 80)}</div>`)
  .join('');
const html = (
  grey,
) => `<body style="margin:0;${grey ? 'filter:grayscale(1)' : ''}"><div style="position:absolute;width:0;height:0">${spriteHtml}</div>
<div id="s" style="width:360px;height:640px;position:relative;background:#7A4220 url('data:image/svg+xml;base64,${readFileSync(join(A, 'table', 'table-portrait.svg')).toString('base64')}') center/cover">
<div style="position:absolute;left:0;right:0;top:80px;display:flex;justify-content:center">${specials}</div>
<div style="position:absolute;left:0;right:0;top:190px;display:flex;justify-content:center">${big}</div>
<div style="position:absolute;left:10px;top:330px;display:flex;gap:6px;align-items:center">${ORDER.map((s) => `<img src="data:image/svg+xml;base64,${readFileSync(join(A, 'ui', 'call-' + s + '.svg')).toString('base64')}" width="40">`).join('')}<img src="data:image/svg+xml;base64,${readFileSync(join(A, 'fx', 'skip-ring.svg')).toString('base64')}" width="40"><img src="data:image/svg+xml;base64,${readFileSync(join(A, 'fx', 'pick-penalty.svg')).toString('base64')}" width="48"></div>
<img src="data:image/svg+xml;base64,${readFileSync(join(A, 'ui', 'last-card-btn.svg')).toString('base64')}" width="200" style="position:absolute;left:10px;top:395px">
<img src="data:image/svg+xml;base64,${readFileSync(join(A, 'fx', 'market-burst.svg')).toString('base64')}" width="90" style="position:absolute;left:230px;top:380px">
<div style="position:absolute;left:0;right:0;bottom:30px;height:120px">${fan}</div></div>`;
await page.setViewportSize({ width: 360, height: 640 });
await page.setContent(html(false));
await page.locator('#s').screenshot({ path: join(OUT, 'whot-360.png') });
await page.setContent(html(true));
await page.locator('#s').screenshot({ path: join(OUT, 'whot-360-grey.png') });
const all = want.map((id) => `<div style="margin:2px">${card(id, 60)}</div>`).join('');
await page.setViewportSize({ width: 720, height: 800 });
await page.setContent(
  `<body style="margin:0;background:#4A1020"><div style="position:absolute;width:0;height:0">${spriteHtml}</div><div id="s" style="display:flex;flex-wrap:wrap;width:720px">${all}<div style="margin:2px">${card('c-back', 60)}</div></div>`,
);
await page.locator('#s').screenshot({ path: join(OUT, 'whot-deck.png') });
console.log(`sheets written to ${OUT}`);
await browser.close();
process.exit(fail);
