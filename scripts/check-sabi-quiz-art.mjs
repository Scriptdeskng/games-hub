#!/usr/bin/env node
/* global document */
// Checks Sabi Quiz art: no empty files, no <text>/<image>/external refs/scripts, every file has a viewBox,
// ids unique and every href resolves, category sprite has all 9 symbols, ship.json globs all match a file,
// total art gzip <= 800 KB, and renders 360x640 contact sheets in colour and greyscale (needs Playwright Chromium).
// Usage: CHECK_OUT=<dir> node scripts/check-sabi-quiz-art.mjs
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'sabi-quiz', 'assets');
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
const svgs = files.filter((f) => f.endsWith('.svg'));
for (const f of svgs) {
  const s = readFileSync(f, 'utf8');
  const rel = relative(A, f);
  if (/<text|<image|https?:\/\/(?!www\.w3\.org)|<script|<foreignObject/.test(s))
    ok(false, `${rel} has text/image/external/script`);
  if (!s.includes('viewBox')) ok(false, `${rel} has no viewBox`);
  const idl = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(idl).size !== idl.length) ok(false, `${rel} duplicate ids`);
  const bad = [...s.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((i) => !idl.includes(i));
  if (bad.length) ok(false, `${rel} dangling refs ${bad}`);
  if (!/^<svg[^>]*xmlns=/.test(s)) ok(false, `${rel} lacks xmlns`);
}
ok(true, 'svgs: no <text>, <image>, external URLs, scripts; viewBox, ids and refs fine');
const sprite = readFileSync(join(A, 'icons', 'categories.svg'), 'utf8');
const CATS = [
  'nollywood',
  'afrobeats',
  'football',
  'history',
  'food',
  'general',
  'pidgin',
  'geography',
  'daily',
];
for (const c of CATS) ok(sprite.includes(`id="cat-${c}"`), `category symbol cat-${c}`);

// ship.json: every glob matches at least one file
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

// contact sheets
const img = (p, w = '', st = '') =>
  `<img src="file://${join(A, p)}" ${w ? `width="${w}"` : ''} style="${st}">`;
const sheet = (
  grey,
) => `<!doctype html><body style="margin:0;width:360px;height:640px;position:relative;overflow:hidden;${grey ? 'filter:grayscale(1)' : ''}">
${img('bg/stage-portrait.svg', 360, 'position:absolute;left:0;top:0')}
${img('ui/question-card.svg', 328, 'position:absolute;left:16px;top:96px')}
${['a', 'b', 'c', 'd'].map((k, i) => img(`plates/plate-${k}.svg`, 328, `position:absolute;left:16px;top:${300 + i * 62}px`)).join('')}
${img('plates/state-correct.svg', 328, 'position:absolute;left:16px;top:300px')}
${img('plates/state-wrong.svg', 328, 'position:absolute;left:16px;top:362px')}
${img('plates/state-eliminated.svg', 328, 'position:absolute;left:16px;top:424px')}
${img('plates/state-picked.svg', 328, 'position:absolute;left:16px;top:486px')}
${img('timer/ring.svg', 64, 'position:absolute;left:148px;top:30px')}${img('timer/arc.svg', 64, 'position:absolute;left:148px;top:30px')}
${['5050', 'skip', 'padi'].map((k, i) => img(`lifelines/ll-${k}.svg`, 44, `position:absolute;left:${16 + i * 50}px;top:552px`)).join('')}
${img('lifelines/ll-used.svg', 44, 'position:absolute;left:116px;top:552px')}
${img('streak/flame.svg', 36, 'position:absolute;left:250px;top:556px')}${img('streak/badge-3.svg', 52, 'position:absolute;left:290px;top:552px')}
${img('avatars/etim.svg', 56, 'position:absolute;left:16px;top:30px;border-radius:50%')}
</body>`;
const sheet2 = `<!doctype html><body style="margin:0;width:360px;height:640px;background:#122055;position:relative">
${img('poll/panel.svg', 300, 'position:absolute;left:30px;top:10px')}
${[0.8, 0.4, 0.15, 0.05].map((v, i) => `<div style="position:absolute;left:${48 + i * 68}px;top:${50 + 130 * (1 - v)}px;width:48px;height:${130 * v}px;overflow:hidden">${img('poll/bar-fill.svg', 48, `position:absolute;bottom:0;height:130px;width:48px`)}</div>`).join('')}
${img('duel/podium.svg', 340, 'position:absolute;left:10px;top:240px')}
${img('avatars/dung.svg', 56, 'position:absolute;left:224px;top:250px;border-radius:50%')}
${img('duel/vs.svg', 48, 'position:absolute;left:156px;top:285px')}${img('duel/buzzer.svg', 70, 'position:absolute;left:20px;top:430px')}${img('duel/lead-marker.svg', 32, 'position:absolute;left:100px;top:440px')}
${['correct-burst', 'wrong-ripple', 'streak-burst', 'time-up'].map((k, i) => img(`fx/${k}.svg`, 80, `position:absolute;left:${16 + i * 86}px;top:520px`)).join('')}
${[2, 3, 5].map((n, i) => img(`streak/badge-${n}.svg`, 56, `position:absolute;left:${150 + i * 60}px;top:436px`)).join('')}
<div style="position:absolute;left:10px;top:600px;color:#FFF3DA;display:flex;gap:6px">${CATS.map((c) => `<svg width="30" height="30"><use href="#x-${c}"/></svg>`).join('')}</div>
<div style="display:none">${sprite.replace(/id="cat-/g, 'id="x-')}</div></body>`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
  });
  for (const [name, html] of [
    ['sabi-quiz-sheet1.png', sheet(false)],
    ['sabi-quiz-sheet1-grey.png', sheet(true)],
    ['sabi-quiz-sheet2.png', sheet2],
  ]) {
    const f = join(OUT, name.replace('.png', '.html'));
    writeFileSync(f, html);
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
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
